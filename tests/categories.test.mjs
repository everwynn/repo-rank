import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, validateConfig, getEnabledCategories } from '../scripts/lib/categories.mjs';

test('仓库内的分类配置能通过校验', () => {
  const config = loadConfig();
  assert.deepEqual(validateConfig(config), []);
});

test('分类与分组数量符合设计', () => {
  const config = loadConfig();
  assert.equal(config.groups.length, 3);
  assert.equal(config.categories.length, 30);
});

test('请求预算为 92 次', () => {
  const config = loadConfig();
  const requests = getEnabledCategories(config)
    .reduce((sum, category) => sum + category.queries.length * category.windows.length, 0);
  assert.equal(requests, 92);
});

test('书籍与音频的 topic 数与设计一致', () => {
  const config = loadConfig();
  const topicsOf = (group) => getEnabledCategories(config)
    .filter((category) => category.group === group)
    .reduce((sum, category) => sum + category.queries.filter((q) => q.topic).length, 0);
  assert.equal(topicsOf('books'), 7);
  assert.equal(topicsOf('audio'), 11);
});

test('开发分组是 16 个语言 + 8 个框架', () => {
  const config = loadConfig();
  const dev = getEnabledCategories(config).filter((category) => category.group === 'dev');
  assert.equal(dev.filter((category) => category.kind === 'language').length, 16);
  assert.equal(dev.filter((category) => category.kind === 'framework').length, 8);
});

test('框架分类只给总星窗口，且都带语言白名单', () => {
  const config = loadConfig();
  const frameworks = getEnabledCategories(config).filter((category) => category.kind === 'framework');
  for (const framework of frameworks) {
    assert.deepEqual(framework.windows, ['total'], `${framework.id} 窗口不止 total`);
    assert.ok(
      Array.isArray(framework.langFilter) && framework.langFilter.length > 0,
      `${framework.id} 缺少 langFilter`,
    );
    assert.ok(
      framework.queries.every((query) => query.topic && !query.language),
      `${framework.id} 应该用 topic 查询`,
    );
  }
});

test('每个分类都标了 kind', () => {
  const config = loadConfig();
  for (const category of getEnabledCategories(config)) {
    assert.ok(['language', 'framework', 'topic'].includes(category.kind), `${category.id} 缺少 kind`);
  }
});

test('非法配置会被校验拦下', () => {
  const broken = {
    windows: { total: { label: '总星榜', dateQualifier: null, days: 0 } },
    groups: [{ id: 'dev', name: '开发' }],
    categories: [
      { id: 'a', group: 'dev', name: 'A', queries: [], windows: ['total'] },
      { id: 'a', group: 'nope', name: 'A2', queries: [{ language: 'Go' }], windows: ['total'] },
      { id: 'b', group: 'dev', name: 'B', queries: [{ language: 'Go', topic: 'x' }], windows: ['total'] },
      { id: 'c', group: 'dev', name: 'C', queries: [{ language: 'Go' }], windows: ['weekly'] },
    ],
  };
  const errors = validateConfig(broken);
  // 1 空 queries + 1 id 重复 + 1 group 不存在 + 1 同时含 language/topic + 1 未定义窗口
  assert.equal(errors.length, 5);
});

test('框架分类给多个窗口会被拦下', () => {
  const broken = {
    windows: {
      total: { label: '总星榜', dateQualifier: null, days: 0 },
      new: { label: '新星榜', dateQualifier: 'created', days: 90 },
    },
    groups: [{ id: 'dev', name: '开发' }],
    categories: [
      {
        id: 'react',
        group: 'dev',
        kind: 'framework',
        name: 'React',
        queries: [{ topic: 'react' }],
        windows: ['total', 'new'],
        langFilter: ['TypeScript'],
      },
    ],
  };
  const errors = validateConfig(broken);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /框架分类只支持单一窗口/);
});
