import { afterEach, describe, expect, it, vi } from 'vitest';
import { postJson } from './http';

function captureFetch() {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });
  return calls;
}

function headerOf(init: RequestInit, name: string): string | undefined {
  return (init.headers as Record<string, string> | undefined)?.[name];
}

describe('postJson', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the JSON content type', async () => {
    const calls = captureFetch();
    await postJson('https://example.com/x', { a: 1 });
    expect(headerOf(calls[0]!.init, 'Content-Type')).toBe('application/json');
    expect(calls[0]!.init.body).toBe('{"a":1}');
  });

  it('merges caller headers with the content type instead of replacing them', async () => {
    // M2MClient always passes a headers object (empty until it holds a session
    // token). Spreading `init` after the merged headers silently dropped the
    // content type on every USGS M2M request.
    const calls = captureFetch();
    await postJson('https://example.com/x', { a: 1 }, { headers: { 'X-Auth-Token': 'abc' } });
    expect(headerOf(calls[0]!.init, 'Content-Type')).toBe('application/json');
    expect(headerOf(calls[0]!.init, 'X-Auth-Token')).toBe('abc');
  });

  it('keeps the content type when passed an empty headers object', async () => {
    const calls = captureFetch();
    await postJson('https://example.com/x', { a: 1 }, { headers: {} });
    expect(headerOf(calls[0]!.init, 'Content-Type')).toBe('application/json');
  });

  it('still forwards an abort signal', async () => {
    const calls = captureFetch();
    const controller = new AbortController();
    await postJson('https://example.com/x', { a: 1 }, { signal: controller.signal });
    expect(calls[0]!.init.signal).toBe(controller.signal);
    expect(headerOf(calls[0]!.init, 'Content-Type')).toBe('application/json');
  });
});
