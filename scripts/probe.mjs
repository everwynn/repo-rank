import { loadConfig, getEnabledCategories } from './lib/categories.mjs';
import { buildSearchQuery, searchUrl } from './lib/query.mjs';
import { fetchJson, sleep } from './lib/http.mjs';

const MIN_INTERVAL_MS = 2200;

function argValue(name, fallback) {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

const groupFilter = argValue('group', '');
const config = loadConfig();
const totalWindow = config.windows.total;

function uniqueEntries(categories) {
  const seen = new Set();
  const result = [];
  for (const category of categories) {
    for (const entry of category.queries) {
      const key = entry.topic ?? entry.language;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push({ key, entry });
    }
  }
  return result;
}

async function probeOne(entry) {
  const query = buildSearchQuery({ window: totalWindow, entry });
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'repo-rank-probe' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const { data: countData } = await fetchJson(searchUrl({ query, perPage: 1 }), { headers });
  await sleep(MIN_INTERVAL_MS);
  const { data: sampleData } = await fetchJson(searchUrl({ query, perPage: 20 }), { headers });

  const sample = Array.isArray(sampleData.items) ? sampleData.items : [];
  const stars50 = sample.filter((item) => (item.stargazers_count ?? 0) >= 50).length;
  return { total: countData.total_count ?? 0, sampleSize: sample.length, stars50 };
}

const categories = getEnabledCategories(config)
  .filter((category) => !groupFilter || category.group === groupFilter);

if (!process.env.GITHUB_TOKEN) {
  console.warn('提示：未设置 GITHUB_TOKEN，搜索接口限流约 10 次/分，探测会比较慢。\n');
}

console.log('| 分类 | 主题词 | 命中总数 | 前 20 中 stars>=50 | 判断 |');
console.log('| --- | --- | --- | --- | --- |');

for (const category of categories) {
  for (const { entry } of uniqueEntries([category])) {
    const label = entry.topic ?? `language:${entry.language}`;
    try {
      const { total, sampleSize, stars50 } = await probeOne(entry);
      const verdict = total < 20 ? '砍掉' : stars50 === 0 ? '样本偏弱' : '保留';
      console.log(`| ${category.name} | ${label} | ${total} | ${stars50}/${sampleSize} | ${verdict} |`);
    } catch (error) {
      console.log(`| ${category.name} | ${label} | 抓取失败 | — | ${error.message} |`);
    }
    await sleep(MIN_INTERVAL_MS);
  }
}

console.log('\n判读标准：命中总数 < 20 的子类删除；前 20 中 stars>=50 为 0 说明该 topic 全是废弃小库。');
