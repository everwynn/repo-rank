import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, getEnabledCategories } from './lib/categories.mjs';
import { buildSearchQuery } from './lib/query.mjs';
import { sleep } from './lib/http.mjs';
import { readJson, writeJson } from './lib/files.mjs';
import { mergeRepos, rankAndTruncate } from './normalize.mjs';
import { searchRepos } from './fetchers/github-search.mjs';

const MIN_INTERVAL_MS = 2200;
const TOP_N = 100;
const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));

function argValue(name, fallback) {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

const dryRun = process.argv.includes('--dry-run');
const onlyCategory = argValue('category', '');
const config = loadConfig();
const now = new Date();

const categories = getEnabledCategories(config)
  .filter((category) => !onlyCategory || category.id === onlyCategory);

const health = [];
const stats = { requests: 0, failed: 0, filtered: 0 };
const startedAt = Date.now();

for (const category of categories) {
  for (const windowId of category.windows) {
    const window = config.windows[windowId];
    const lists = [];
    let succeeded = 0;

    for (const entry of category.queries) {
      const query = buildSearchQuery({
        window,
        entry,
        minStars: category.minStars?.[windowId] ?? 0,
        today: now,
      });
      try {
        const { repos } = await searchRepos(query);
        stats.requests += 1;
        // topic 是用户自填的，噪声明显（shadcn 会出现在 laravel 榜里），
        // 按框架的主流语言白名单本地过一遍，零额外请求
        const kept = category.langFilter?.length
          ? repos.filter((repo) => category.langFilter.includes(repo.language))
          : repos;
        if (kept.length !== repos.length) stats.filtered += repos.length - kept.length;
        lists.push(kept);
        succeeded += 1;
        health.push({ categoryId: category.id, window: windowId, query, status: 'ok', fetched: repos.length, kept: kept.length });
      } catch (error) {
        stats.requests += 1;
        stats.failed += 1;
        health.push({ categoryId: category.id, window: windowId, query, status: 'error', error: error.message });
        console.warn(`[失败] ${category.id}/${windowId} ${query} -> ${error.message}`);
      }
      await sleep(MIN_INTERVAL_MS);
    }

    if (succeeded === 0) {
      const existing = readJson(join(DATA_DIR, 'rankings', category.id, `${windowId}.json`));
      health.push({
        categoryId: category.id,
        window: windowId,
        query: '(全部查询失败)',
        status: 'skipped',
        error: existing ? '保留上一轮数据' : '无历史数据可用',
      });
      console.warn(`[跳过] ${category.id}/${windowId} 全部查询失败`);
      continue;
    }

    const items = rankAndTruncate(mergeRepos(lists), TOP_N);
    if (!dryRun) {
      writeJson(join(DATA_DIR, 'rankings', category.id, `${windowId}.json`), {
        categoryId: category.id,
        window: windowId,
        updatedAt: now.toISOString(),
        totalFetched: lists.reduce((sum, list) => sum + list.length, 0),
        items,
      });
    }
    console.log(`[完成] ${category.id}/${windowId} 入库 ${items.length} 条`);
  }
}

const counts = {};
for (const category of categories) {
  counts[category.id] = {};
  for (const windowId of category.windows) {
    const file = readJson(join(DATA_DIR, 'rankings', category.id, `${windowId}.json`));
    counts[category.id][windowId] = file?.items?.length ?? 0;
  }
}

if (!dryRun) {
  writeJson(join(DATA_DIR, 'index.json'), {
    updatedAt: now.toISOString(),
    timeZone: 'Asia/Shanghai',
    counts,
  });
  writeJson(join(DATA_DIR, 'health.json'), { updatedAt: now.toISOString(), queries: health });
  writeJson(join(DATA_DIR, 'meta.json'), {
    updatedAt: now.toISOString(),
    requests: stats.requests,
    failed: stats.failed,
    durationMs: Date.now() - startedAt,
  });
}

const failed = health.filter((item) => item.status === 'error').length;
console.log(`\n本轮：${stats.requests} 次请求，失败 ${failed}，白名单过滤掉 ${stats.filtered} 条，耗时 ${Math.round((Date.now() - startedAt) / 1000)}s`);
if (failed > 0 && failed === health.length) {
  console.error('全部查询失败，退出码 1');
  process.exit(1);
}
