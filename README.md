# 开源榜（repo-rank）

按**开发语言与框架**、**书籍**、**音频**三大类组织的 GitHub 仓库排行榜。纯静态站点，数据每天由 GitHub Actions 自动抓取并提交，构建后部署到 GitHub Pages。

线上地址：<https://everwynn.github.io/repo-rank/>

## 项目初衷

做这个站点的出发点只有一句话：**用同一把尺子，把值得看的仓库排出来，点一下就能到。**

由此派生出的几条原则，贯穿了全部实现：

- **全站只有一种数据对象：GitHub 仓库。**「书籍榜」收录的是书单资源库、电子书工具这类**仓库**，「音频榜」收录的是 TTS、音频处理、播客客户端这类**仓库**，不引入豆瓣、Podcast Index 等第二数据源。分类只是给仓库分组的方式。
- **排序只看 `stars` 一个指标，降序。** 不造加权热度分——加权不可解释、不可复现，用户也无法自行验证。排在前面的一定 star 更多。
- **每条记录必须一次点击到达项目 GitHub 页面**，且在新标签页打开。这是核心交互，不是附带功能。
- **不存正文，只存元数据。** 不抓 README、不做翻译，站点是"中转站"，用户点开是去看项目本身。
- **数据抓取失败时保留上一轮结果**，并在「数据来源」页标记，宁可数据旧一点，也不让页面变空白。

## 功能

- **3 个大类**：开发（16 种语言 + 8 个框架）、书籍（书单资源库 / 电子书工具）、音频（语音合成 / 音频处理 / 播客 / 音乐工具）
- **3 种口径**，各自独立 URL，无 JS 也能用、可单独分享：
  - `total` 总星榜：不限时间，按 star 总数排序
  - `new` 新星榜：近 90 天创建且 star ≥ 50
  - `active` 活跃榜：近 7 天有推送且 star ≥ 500
- **每个榜单保留 Top 100**，桌面端表格、移动端自动变卡片
- **整站无框架运行时**：主题切换、外链、筛选全部是 Astro 组件 + 内联脚本
- **三态主题**：浅色 / 深色 / 跟随系统，首帧前完成初始化，无闪烁
- **数据来源页**：列出本轮每个查询的命中数与失败原因
- **离线单测**：分类配置校验、去重排序、查询串构造、语言配色对比度

## 技术栈

| 层 | 选型 |
| --- | --- |
| 站点 | Astro 4（`output: 'static'`）+ Tailwind 3 |
| 抓取 | Node 20 ESM 脚本，直接调用 GitHub Search API |
| 数据 | 静态 JSON，随仓库提交，无数据库、无后端 |
| 检索索引 | Pagefind（构建期生成于 `dist/pagefind/`） |
| 测试 | `node --test`，全部离线 |
| 部署 | GitHub Actions → GitHub Pages |

## 快速开始

环境要求：**Node.js >= 20.6**、npm。

```bash
npm install
npm run dev
```

打开 <http://localhost:4321/>。

`data/` 里的榜单数据已随仓库提交，克隆后不抓取也能直接构建和预览；页面为空时才会提示需要先运行 `npm run fetch`。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器（`localhost:4321`） |
| `npm run build` | `astro build` 生成静态站，再用 `pagefind --site dist` 生成检索索引 |
| `npm run preview` | 预览 `dist/` 构建产物 |
| `npm run check` | `astro check`，做类型与模板检查 |
| `npm test` | 运行 `tests/` 下全部离线单测 |
| `npm run fetch` | 抓取全部榜单，写入 `data/` |
| `npm run probe` | 探测每个 topic / language 的命中数，只打印、不写盘 |

## 数据抓取

### 认证

GitHub Search API 认证后限流约 30 次/分，未认证约 10 次/分。整轮抓取共 **92 次请求**，未认证时单轮耗时接近 12 分钟，CI 里必须使用 `GITHUB_TOKEN`。

PowerShell：

```powershell
$env:GITHUB_TOKEN = "ghp_xxx"
npm run fetch
```

macOS / Linux：

```bash
export GITHUB_TOKEN=ghp_xxx
npm run fetch
```

### 参数

```bash
# 试运行：只抓取与统计，不写入 data/
npm run fetch -- --dry-run

# 只抓某一个分类（如 go、tts、react）
npm run fetch -- --category=go

# 按大类探测命中数（dev / books / audio）
npm run probe -- --group=audio
```

### 抓取规则

