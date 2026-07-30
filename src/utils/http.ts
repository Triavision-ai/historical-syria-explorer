/** Thin fetch wrapper with JSON handling and consistent errors. */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  }
  return (await response.json()) as T;
}

export async function postJson<T>(
  url: string,
  body: unknown,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  return fetchJson<T>(url, {
    ...init,
    method: 'POST',
    // Spread `init` FIRST: a caller-supplied `headers` object must be merged
    // with the JSON content type, not replace it (M2MClient passes its
    // X-Auth-Token this way and would otherwise drop the content type).
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
  });
}
