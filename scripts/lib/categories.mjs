import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = fileURLToPath(new URL('../../config/categories.json', import.meta.url));

/** 分类的语义轴：语言按主语言字段抓，框架与主题都按 topic 抓 */
export const CATEGORY_KINDS = ['language', 'framework', 'topic'];

export function loadConfig(path = CONFIG_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function getEnabledCategories(config) {
  return (config.categories ?? []).filter((category) => category.enabled !== false);
}

/** 返回错误信息数组；空数组表示通过 */
export function validateConfig(config) {
  const errors = [];
  const windowIds = new Set(Object.keys(config.windows ?? {}));
  const groupIds = new Set((config.groups ?? []).map((group) => group.id));
  const seenIds = new Set();

  for (const group of config.groups ?? []) {
    if (!group.id) errors.push('分组缺少 id');
    if (!group.name) errors.push(`分组 ${group.id}: 缺少 name`);
  }

  for (const [id, window] of Object.entries(config.windows ?? {})) {
    if (window.dateQualifier && !(window.days > 0)) {
      errors.push(`窗口 ${id}: 有 dateQualifier 时 days 必须大于 0`);
    }
  }

  for (const category of getEnabledCategories(config)) {
    const where = `分类 ${category.id ?? '(缺少 id)'}`;
    if (!category.id) errors.push(`${where}: 缺少 id`);
    if (seenIds.has(category.id)) errors.push(`${where}: id 重复`);
    seenIds.add(category.id);
    if (!groupIds.has(category.group)) errors.push(`${where}: group "${category.group}" 不存在`);
    if (!category.name) errors.push(`${where}: 缺少 name`);

    const queries = category.queries ?? [];
    if (queries.length === 0) errors.push(`${where}: 至少需要一个查询条件`);
    for (const query of queries) {
      const keys = ['language', 'topic'].filter((key) => query[key]);
      if (keys.length !== 1) {
        errors.push(`${where}: 每个查询条件必须且只能含 language 或 topic 之一`);
      }
    }

    const kind = category.kind ?? 'language';
    if (!CATEGORY_KINDS.includes(kind)) {
      errors.push(`${where}: kind "${kind}" 非法，只能是 ${CATEGORY_KINDS.join(' / ')}`);
    }

    if (category.langFilter !== undefined) {
      if (!Array.isArray(category.langFilter) || category.langFilter.length === 0) {
        errors.push(`${where}: langFilter 必须是非空数组`);
      }
    }

    const windows = category.windows ?? [];
    if (windows.length === 0) errors.push(`${where}: 至少需要一个窗口`);
    if (kind === 'framework' && windows.length !== 1) {
      errors.push(`${where}: 框架分类只支持单一窗口（topic 下新星/活跃条目太少，会造出空榜）`);
    }
    for (const windowId of windows) {
      if (!windowIds.has(windowId)) errors.push(`${where}: 窗口 "${windowId}" 未定义`);
    }
    for (const windowId of Object.keys(category.minStars ?? {})) {
      if (!windowIds.has(windowId)) errors.push(`${where}: minStars 含未定义窗口 "${windowId}"`);
    }
  }

  return errors;
}