- 请求**严格串行**，最小间隔 2200ms（30 次/分是 2000ms，留 10% 余量）。
- 每个查询只取 `per_page=100` 单页，不翻页，因此不会触碰到 Search API 单查询 1000 条的上限。
- topic 类子类由多个 topic 查询组成，**必须拆成多次查询再本地合并去重**——GitHub 的多限定符是「与」关系，`topic:books topic:ebook` 取的是同时命中两者的仓库，几乎为空。
- 遇到限流（403/429）时读取 `x-ratelimit-reset` 等待重试，最多重试 3 次。
- 单个查询失败**不中断整轮**：记入 `data/health.json`，该榜保留上一轮数据；只有整轮全部失败才以退出码 1 结束。

每轮结束会写入三个统计文件：`data/index.json`（分类清单与各榜条目数）、`data/health.json`（逐条查询的成败）、`data/meta.json`（请求数、失败数、耗时）。

## 分类配置

[`config/categories.json`](config/categories.json) 是**唯一需要改分类的地方**，抓取脚本与页面都从这里读取。

```jsonc
{
  "id": "rust",              // 唯一，同时用作 URL 片段：/dev/rust/
  "group": "dev",            // 必须存在于 groups
  "kind": "language",        // language | framework | topic
  "name": "Rust",            // 展示名
  "enabled": true,           // false 可临时下线
  "queries": [{ "language": "Rust" }],
  "windows": ["total", "new", "active"],
  "minStars": { "new": 50, "active": 500 },
  "langFilter": ["Dart"]     // 仅框架使用：按主语言白名单降噪
}
```

新增分类时需要遵守的约束（都写在 [`scripts/lib/categories.mjs`](scripts/lib/categories.mjs) 的校验里）：

1. 每个 `queries` 条目**必须且只能**含 `language` 或 `topic` 之一。
2. `windows` 里出现的口径必须在顶层 `windows` 中定义。
3. 三个 `kind` 的差异：
   - `language`：按主语言字段抓，可提供三个口径，参与大类合并总榜；
   - `framework`：按 topic 抓，**只允许一个窗口**（topic 下新星/活跃条目太少，会造出只有个位数条目的空榜），必须提供 `langFilter`，**不参与大类合并总榜**（否则同一仓库会在语言榜和框架榜重复上榜）；
   - `topic`：按 topic 并集抓，可提供多个口径。
4. 改完分类后记得同步 [`tests/categories.test.mjs`](tests/categories.test.mjs)——其中断言了分组数 3、分类数 30、请求预算 92 次，以及语言/框架/topic 的数量分布，否则 `npm test` 会失败。

## 数据文件

```text
data/
├─ rankings/<categoryId>/<window>.json   # 每个榜单个文件，window ∈ total | new | active
├─ index.json                            # 更新时间和各榜条目数
├─ health.json                           # 本轮每条查询的 ok / error / skipped
└─ meta.json                             # 本轮请求数、失败数、耗时
```

单条记录（一期就按完整字段落盘，二期字段先写 `null`）：

```jsonc
{
  "id": 123456,                 // repo.id，稳定主键，快照对齐全靠它
  "fullName": "owner/name",
  "url": "https://github.com/owner/name",
  "description": "…",           // 原文，不翻译
  "homepage": null,
  "language": "Go",             // 可为 null
  "topics": ["..."],
  "license": "MIT",             // 可为 null
  "stars": 12345,
  "forks": 678,
  "createdAt": "2020-01-01T00:00:00Z",
  "pushedAt": "2026-10-30T00:00:00Z",
  "archived": false,
  "rank": 1,
  "rankDelta": null,            // 二期：名次变化
  "starsDelta": null            // 二期：对比 30 天前的 star 差
}
```

`archived` 仓库不排除，在卡片上打「已归档」标签；fork 由 Search API 默认排除，不额外处理。

## 页面路由

| 路由 | 内容 |
| --- | --- |
| `/` | 三大类入口，每类 Top 5 + 更新时间 |
| `/dev/`、`/books/`、`/audio/` | 大类总榜（仅总星口径，合并去重后重排名次） |
| `/dev/go/` | 子类总星榜 |
| `/dev/go/new/`、`/dev/go/active/` | 子类新星榜 / 活跃榜 |
| `/about/` | 数据来源、排序口径、更新频率、已知限制 |
| `/sources/` | 每个查询的命中与失败记录 |
| `/sitemap.xml`、`/robots.txt` | 由 `GROUPS` 与路径枚举函数动态生成 |

口径用独立 URL 而不是 JS 切换 tab：每个口径都能单独分享、无 JS 可用、可被搜索引擎建立条目。

## 项目结构

