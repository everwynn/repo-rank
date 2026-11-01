export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson(url, { timeoutMs = 20000, headers = {}, retries = 3 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      const rateLimit = {
        remaining: Number(response.headers.get('x-ratelimit-remaining') ?? -1),
        resetAt: Number(response.headers.get('x-ratelimit-reset') ?? 0) * 1000,
      };

      if (response.status === 403 || response.status === 429) {
        const body = await response.text();
        if (/rate limit/i.test(body)) {
          const waitMs = Math.min(Math.max(rateLimit.resetAt - Date.now() + 2000, 5000), 90000);
          lastError = new Error(`GitHub 限流，等待 ${Math.round(waitMs / 1000)}s 后重试`);
          await sleep(waitMs);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 120)}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return { data: await response.json(), rateLimit };
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(1000 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}
