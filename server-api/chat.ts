import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    buildTaskAlignmentRepairPrompt,
    buildOrchestratedPrompt,
    buildResponseOrchestration,
    evaluateResponseTaskAlignment,
    type ResolvedResponseProfile,
} from './_orchestration.js';
import {
    applyCors,
    applyRateLimitHeaders,
    checkRateLimit,
    createRequestId,
    isE2eMockRequest,
    isEnvFlagEnabled,
    parseClientContext,
    parseConversationContext,
    parseAgentProfile,
    parseResponseProfile,
    requireAuth,
    sanitizeErrorDetails,
} from './_shared.js';
import {
    buildE2eMockChatText,
    E2E_MOCK_MODEL,
    E2E_MOCK_PROVIDER,
} from './_e2eMock.js';
import {
    CHAT_INPUT_MAX_CHARS,
    STRUCTURED_AI_PROMPT_MAX_CHARS,
    type ConversationContext,
} from './_contracts.js';

/**
 * Baristachaw Multi-Provider AI Chat API
 * 
 * Adapted from Istok's OmniRace + SmartRouter patterns:
 * - Races multiple providers in parallel (fastest response wins)
 * - Per-provider key rotation from comma-separated env vars
 * - Model fallback chains (e.g., gemini-2.5-flash → flash-lite → Groq → DeepSeek)
 * - Streaming responses
 */

// ─── Types ───
type ProviderId = 'GEMINI' | 'GROQ' | 'DEEPSEEK' | 'MISTRAL' | 'OPENROUTER' | 'OPENAI';

interface RacerConfig {
    provider: ProviderId;
    url: string;
    model: string;
    priority: number;
    timeout: number;
}

interface RaceResult {
    stream: ReadableStream<Uint8Array>;
    provider: string;
    model: string;
    latency: number;
}

// ─── Key Management ───
const keyCounters: Record<string, number> = {};

function getKeys(provider: ProviderId): string[] {
    const envKey = `${provider}_API_KEY`;
    const raw = process.env[envKey] || '';
    return raw.split(',').map(k => k.trim()).filter(k => k.length > 5);
}

function getNextKey(provider: ProviderId): string | null {
    const keys = getKeys(provider);
    if (keys.length === 0) return null;
    const idx = (keyCounters[provider] || 0) % keys.length;
    keyCounters[provider] = idx + 1;
    return keys[idx];
}

function maskKey(key: string): string {
    if (key.length < 8) return '***';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// ─── Provider Configs ───
function getRacerConfigs(): RacerConfig[] {
    return [
        {
            provider: 'GROQ',
            url: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.3-70b-versatile',
            priority: 1,
            timeout: 25000,
        },
        {
            provider: 'GEMINI',
            url: '', // Uses Google GenAI SDK URL pattern
            model: 'gemini-2.5-flash',
            priority: 2,
            timeout: 28000,
        },
        {
            provider: 'DEEPSEEK',
            url: 'https://api.deepseek.com/chat/completions',
            model: 'deepseek-chat',
            priority: 3,
            timeout: 30000,
        },
        {
            provider: 'MISTRAL',
            url: 'https://api.mistral.ai/v1/chat/completions',
            model: 'mistral-large-latest',
            priority: 4,
            timeout: 30000,
        },
        {
            provider: 'OPENAI',
            url: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini',
            priority: 5,
            timeout: 30000,
        },
        {
            provider: 'OPENROUTER',
            url: 'https://openrouter.ai/api/v1/chat/completions',
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            priority: 6,
            timeout: 30000,
        },
    ];
}

// ─── Model Fallback Chain ───
const GEMINI_FALLBACK_CHAIN = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
];

const MAX_CONTEXT_LENGTH = 40000;
const CHAT_RATE_LIMIT = {
    maxRequests: 30,
    windowMs: 5 * 60 * 1000,
    burstMaxRequests: 5,
    burstWindowMs: 10 * 1000,
} as const;

