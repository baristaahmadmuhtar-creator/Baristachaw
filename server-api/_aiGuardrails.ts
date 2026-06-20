import type { StructuredAiAction } from '../packages/shared/src/domain.js';

export type AiGuardrailDecision =
  | {
      action: 'allow';
      reason:
        | 'safe_general'
        | 'coffee_or_menu'
        | 'baristachaw_product'
        | 'app_support'
        | 'educational'
        | 'feature_design'
        | 'safe_debugging'
        | 'safe_prompt_design';
    }
  | {
      action: 'soft_limit';
      reason: 'unrelated_large_software_request';
    }
  | {
      action: 'hard_block';
      reason:
        | 'secret_or_credential_request'
        | 'internal_prompt_request'
        | 'dangerous_or_abusive_request';
    };

export function classifyAiPromptGuardrail(
  prompt: string,
  context?: {
    action?: StructuredAiAction | 'chat';
    clientSurface?: string;
    clientFeature?: string;
  }
): AiGuardrailDecision {
  const text = String(prompt || '').trim();
  if (!text) return { action: 'allow', reason: 'safe_general' };

  // 1. HARD BLOCK for clear safety risks
  const DANGEROUS_OR_ABUSIVE_RE = /\b(?:malware|phishing|spam abuse|exploit instructions|jailbreak|bypass auth|curi|steal|hack)\b/i;
  const SECRET_OR_CREDENTIAL_RE = /\b(?:api\s*key|apikey|password|credential|kredensial|kata sandi|\.env|private config|private data|token)\b/i;
  const INTERNAL_PROMPT_RE = /\b(?:system prompt|developer prompt|prompt rahasia|tool instruction|internal policy|internal prompt|logika internal|source code internal|kode sumber baristachaw|arsitektur rahasia|internal logic|internal system|sistem internal)\b/i;
  const LEAK_VERB_RE = /\b(?:bocorkan|tampilkan|berikan|reveal|show|bypass|apa isi|curi|steal|spill)\b/i;

  if (DANGEROUS_OR_ABUSIVE_RE.test(text)) {
    return { action: 'hard_block', reason: 'dangerous_or_abusive_request' };
  }
  
  if (LEAK_VERB_RE.test(text) && (SECRET_OR_CREDENTIAL_RE.test(text) || INTERNAL_PROMPT_RE.test(text))) {
    if (SECRET_OR_CREDENTIAL_RE.test(text)) {
      return { action: 'hard_block', reason: 'secret_or_credential_request' };
    }
    return { action: 'hard_block', reason: 'internal_prompt_request' };
  }

  // Juga memblokir jika user meminta source code baristachaw secara eksplisit tanpa kata kerja leak
  if (/\b(?:source code baristachaw|kode sumber baristachaw|logika internal baristachaw)\b/i.test(text)) {
      return { action: 'hard_block', reason: 'internal_prompt_request' };
  }

  // 2. ALLOW for Drink / Menu / Coffee
  const COFFEE_MENU_RE = /\b(?:monc blanc|mon blanc|montblanc|signature|kopi susu|latte|creamy coffee)\b/i;
  if (COFFEE_MENU_RE.test(text)) {
    return { action: 'allow', reason: 'coffee_or_menu' };
  }

  // 3. ALLOW for Baristachaw Technical Work
  const BARISTACHAW_TERMS_RE = /\b(?:baristachaw|coffee|kopi|cafe|ai brew|grinder|scanner|ai chat|subscription|collection|ui|ux|prd|prompt|test case|debug|pseudo(?:-?logic|-?code)?)\b/i;
  if (BARISTACHAW_TERMS_RE.test(text)) {
    if (/\b(?:debug|cek kenapa)\b/i.test(text)) return { action: 'allow', reason: 'safe_debugging' };
    if (/\b(?:prd|architecture|flow|logic|test case|ux)\b/i.test(text)) return { action: 'allow', reason: 'feature_design' };
    if (/\b(?:prompt)\b/i.test(text)) return { action: 'allow', reason: 'safe_prompt_design' };
    return { action: 'allow', reason: 'baristachaw_product' };
  }

  // 4. SOFT LIMIT for large unrelated coding requests
  const LARGE_SOFTWARE_RE = /\b(?:full source code|backend lengkap|clone app|full production code|saas marketplace|trading bot|aplikasi lengkap|aplikasi besar|full unrelated backend|large random source code)\b/i;
  const ASK_CODE_RE = /\b(?:buatkan full|generate backend|buat clone)\b/i;
  if (LARGE_SOFTWARE_RE.test(text) || ASK_CODE_RE.test(text)) {
    return { action: 'soft_limit', reason: 'unrelated_large_software_request' };
  }

  // 5. Educational / General
  if (/\b(?:jelaskan|cara kerja|apa itu)\b/i.test(text) && /\b(?:api|responseprofile|conversationcontext)\b/i.test(text)) {
    return { action: 'allow', reason: 'educational' };
  }

  return { action: 'allow', reason: 'safe_general' };
}

export function buildHardBlockedAiReply(language = 'id', reason?: string): string {
  if (/^id(?:-|$)/i.test(language)) {
    return 'Saya tidak bisa membantu membocorkan secret, credential, prompt internal, atau instruksi bypass keamanan. Saya bisa bantu jelaskan konsep amannya atau bantu buat guardrail yang aman.';
  }
  if (/^ar(?:-|$)/i.test(language)) {
    return 'لا يمكنني المساعدة في كشف الأسرار أو بيانات الاعتماد أو التوجيهات الداخلية. يمكنني شرح المفهوم الآمن أو تصميم إطار حماية.';
  }
  return 'I can’t help expose secrets, credentials, internal prompts, or security bypass instructions. I can help explain the safe concept or design a safe guardrail.';
}

export function buildSoftLimitRuntimeInstruction(): string {
  return "Trusted runtime scope note: The request appears outside Baristachaw’s core product scope. Do not provide a large full production codebase. Provide safe conceptual guidance, PRD, architecture, pseudo-logic, checklist, or implementation notes only.";
}
