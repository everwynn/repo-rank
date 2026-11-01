import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRepos, rankAndTruncate, toRepo } from '../scripts/normalize.mjs';

const raw = (overrides = {}) => ({
  id: 1,
  full_name: 'owner/name',
  html_url: 'https://github.com/owner/name',
  description: 'desc',
  homepage: '',
  language: 'Go',
  topics: ['cli'],
  license: { spdx_id: 'MIT' },
  stargazers_count: 100,
  forks_count: 10,
  created_at: '2020-01-01T00:00:00Z',
  pushed_at: '2026-10-30T00:00:00Z',
  archived: false,
  ...overrides,
});

test('toRepo 裁剪字段并把名次类字段置空', () => {
  const repo = toRepo(raw());
  assert.deepEqual(repo, {
    id: 1,
    fullName: 'owner/name',
    url: 'https://github.com/owner/name',
    description: 'desc',
    homepage: null,
    language: 'Go',
    topics: ['cli'],
    license: 'MIT',
    stars: 100,
    forks: 10,
    createdAt: '2020-01-01T00:00:00Z',
    pushedAt: '2026-10-30T00:00:00Z',
    archived: false,
    rank: null,
    rankDelta: null,
    starsDelta: null,
  });
});

test('toRepo 把缺失字段与 NOASSERTION 许可证归为 null', () => {
  const repo = toRepo(raw({ description: null, language: null, topics: undefined, license: { spdx_id: 'NOASSERTION' } }));
  assert.equal(repo.description, null);
  assert.equal(repo.language, null);
  assert.deepEqual(repo.topics, []);
  assert.equal(repo.license, null);
});

test('mergeRepos 按 id 去重且保留 star 更高的一条', () => {
  const a = toRepo(raw({ id: 1, stargazers_count: 100 }));
  const b = toRepo(raw({ id: 1, stargazers_count: 250 }));
  const c = toRepo(raw({ id: 2, full_name: 'x/y', stargazers_count: 50 }));
  const merged = mergeRepos([[a], [b, c]]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((repo) => repo.id === 1).stars, 250);
});

test('rankAndTruncate 按 star 降序并写入名次', () => {
  const repos = [
    toRepo(raw({ id: 1, full_name: 'a/one', stargazers_count: 10 })),
    toRepo(raw({ id: 2, full_name: 'b/two', stargazers_count: 30 })),
  ];
  const ranked = rankAndTruncate(repos);
  assert.deepEqual(ranked.map((repo) => [repo.rank, repo.fullName]), [[1, 'b/two'], [2, 'a/one']]);
});

test('同 star 时按 fullName 升序，结果可复现', () => {
  const repos = [
    toRepo(raw({ id: 1, full_name: 'z/z', stargazers_count: 10 })),
    toRepo(raw({ id: 2, full_name: 'a/a', stargazers_count: 10 })),
  ];
  assert.deepEqual(rankAndTruncate(repos).map((repo) => repo.fullName), ['a/a', 'z/z']);
});

test('截断到 limit 且不修改入参', () => {
  const repos = Array.from({ length: 5 }, (_, index) =>
    toRepo(raw({ id: index + 1, full_name: `o/r${index}`, stargazers_count: index })));
  const ranked = rankAndTruncate(repos, 2);
  assert.equal(ranked.length, 2);
  assert.equal(repos[0].rank, null);
});