const DEFAULT_NORMAL_PROFILE: ResolvedResponseProfile = {
    language: 'en',
    expectation: {
        verbosity: 'balanced',
        format: 'plain',
        domainDepth: 'basic',
        tone: 'neutral',
        ambiguityRisk: 'low',
        ambiguityPolicy: 'assume',
    },
};

function hasBalancedCodeFences(text: string): boolean {
    const matches = text.match(/```/g);
    return (matches?.length || 0) % 2 === 0;
}

function sanitizeChatText(text: string): string {
    return String(text || '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/\uFFFD/g, '')
        .trim();
}

function looksLikelyTruncated(text: string): boolean {
    const value = sanitizeChatText(text);
    if (!value) return false;
    if (/[.!?。！？:)]$/.test(value)) return false;
    if (/```$/.test(value)) return false;
    if (/\n\s*[-*]\s*$/.test(value)) return true;
    if (/\n\s*\d+\.\s*$/.test(value)) return true;
    if (/[,:;(\-–—/]$/.test(value)) return true;
    if (/\b(?:and|or|because|karena|dan|atau|dengan|untuk)\s*$/i.test(value)) return true;
    return value.length >= 100;
}

function needsRepair(text: string): boolean {
    const value = sanitizeChatText(text);
    if (!value) return true;
    if (!hasBalancedCodeFences(value)) return true;
    return looksLikelyTruncated(value);
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let output = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            output += decoder.decode(value, { stream: true });
        }
        output += decoder.decode();
        return output;
    } finally {
        reader.releaseLock();
    }
}

function formatConversationSummary(conversationContext?: ConversationContext): string {
    const summary = String(conversationContext?.summary || '').trim();
    if (!summary) return '';
    return [
        'Conversation memory (supporting context only):',
        '- Prioritize the latest user request over this summary.',
        '- Continue older context only when the latest user message clearly refers back to it.',
        'Summary:',
        summary,
    ].join('\n');
}

function formatConversationTurns(conversationContext?: ConversationContext): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!conversationContext?.recentMessages?.length) return [];
    return conversationContext.recentMessages
        .map((item) => ({
            role: item.role,
            content: String(item.text || '').trim(),
        }))
        .filter((item) => item.content.length > 0);
}

function buildLatestTurnGuardPrompt(): string {
    return [
        'Latest-turn policy:',
        '- Treat the newest user message as the active task.',
        '- Older summaries and recent turns are supporting context only.',
        '- If the newest user message changes topic, switch immediately.',
        '- Continue an older topic only when the newest user message clearly refers back to it.',
        '- If a short follow-up could refer to multiple earlier items, ask one short clarification instead of guessing.',
    ].join('\n');
}

async function repairChatText(params: {
    rawText: string;
    requestId: string;
    resolvedProfile: ResolvedResponseProfile;
    originalMessage: string;
}): Promise<string> {
    const cleaned = sanitizeChatText(params.rawText);
    const alignment = evaluateResponseTaskAlignment(params.originalMessage, cleaned);
    if (!needsRepair(cleaned) && alignment.ok) {
        return cleaned;
    }

    const key = getNextKey('GEMINI');
    if (!key) {
        return cleaned;
    }

    try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: key });
        const repairPrompt = !alignment.ok
            ? buildTaskAlignmentRepairPrompt({
                userRequest: params.originalMessage,
                draftAnswer: cleaned,
                language: params.resolvedProfile.language,
                verbosity: params.resolvedProfile.expectation.verbosity,
                format: params.resolvedProfile.expectation.format,
                tone: params.resolvedProfile.expectation.tone,
            })
            : [
                'Repair this assistant answer so it is complete, clean, and keeps the same meaning.',
                `Keep language strictly: ${params.resolvedProfile.language}.`,
                `Keep style: verbosity=${params.resolvedProfile.expectation.verbosity}, format=${params.resolvedProfile.expectation.format}, tone=${params.resolvedProfile.expectation.tone}.`,
                '',
                `Original user request:\n${params.originalMessage}`,
                '',
                `Draft answer:\n${cleaned}`,
            ].join('\n');

        const response: any = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite-latest',
            contents: repairPrompt,
            config: { temperature: 0.3 },
        });
        const repaired = sanitizeChatText(response?.text || '');
        return repaired || cleaned;
    } catch (error) {
        console.error(`[api/chat][${params.requestId}] repair_fail details="${sanitizeErrorDetails(error, 180)}"`);
        return cleaned;
    }
}

