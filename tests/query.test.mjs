import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchQuery, encodeQuery, searchUrl } from '../scripts/lib/query.mjs';

const TOTAL = { label: '总星榜', dateQualifier: null, days: 0 };
const NEW = { label: '新星榜', dateQualifier: 'created', days: 90 };
const ACTIVE = { label: '活跃榜', dateQualifier: 'pushed', days: 7 };

test('language 词条只生成 language 限定符', () => {
  assert.equal(buildSearchQuery({ window: TOTAL, entry: { language: 'Go' } }), 'language:Go');
});

test('topic 词条只生成 topic 限定符', () => {
  assert.equal(buildSearchQuery({ window: TOTAL, entry: { topic: 'ebook' } }), 'topic:ebook');
});

test('新星榜带 created 时间与阈值', () => {
  const today = new Date('2026-11-01T00:00:00Z');
  assert.equal(
    buildSearchQuery({ window: NEW, entry: { language: 'Rust' }, minStars: 50, today }),
    'language:Rust created:>2026-08-03 stars:>=50'
  );
});

test('活跃榜带 pushed 时间', () => {
  const today = new Date('2026-11-01T00:00:00Z');
  assert.equal(
    buildSearchQuery({ window: ACTIVE, entry: { language: 'Go' }, minStars: 500, today }),
    'language:Go pushed:>2026-10-25 stars:>=500'
  );
});

test('minStars 为 0 时不产生 stars 限定符', () => {
  assert.equal(buildSearchQuery({ window: TOTAL, entry: { language: 'Go' }, minStars: 0 }), 'language:Go');
});

test('C++ 与 C# 被正确编码', () => {
  assert.equal(encodeQuery('language:C++'), 'language%3AC%2B%2B');
  assert.equal(encodeQuery('language:C#'), 'language%3AC%23');
});

test('搜索 URL 编码完整并按 star 倒序、单页 100 条', () => {
  const url = searchUrl({ query: 'language:C++', perPage: 100 });
  assert.equal(
    url,
    'https://api.github.com/search/repositories?q=language%3AC%2B%2B&sort=stars&order=desc&per_page=100'
  );
});
