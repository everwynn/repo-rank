import config from '../../config/categories.json';
import type { CategoriesConfig, CategoryConfig, GroupConfig, Repo, WindowId } from '../types';

const categoriesConfig = config as unknown as CategoriesConfig;

const rankingModules = import.meta.glob<Record<string, unknown>>('../../data/rankings/*/*.json', {
  eager: true,
  import: 'default',
});

const indexModules = import.meta.glob<{ updatedAt?: string }>('../../data/index.json', {
  eager: true,
  import: 'default',
});

export const GROUPS: GroupConfig[] = categoriesConfig.groups;

export function getGroup(id: string): GroupConfig | undefined {
  return GROUPS.find((group) => group.id === id);
}

export function getCategoriesOf(groupId: string, kind?: CategoryConfig['kind']) {
  return categoriesConfig.categories.filter(
    (category) =>
      category.group === groupId &&
      category.enabled !== false &&
      (!kind || (category.kind ?? 'language') === kind),
  );
}

export function getCategory(id: string) {
  return categoriesConfig.categories.find((category) => category.id === id);
}

export function getWindowsOf(categoryId: string): WindowId[] {
  return getCategory(categoryId)?.windows ?? [];
}

export function windowLabel(id: WindowId): string {
  return categoriesConfig.windows[id]?.label ?? id;
}

export function getItems(categoryId: string, window: WindowId): Repo[] {
  const data = rankingModules[`../../data/rankings/${categoryId}/${window}.json`] as
    | { items?: Repo[] }
    | undefined;
  return Array.isArray(data?.items) ? data.items : [];
}

/** 大类总榜：合并去重后重排名次，不落盘。
 *  框架分类不参与：框架仓库的主语言往往已在语言榜里出现过，
 *  混入后同一个仓库会在两处上榜，语言维度的可比性会被破坏。 */
export function getGroupRanking(groupId: string, window: WindowId, limit = 100): Repo[] {
  const byId = new Map<number, Repo>();
  for (const category of getCategoriesOf(groupId)) {
    if (category.kind === 'framework') continue;
    for (const repo of getItems(category.id, window)) {
      const existing = byId.get(repo.id);
      if (!existing || repo.stars > existing.stars) byId.set(repo.id, repo);
    }
  }
  return [...byId.values()]
    .sort((a, b) => b.stars - a.stars || a.fullName.localeCompare(b.fullName))
    .slice(0, limit)
    .map((repo, index) => ({ ...repo, rank: index + 1 }));
}

export function getUpdatedAt(): string {
  return indexModules['../../data/index.json']?.updatedAt ?? '';
}

export function getSubcategoryPaths(): { group: string; slug: string }[] {
  return GROUPS.flatMap((group) =>
    getCategoriesOf(group.id).map((category) => ({ group: group.id, slug: category.id })),
  );
}

/** 除 total 以外的口径单独成页，total 由 `[group]/[slug].astro` 承担，避免路径重复 */
export function getWindowPaths(): { group: string; slug: string; window: WindowId }[] {
  return GROUPS.flatMap((group) =>
    getCategoriesOf(group.id).flatMap((category) =>
      category.windows
        .filter((window) => window !== 'total')
        .map((window) => ({ group: group.id, slug: category.id, window })),
    ),
  );
}
