/** 只保留站点要用的字段，丢掉 owner/urls 等嵌套对象控制体积 */
export function toRepo(item) {
  const spdx = item.license?.spdx_id;
  return {
    id: item.id,
    fullName: item.full_name,
    url: item.html_url,
    description: item.description ?? null,
    homepage: item.homepage || null,
    language: item.language ?? null,
    topics: Array.isArray(item.topics) ? item.topics : [],
    license: spdx && spdx !== 'NOASSERTION' ? spdx : null,
    stars: item.stargazers_count ?? 0,
    forks: item.forks_count ?? 0,
    createdAt: item.created_at,
    pushedAt: item.pushed_at,
    archived: Boolean(item.archived),
    rank: null,
    rankDelta: null,
    starsDelta: null,
  };
}

/** topic 并集是多次查询的结果，同一仓库会出现多次，按 id 去重取 star 更高的一条 */
export function mergeRepos(lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const repo of list) {
      const existing = byId.get(repo.id);
      if (!existing || repo.stars > existing.stars) byId.set(repo.id, repo);
    }
  }
  return [...byId.values()];
}

export function rankAndTruncate(repos, limit = 100) {
  return [...repos]
    .sort((a, b) => b.stars - a.stars || a.fullName.localeCompare(b.fullName))
    .slice(0, limit)
    .map((repo, index) => ({ ...repo, rank: index + 1 }));
}
