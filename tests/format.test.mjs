import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatStars, relativeTime, formatUpdatedAt } from '../scripts/lib/format.mjs';

test('formatStars 覆盖四档量级', () => {
  assert.equal(formatStars(999), '999');
  assert.equal(formatStars(1000), '1.0k');
  assert.equal(formatStars(12345), '12k');
  assert.equal(formatStars(999999), '1.0M');
  assert.equal(formatStars(1234567), '1.2M');
});

test('relativeTime 覆盖天/月/年', () => {
  const now = new Date('2026-11-01T00:00:00Z').getTime();
  assert.equal(relativeTime('2026-11-01T00:00:00Z', now), '今天');
  assert.equal(relativeTime('2026-10-31T00:00:00Z', now), '昨天');
  assert.equal(relativeTime('2026-10-25T00:00:00Z', now), '7 天前');
  assert.equal(relativeTime('2026-08-01T00:00:00Z', now), '3 个月前');
  assert.equal(relativeTime('2024-11-01T00:00:00Z', now), '2 年前');
});

test('relativeTime 遇到非法时间返回破折号', () => {
  assert.equal(relativeTime('not-a-date'), '—');
});

test('formatUpdatedAt 为空时返回提示文案', () => {
  assert.equal(formatUpdatedAt(''), '尚未抓取');
});