// ─── Race Logic (fastest provider wins) ───
function raceToSuccess(promises: Promise<RaceResult>[], timeoutMs: number): Promise<RaceResult> {
    return new Promise((resolve, reject) => {
        if (promises.length === 0) {
            reject(new Error('No racers available'));
            return;
        }

        let resolved = false;
        let failCount = 0;
        const errors: string[] = [];

        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                reject(new Error(`Race timeout after ${timeoutMs}ms. Errors: ${errors.join('; ')}`));
            }
        }, timeoutMs);

        for (const p of promises) {
            p.then(result => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(result);
                }
            }).catch(err => {
                errors.push(sanitizeErrorDetails(err, 180));
                failCount++;
                if (failCount === promises.length && !resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    reject(new Error(`All racers failed: ${errors.join('; ')}`));
                }
            });
        }
    });
}

// ─── OpenAI-Compatible Provider Fetch ───
async function fetchOpenAICompatible(
    config: RacerConfig,
    key: string,
    messages: { role: string; content: string }[],
    signal: AbortSignal
): Promise<RaceResult> {
    const startTime = Date.now();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
    };

    if (config.provider === 'OPENROUTER') {
        headers['HTTP-Referer'] = 'https://baristaclaw.vercel.app';
        headers['X-Title'] = 'Baristachaw AI';
    }

    const res = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: config.model,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 4096,
        }),
        signal,
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`${config.provider} (${maskKey(key)}) HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    if (!res.body) throw new Error(`${config.provider}: No response body`);

    const latency = Date.now() - startTime;

    // Transform SSE stream to plain text
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let buffer = '';
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed === 'data: [DONE]') continue;
                        if (trimmed.startsWith('data: ')) {
                            try {
                                const json = JSON.parse(trimmed.slice(6));
                                const content = json.choices?.[0]?.delta?.content || '';
                                const reasoning = json.choices?.[0]?.delta?.reasoning_content;
                                if (reasoning) controller.enqueue(encoder.encode(`<think>${reasoning}</think>`));
                                if (content) controller.enqueue(encoder.encode(content));
                            } catch { }
                        }
                    }
                }
                if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.trim().startsWith('data: ')) {
                    try {
                        const json = JSON.parse(buffer.trim().slice(6));
                        const content = json.choices?.[0]?.delta?.content || '';
                        if (content) controller.enqueue(encoder.encode(content));
                    } catch { }
                }
            } catch (e) {
                controller.error(e);
            } finally {
                reader.releaseLock();
                controller.close();
            }
        },
    });

    return { stream, provider: config.provider, model: config.model, latency };
}

// ─── Gemini Provider Fetch ───
async function fetchGemini(
    model: string,
    key: string,
    messages: { role: string; content: string }[],
    signal: AbortSignal
): Promise<RaceResult> {
    const startTime = Date.now();

    const contents = messages
        .filter(m => m.content?.trim())
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal,
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`GEMINI ${model} (${maskKey(key)}) HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    if (!res.body) throw new Error(`GEMINI ${model}: No response body`);

    const latency = Date.now() - startTime;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let buffer = '';
            const textPattern = /"text":\s*"((?:[^"\\]|\\.)*)"/g;

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    if (buffer.length > 50000) buffer = buffer.slice(-50000);

                    const matches = Array.from(buffer.matchAll(textPattern));
                    if (matches.length > 0) {
                        let lastIndex = 0;
                        for (const match of matches) {
                            let text = match[1];
                            text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                            if (text) controller.enqueue(encoder.encode(text));
                            lastIndex = (match.index || 0) + match[0].length;
                        }
                        buffer = buffer.slice(lastIndex);
                    }
                }
            } catch (e) {
                controller.error(e);
            } finally {
                reader.releaseLock();
                controller.close();
            }
        },
    });

    return { stream, provider: 'GEMINI', model, latency };
}

