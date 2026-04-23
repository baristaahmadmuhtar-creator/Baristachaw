// @ts-nocheck
import { ApiClient } from '../apiClient';

describe('ApiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('runAiAction sends bearer token and parses json response', async () => {
    const fetchMock = jest.fn(async (_input, init) => {
      const auth = new Headers(init?.headers).get('Authorization');
      expect(auth).toBe('Bearer token-123');
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.agentProfile).toBeUndefined();
      return new Response(JSON.stringify({ ok: true, text: 'done' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    global.fetch = fetchMock;

    const client = new ApiClient({ getAccessToken: () => 'token-123' });
    const response = await client.runAiAction('fast', 'hello');

    expect(response.text).toBe('done');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('sendChatWithProfile forwards conversation context and agent profile', async () => {
    const fetchMock = jest.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.conversationContext?.preferredLanguage).toBe('id');
      expect(body.agentProfile?.preferredLanguage).toBe('id');
      expect(body.agentProfile?.detailPreference).toBe('comprehensive');
      return new Response('ok', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    });

    global.fetch = fetchMock;

    const client = new ApiClient({ getAccessToken: () => 'token-123' });
    const response = await client.sendChatWithProfile('halo', 'race', {
      conversationContext: {
        preferredLanguage: 'id',
        recentMessages: [],
      },
      agentProfile: {
        preferredLanguage: 'id',
        detailPreference: 'comprehensive',
        updatedAt: Date.now(),
      },
    });

    expect(response).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('request retries once on transient 500 and succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'temporary' }), { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, text: 'recovered' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    global.fetch = fetchMock;

    const client = new ApiClient({ getAccessToken: () => 'token-123' });
    const response = await client.runAiAction('fast', 'hello', undefined, { retries: 1 });

    expect(response.text).toBe('recovered');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
