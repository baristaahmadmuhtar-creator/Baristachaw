import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SCRIPT_PATH = path.resolve(process.cwd(), 'apps/web/public/auth-callback.js');
const SCRIPT_SOURCE = readFileSync(SCRIPT_PATH, 'utf8');
const CALLBACK_RESULT_KEY = 'BARISTA_OAUTH_CALLBACK_RESULT_V1';

function runCallbackScript(options: {
  attrs: Record<string, string>;
  opener?: { postMessage: (payload: unknown, targetOrigin: string) => void } | null;
}) {
  const storage = new Map<string, string>();
  const posts: Array<{ payload: unknown; targetOrigin: string }> = [];
  let closed = false;
  let redirectedTo = '';

  const node = {
    getAttribute(name: string) {
      return options.attrs[name] || '';
    },
  };

  const windowObject = {
    opener: options.opener
      ? {
          postMessage(payload: unknown, targetOrigin: string) {
            posts.push({ payload, targetOrigin });
            options.opener?.postMessage(payload, targetOrigin);
          },
        }
      : null,
    close() {
      closed = true;
    },
    location: {
      origin: 'https://baristaclaw.vercel.app',
      replace(value: string) {
        redirectedTo = value;
      },
    },
    sessionStorage: {
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    },
  };

  vm.runInNewContext(SCRIPT_SOURCE, {
    window: windowObject,
    document: {
      getElementById(id: string) {
        return id === 'auth-callback-data' ? node : null;
      },
    },
    decodeURIComponent,
    JSON,
    Date,
  });

  return {
    closed,
    redirectedTo,
    posts,
    stored: storage.get(CALLBACK_RESULT_KEY) || '',
  };
}

test('auth callback script posts success to opener and closes popup', () => {
  const result = runCallbackScript({
    attrs: {
      'data-mode': 'success',
      'data-user': encodeURIComponent(JSON.stringify({ id: 'u_123', name: 'Barista User' })),
      'data-target-origin': encodeURIComponent('https://baristaclaw.vercel.app'),
      'data-return-to': encodeURIComponent('/chat?welcome=1'),
    },
    opener: {
      postMessage() {
        // noop
      },
    },
  });

  assert.equal(result.closed, true);
  assert.equal(result.redirectedTo, '');
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0]?.targetOrigin, 'https://baristaclaw.vercel.app');
  assert.equal((result.posts[0]?.payload as any)?.type, 'OAUTH_AUTH_SUCCESS');
  assert.deepEqual((result.posts[0]?.payload as any)?.user, { id: 'u_123', name: 'Barista User' });
});

test('auth callback script stores success result and returns to app without opener', () => {
  const result = runCallbackScript({
    attrs: {
      'data-mode': 'success',
      'data-user': encodeURIComponent(JSON.stringify({ id: 'u_456', email: 'barista@example.com' })),
      'data-return-to': encodeURIComponent('/tools?tab=ai-brew'),
    },
  });

  assert.equal(result.closed, false);
  assert.equal(result.redirectedTo, '/tools?tab=ai-brew');
  assert.ok(result.stored);

  const payload = JSON.parse(result.stored);
  assert.equal(payload.type, 'success');
  assert.deepEqual(payload.user, { id: 'u_456', email: 'barista@example.com' });
});

test('auth callback script stores error result and returns to app without opener', () => {
  const result = runCallbackScript({
    attrs: {
      'data-mode': 'error',
      'data-error-message': encodeURIComponent('Login cancelled by user'),
      'data-return-to': encodeURIComponent('/scanner'),
    },
  });

  assert.equal(result.redirectedTo, '/scanner');
  assert.ok(result.stored);

  const payload = JSON.parse(result.stored);
  assert.equal(payload.type, 'error');
  assert.equal(payload.error, 'Login cancelled by user');
});
