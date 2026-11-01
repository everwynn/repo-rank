const API = 'https://api.github.com/search/repositories';
const DAY_MS = 86_400_000;

export function encodeQuery(query) {
  return encodeURIComponent(query);
}

/** 单个 topic / language 的查询串；多限定符在 GitHub 是"与"关系，所以并集必须拆成多次查询 */
export function buildSearchQuery({ window, entry, minStars = 0, today = new Date() }) {
  const parts = [];
  if (entry.language) parts.push(`language:${entry.language}`);
  if (entry.topic) parts.push(`topic:${entry.topic}`);

  if (window.dateQualifier) {
    const since = new Date(today.getTime() - window.days * DAY_MS).toISOString().slice(0, 10);
    parts.push(`${window.dateQualifier}:>${since}`);
  }

  if (minStars > 0) parts.push(`stars:>=${minStars}`);
  return parts.join(' ');
}

export function searchUrl({ query, perPage = 100 }) {
  return `${API}?q=${encodeQuery(query)}&sort=stars&order=desc&per_page=${perPage}`;
}