// ─── CORS Origin Whitelist ───


// ─── Main Handler ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const requestId = createRequestId(req);
    applyCors(req, res, 'POST, OPTIONS');
    res.setHeader('X-Request-Id', requestId);

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ requestId, error: 'Method not allowed' });
    }

    const authResult = requireAuth(req);
    if (authResult.ok === false) {
        return res.status(authResult.statusCode).json({
            ok: false,
            requestId,
            error: authResult.error,
            errorCode: authResult.errorCode,
            retryable: false,
        });
    }

    const limit = checkRateLimit(req, '/api/chat', authResult.auth.userId, CHAT_RATE_LIMIT);
    applyRateLimitHeaders(res, limit);
    if (!limit.allowed) {
        return res.status(429).json({
            ok: false,
            requestId,
            error: 'Rate limit exceeded',
            errorCode: 'rate_limited',
            retryable: true,
        });
    }

    try {
        const {
            message,
            context,
            provider: requestedProviderRaw,
            modelId,
            mode,
            responseProfile: rawResponseProfile,
            clientContext: rawClientContext,
            conversationContext: rawConversationContext,
            agentProfile: rawAgentProfile,
        } = req.body || {};

        const requestedSurface =
            rawClientContext && typeof rawClientContext === 'object' && typeof (rawClientContext as { surface?: unknown }).surface === 'string'
                ? String((rawClientContext as { surface?: string }).surface).trim().toLowerCase()
                : '';
        const maxMessageLength =
            requestedSurface === 'tools'
                ? STRUCTURED_AI_PROMPT_MAX_CHARS
                : CHAT_INPUT_MAX_CHARS;

        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ requestId, error: 'Message required' });
        }
        if (message.length > maxMessageLength) {
            return res.status(400).json({
                requestId,
                error: `Message too long (max ${maxMessageLength} chars)`,
            });
        }
        if (
            typeof context !== 'undefined' &&
            (typeof context !== 'string' || context.length > MAX_CONTEXT_LENGTH)
        ) {
            return res.status(400).json({
                requestId,
                error: `Context must be a string under ${MAX_CONTEXT_LENGTH} chars`,
            });
        }

        const requestedProvider =
            typeof requestedProviderRaw === 'string' ? requestedProviderRaw.toUpperCase() : undefined;
        const normalizedMode = typeof mode === 'string' ? mode.toLowerCase() : '';
        const responseProfile = parseResponseProfile(rawResponseProfile);
        const clientContext = parseClientContext(req, rawClientContext);
        const conversationContext = parseConversationContext(rawConversationContext);
        const agentProfile = parseAgentProfile(rawAgentProfile);
        const languageEnabled = isEnvFlagEnabled('AI_LANGUAGE_ALIGNMENT_ENABLED', true);
        const expectationEnabled = isEnvFlagEnabled('AI_EXPECTATION_PROFILE_ENABLED', true);
        const ambiguityEnabled = isEnvFlagEnabled('AI_AMBIGUITY_ASK_FIRST_ENABLED', true);
        const shouldOrchestrate = languageEnabled || expectationEnabled || ambiguityEnabled;
        if (
            requestedProvider &&
            requestedProvider !== 'AUTO' &&
            !getRacerConfigs().some(config => config.provider === requestedProvider)
        ) {
            return res.status(400).json({
                requestId,
                error: `Unknown provider: ${requestedProvider}`,
                errorCode: 'validation_error',
            });
        }

        const BARISTA_SYSTEM_PROMPT = `You are Baristachaw — the world's most advanced AI barista assistant, built for professional baristas, coffee shop owners, and serious coffee enthusiasts.

## CORE IDENTITY
- You are an SCA (Specialty Coffee Association) certified-level expert
- Your knowledge covers ALL aspects of specialty coffee, from seed to cup
- You provide precise, actionable, production-ready advice
- You always reference SCA standards, SCAA cupping protocols, and WBC (World Barista Championship) techniques when relevant

## COFFEE KNOWLEDGE DATABASE

### BREW METHODS (with optimal parameters)
- **Espresso**: 93°C, 1:2 ratio, 25-30s, 9 bar, 18-20g dose, fine grind (200-400μm)
- **V60 (Hario)**: 93-96°C, 1:16 ratio, 2:30-3:30 total, medium-fine grind, 40g bloom
- **Chemex**: 93-96°C, 1:15-1:17, 4-5 min, medium-coarse grind, thicker filter
- **AeroPress**: 80-96°C (varies by method), 1:12-1:17, inverted or standard, 1-2 min
- **French Press**: 93-96°C, 1:15, 4 min steep, coarse grind (800-1000μm)
- **Cold Brew**: Room temp or 4°C, 1:8 concentrate or 1:15 ready-to-drink, 12-24h steep
- **Moka Pot**: Medium heat, 1:10, medium grind, pre-heated water recommended
- **Turkish/Ibrik**: 70-90°C slow heat, 1:10, extra-fine grind (<100μm), 2-3 foams
- **Siphon/Vacuum**: 92-94°C, 1:13-1:15, 45s-1:30 steep, medium grind
- **Kalita Wave**: 93-96°C, 1:16, flat bed, 3-4 min, medium grind

### BEAN ORIGINS & FLAVOR PROFILES
- **Ethiopia (Yirgacheffe/Sidamo/Guji)**: Floral, bergamot, blueberry, citrus, washed=clean, natural=fruity
- **Colombia (Huila/Nariño/Tolima)**: Caramel, chocolate, citrus, balanced acidity
- **Brazil (Cerrado/Mogiana/Sul de Minas)**: Nutty, chocolate, low acidity, full body
- **Kenya (Nyeri/Kiambu/Muranga)**: Blackcurrant, tomato, bright acidity, SL28/SL34 varietals
- **Guatemala (Antigua/Huehuetenango)**: Chocolate, spice, stone fruit, volcanic soil
- **Costa Rica (Tarrazú/West Valley)**: Honey, citrus, clean, honey/natural process popular
- **Panama (Boquete)**: Geisha variety = jasmine, peach, bergamot, ultra-premium
- **Indonesia (Sumatra/Java/Sulawesi)**: Earthy, herbal, full body, wet-hulled process
- **Rwanda/Burundi**: Red fruit, floral, bright, washed process
- **Yemen (Mocha)**: Wine-like, spice, dried fruit, ancient coffee origin

### ROAST PROFILES
- **Light (City/Cinnamon)**: 196-205°C, first crack, origin character preserved, higher acidity
- **Medium (City+/Full City)**: 210-220°C, balanced, caramel sweetness, popular for filter
- **Medium-Dark (Full City+)**: 225-230°C, just before second crack, body increases, acidity decreases
- **Dark (Vienna/French/Italian)**: 230-245°C, second crack, smoky, bitter, oils visible

### WATER CHEMISTRY (SCA Standards)
- TDS: 75-250 ppm (target 150 ppm)
- pH: 6.5-7.5 (ideal 7.0)
- Calcium hardness: 50-175 ppm (ideal 68 ppm)
- Alkalinity: 40-70 ppm
- Sodium: <30 ppm
- Chlorine: 0 ppm

### EXTRACTION SCIENCE
- Target extraction yield: 18-22% (SCA Gold Cup standard)
- TDS in cup: 1.15-1.35% for filter coffee
- Under-extraction: sour, thin, quick finish → grind finer, increase time/temp
- Over-extraction: bitter, astringent, dry → grind coarser, decrease time/temp
- Refractometer reading guides espresso/filter/cold brew targets

### GRIND SIZE REFERENCE
- Extra-fine (<100μm): Turkish
- Fine (200-400μm): Espresso
- Medium-fine (400-600μm): AeroPress, V60, Siphon
- Medium (600-800μm): Kalita Wave, Drip machines
- Medium-coarse (800-1000μm): Chemex
- Coarse (1000-1200μm): French Press, Cold Brew, Cupping

### MILK & LATTE ART
- Steaming temp: 55-65°C (never exceed 70°C, proteins denature)
- Micro-foam texture: glossy, no visible bubbles, "wet paint" consistency
- Basic patterns: Heart, Rosetta, Tulip, Swan, Latte art scoring (WBC criteria)
- Alternative milks: Oat (best foam), Soy (curdles with acid), Almond (thin foam), Coconut (sweet)

### CAFE MANAGEMENT
- Cost analysis: COGS for espresso-based drinks typically 15-25%
- Waste reduction: First-in-first-out (FIFO), track daily waste
- Training: SCA Pathways (Barista Skills, Brewing, Roasting, Green Coffee, Sensory)
- Equipment maintenance: Backflush daily, deep clean weekly, descale monthly

### EQUIPMENT KNOWLEDGE
- Grinders: EK43, Niche Zero, Baratza, Comandante, 1Zpresso
- Espresso machines: La Marzocco, Synesso, Slayer, Decent, Breville
- Kettles: Fellow Stagg EKG, Brewista, Hario Buono
- Scales: Acaia Lunar/Pearl, Timemore Black Mirror, Hario V60 scale

## RESPONSE GUIDELINES
1. Always provide SPECIFIC numbers (temperature, ratio, time, dose, grind setting)
2. When giving a recipe, structure it clearly with equipment, ingredients, and step-by-step instructions
3. For troubleshooting, diagnose the problem first, then provide 2-3 actionable solutions
4. Reference SCA standards when relevant
5. Adapt advice to user's skill level (beginner → expert)
6. Do not roleplay as a cashier, POS bot, or take a drink order unless the user explicitly asks for an ordering simulation
7. For greetings or very short openers, greet briefly and ask what the user needs instead of assuming an order or recipe request
8. When the user message includes Barista skill routing, prioritize the active skill focus and use its concrete parameters, validation checks, and workflow guidance
9. When the user message includes AI chat flow or App tool routing, follow the selected recipe/troubleshooting/save/persona template and recommend relevant app tools without pretending they already ran
10. For app support requests, answer like a product guide: give short in-app steps, mention Home language selector or Chat Memory only when relevant, and never claim a UI setting changed unless an app action actually happened
11. The latest user message is the active task. Do not answer an older question unless the user clearly refers back to it
12. Treat conversation summary and recent turns as supporting context only. If the latest message changes topic, follow the latest message immediately
13. If a short follow-up could refer to multiple earlier items, ask one short clarification instead of guessing

## STRUCTURED OUTPUT
When your response contains a RECIPE, BREW GUIDE, SOP, or DIAGNOSTIC, wrap it clearly so the user can save it. Use markdown headers and bullet points for clarity. Start saveable content with one of these markers:
- "## ☕ Recipe:" for recipes
- "## 📋 Brew Guide:" for brewing guides
- "## 🔧 Troubleshooting:" for diagnostics
- "## 📝 SOP:" for standard operating procedures

Use those saveable wrappers only when the current user request actually needs a recipe, brew guide, SOP, or diagnostic format. Do not force them onto a plain answer.

Keep responses concise but comprehensive. Every number must be accurate and production-tested.`;

        const systemPrompt = typeof context === 'string' && context.length > 50 ? context : BARISTA_SYSTEM_PROMPT;

        let resolvedProfile = DEFAULT_NORMAL_PROFILE;
        let messageForModel = message.slice(0, maxMessageLength);
        if (shouldOrchestrate) {
            const resolved = buildResponseOrchestration(message, 'normal', responseProfile, clientContext, conversationContext, agentProfile);
            resolvedProfile = {
                language: languageEnabled ? resolved.language : DEFAULT_NORMAL_PROFILE.language,
                expectation: {
                    ...resolved.expectation,
                    ...(expectationEnabled ? {} : DEFAULT_NORMAL_PROFILE.expectation),
                    ambiguityPolicy: ambiguityEnabled
                        ? resolved.expectation.ambiguityPolicy
                        : DEFAULT_NORMAL_PROFILE.expectation.ambiguityPolicy,
                    ambiguityRisk: ambiguityEnabled
                        ? resolved.expectation.ambiguityRisk
                        : DEFAULT_NORMAL_PROFILE.expectation.ambiguityRisk,
                },
            };
            messageForModel = buildOrchestratedPrompt(
                message,
                'normal',
                resolvedProfile,
                conversationContext,
                agentProfile,
            ).slice(0, maxMessageLength);
        }

        const contextMessages = shouldOrchestrate
            ? []
            : [
                ...(formatConversationSummary(conversationContext)
                    ? [{ role: 'system', content: formatConversationSummary(conversationContext) }]
                    : []),
                ...formatConversationTurns(conversationContext).map((item) => ({
                    role: item.role,
                    content: item.content,
                })),
            ];

        const conversationMessages = [
            { role: 'system', content: systemPrompt },
            ...contextMessages,
            { role: 'system', content: buildLatestTurnGuardPrompt() },
            { role: 'user', content: messageForModel },
        ];

        console.info(
            `[api/chat][${requestId}] resolved_language=${resolvedProfile.language} verbosity=${resolvedProfile.expectation.verbosity} format=${resolvedProfile.expectation.format} tone=${resolvedProfile.expectation.tone} ambiguity=${resolvedProfile.expectation.ambiguityRisk} platform=${clientContext?.platform || 'unknown'}`,
        );

        if (isE2eMockRequest(req)) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store');
            res.setHeader('X-Provider', E2E_MOCK_PROVIDER);
            res.setHeader('X-Model', E2E_MOCK_MODEL);
            res.setHeader('X-Race-Latency', '0ms');
            res.setHeader('X-Winner-Latency', '0ms');
            res.setHeader('X-Degraded', 'false');
            res.setHeader('X-Resolved-Language', resolvedProfile.language);
            const text = buildE2eMockChatText(resolvedProfile.language);
            res.end(text);
            console.info(`[api/chat][${requestId}] winner=${E2E_MOCK_PROVIDER}:${E2E_MOCK_MODEL} raceLatency=0ms repaired=0 mocked=1`);
            return;
        }

        // Build racer list
        const racerConfigs = getRacerConfigs();
        const racers: Promise<RaceResult>[] = [];
        const controllers: Map<string, AbortController> = new Map();

        // If mode is 'race' or no specific provider, race all available
        const isRaceMode = !requestedProvider || requestedProvider === 'AUTO' || normalizedMode === 'race';

        if (isRaceMode) {
            // RACE MODE: fire all providers simultaneously, fastest wins
            for (const config of racerConfigs) {
                const key = getNextKey(config.provider);
                if (!key) continue;

                const controller = new AbortController();
                controllers.set(config.provider, controller);

                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                let racerPromise: Promise<RaceResult>;
                if (config.provider === 'GEMINI') {
                    // Race multiple Gemini models too
                    racerPromise = fetchGemini(config.model, key, conversationMessages, controller.signal)
                        .finally(() => clearTimeout(timeoutId));
                } else {
                    racerPromise = fetchOpenAICompatible(config, key, conversationMessages, controller.signal)
                        .finally(() => clearTimeout(timeoutId));
                }

                racers.push(racerPromise.catch(err => {
                    console.error(
                        `[api/chat][${requestId}] racer_fail provider=${config.provider} details="${sanitizeErrorDetails(err, 180)}"`,
                    );
                    throw err;
                }));
            }
        } else {
            // TARGETED MODE: specific provider with model fallback
            const targetProvider = requestedProvider as ProviderId;
            const key = getNextKey(targetProvider);
            if (!key) {
                return res.status(503).json({
                    requestId,
                    error: `No API keys available for ${targetProvider}`,
                    errorCode: 'no_key',
                });
            }

            if (targetProvider === 'GEMINI') {
                // Try Gemini model fallback chain
                const models = modelId ? [modelId, ...GEMINI_FALLBACK_CHAIN.filter(m => m !== modelId)] : GEMINI_FALLBACK_CHAIN;
                for (const model of models) {
                    const controller = new AbortController();
                    controllers.set(`GEMINI_${model}`, controller);
                    const timeoutId = setTimeout(() => controller.abort(), 28000);

                    racers.push(
                        fetchGemini(model, key, conversationMessages, controller.signal)
                            .finally(() => clearTimeout(timeoutId))
                            .catch(err => {
                                console.error(
                                    `[api/chat][${requestId}] gemini_fallback model=${model} details="${sanitizeErrorDetails(err, 180)}"`,
                                );
                                throw err;
                            })
                    );
                }
            } else {
                const config = racerConfigs.find(c => c.provider === targetProvider);
                if (!config) {
                    return res.status(400).json({
                        requestId,
                        error: `Unknown provider: ${targetProvider}`,
                        errorCode: 'validation_error',
                    });
                }
                const controller = new AbortController();
                controllers.set(targetProvider, controller);
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                racers.push(
                    fetchOpenAICompatible(config, key, conversationMessages, controller.signal)
                        .finally(() => clearTimeout(timeoutId))
                );
            }
        }

        if (racers.length === 0) {
            return res.status(503).json({
                requestId,
                error: 'No AI providers available. Check API keys.',
                errorCode: 'no_key',
            });
        }

        // THE RACE
        const raceStart = Date.now();
        const winner = await raceToSuccess(racers, 30000);
        const raceLatency = Date.now() - raceStart;

        // Abort losers
        for (const [id, controller] of controllers.entries()) {
            if (id !== winner.provider && !id.startsWith(`${winner.provider}_`)) {
                try { controller.abort(); } catch { }
            }
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.setHeader('X-Provider', winner.provider);
        res.setHeader('X-Model', winner.model);
        res.setHeader('X-Race-Latency', `${raceLatency}ms`);
        res.setHeader('X-Winner-Latency', `${winner.latency}ms`);
        res.setHeader('X-Degraded', 'false');
        res.setHeader('X-Resolved-Language', resolvedProfile.language);

        const rawText = await streamToText(winner.stream);
        const finalText = await repairChatText({
            rawText,
            requestId,
            resolvedProfile,
            originalMessage: message,
        });
        res.end(finalText);
        console.info(
            `[api/chat][${requestId}] winner=${winner.provider}:${winner.model} raceLatency=${raceLatency}ms repaired=${needsRepair(rawText) ? 1 : 0}`,
        );

    } catch (error: any) {
        const details = sanitizeErrorDetails(error, 200);
        console.error(`[api/chat][${requestId}] fatal="${details}"`);

        if (!res.headersSent) {
            res.status(500).json({
                requestId,
                error: 'All AI providers failed. Please try again.',
                errorCode: 'provider_error',
                details,
            });
        } else {
            res.end('\n\n[Connection interrupted. Please try again.]');
        }
    }
}


