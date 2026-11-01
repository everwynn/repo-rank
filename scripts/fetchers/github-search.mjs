import { fetchJson } from '../lib/http.mjs';
import { searchUrl } from '../lib/query.mjs';
import { toRepo } from '../normalize.mjs';

export async function searchRepos(query, { perPage = 100, timeoutMs = 20000 } = {}) {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'repo-rank/0.1',
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const { data, rateLimit } = await fetchJson(searchUrl({ query, perPage }), { timeoutMs, headers });
  if (!Array.isArray(data?.items)) {
    throw new Error(data?.message ? `GitHub API: ${data.message}` : 'Search API 返回格式异常');
  }
  return { repos: data.items.map(toRepo), rateLimit };
}
