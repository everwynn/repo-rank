export type WindowId = 'total' | 'new' | 'active';

export interface Repo {
  id: number;
  fullName: string;
  url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  license: string | null;
  stars: number;
  forks: number;
  createdAt: string;
  pushedAt: string;
  archived: boolean;
  rank: number | null;
  rankDelta: number | null;
  starsDelta: number | null;
}

export interface RankingFile {
  categoryId: string;
  window: WindowId;
  updatedAt: string;
  totalFetched: number;
  items: Repo[];
}

export interface QueryEntry {
  language?: string;
  topic?: string;
}

export interface CategoryConfig {
  id: string;
  group: string;
  name: string;
  /** 语义轴：语言（默认）/ 框架 / 主题；框架不参与大类合并总榜 */
  kind?: 'language' | 'framework' | 'topic';
  enabled?: boolean;
  queries: QueryEntry[];
  windows: WindowId[];
  minStars?: Partial<Record<WindowId, number>>;
  /** topic 查询的降噪白名单：只保留主语言命中的仓库 */
  langFilter?: string[];
}

export interface GroupConfig {
  id: string;
  name: string;
  hint: string;
}

export interface CategoriesConfig {
  windows: Record<WindowId, { label: string; dateQualifier: string | null; days: number }>;
  groups: GroupConfig[];
  categories: CategoryConfig[];
}