```text
repo-rank/
├─ config/categories.json         分类注册表（改分类只需改这里）
├─ scripts/
│  ├─ fetch.mjs                   抓取编排：串行节流 → 合并去重 → 截断 → 写盘
│  ├─ probe.mjs                   探测 topic / language 命中数
│  ├─ normalize.mjs               字段裁剪、按 id 去重、排序截断
│  ├─ fetchers/github-search.mjs  Search API 调用
│  └─ lib/                        分类校验、查询串、HTTP 重试、文件读写、格式化、配色
├─ data/                          抓取产物（需提交）
├─ src/
│  ├─ pages/                      首页、大类页、子类页、口径页、about、sources
│  ├─ components/                 RankList / RankRow / RankTabs / SubChips / 主题切换等
│  ├─ lib/rankings.ts             构建期读取 data/，做大类合并与路径枚举
│  ├─ layouts/BaseLayout.astro    首屏主题脚本 + head
│  └─ types.ts                    Repo / RankingFile / CategoriesConfig
├─ tests/                         离线单测
└─ .github/workflows/deploy.yml   抓取 + 构建 + 部署
```

数据侧与展示侧唯一的约定是 `data/` 里的 JSON 结构和 [`src/types.ts`](src/types.ts) 里的类型定义；抓取脚本不依赖 Astro，页面也不发起任何网络请求。

## 部署

部署流程在 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，定时触发（UTC 23:23 与 11:23，对应北京时间 07:23 和 19:23），也支持手动 `workflow_dispatch`。

```text
checkout → setup-node 20 + npm cache → npm ci → npm test
  → npm run fetch → git commit data/ → npm run build
  → upload-pages-artifact → deploy-pages
```

所有步骤必须在**同一个 job 内顺序完成**：Actions 用 `GITHUB_TOKEN` 推送的提交不会触发下游 workflow，拆成两个 job 会导致「数据更新了但站点没重建」。

仓库侧需要配置：

1. **Settings → Pages → Source** 选 **GitHub Actions**，不要选分支。
2. **Settings → Actions → General → Workflow permissions** 设为 **Read and write**。
3. **Secrets** 添加 `DATA_PUSH_TOKEN`：fine-grained PAT，权限 Contents: Read and write。public 仓库若连续 60 天无活动，scheduled workflow 会被自动禁用，用 PAT 推送可以规避这一点。
4. `astro.config.mjs` 里 `site: 'https://everwynn.github.io'`、CI 下 `base: '/repo-rank/'`。**仓库名与 `base` 绑定**，改仓库名需要同步改这两处，否则全站样式和链接会 404。

## 测试

```bash
npm test
```

全部离线，不触网：

| 文件 | 覆盖内容 |
| --- | --- |
| `categories.test.mjs` | 分类配置合法性与数量分布、请求预算、非法配置拦截 |
| `normalize.test.mjs` | 字段裁剪、按 id 去重取 star 更高的一条、排序稳定性、Top 100 截断且不改入参 |
| `query.test.mjs` | 三个口径的限定符组合、`minStars` 边界、`C++` / `C#` 的 URL 编码 |
| `format.test.mjs` | star 格式化、相对时间、更新时间格式化 |
| `color.test.mjs` | 16 种语言配色齐备、深色模式对比度下限、未知语言回落、WCAG 对比度算法 |

## 已知限制

- GitHub **没有官方 Trending API**，本站用 `GET /search/repositories` 的限定符组合近似，口径与官方 Trending 不完全一致。
- **拿不到「本周新增 star」**：Search API 不返回增长数据，只能靠自存快照相减，因此名次变化与增速属于二期功能。
- 单查询最多返回 1000 条，每个榜单只保留 Top 100。
- 框架分类按 GitHub topic 归集，topic 由仓库作者自行填写，会混入少量并不使用该框架的仓库；已用主语言白名单过滤，但无法完全消除，**框架榜仅作参考**。
- 框架只提供总星榜：topic 下 90 天内新建的仓库太少，给新星/活跃口径会造出只有个位数条目的空页。
- 「新星榜」看的是仓库**创建时间**，不是 star 增长时间——一个新仓库长期霸榜属于正常现象。
- 部分 `new` 榜条目数较少（如 Scala、播客），这是 topic/语言本身的体量决定的，不做硬凑。

## 二期规划

一期已把 `rankDelta` / `starsDelta` 字段预留进 schema，二期上线不需要改动已落盘数据的结构，也不需要重建历史。

- `data/history/<categoryId>.json`：滚动保留 90 天，紧凑数组存 `[id, rank, stars]`
- 页面新增「名次变化」列（↑3 / ↓2 / 新进榜）与「30 天 star 增速榜」
- 历史不足 30 天时 `starsDelta` 保持 `null`，页面显示「—」而不是 0
- 站内搜索入口（Pagefind 索引已在构建时生成，前端入口待接入）
