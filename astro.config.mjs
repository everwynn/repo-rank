// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// GitHub Pages 项目站点访问路径为 /repo-rank/，本地开发保持根路径
const isCI = process.env.CI === 'true';

// https://astro.build/config
export default defineConfig({
  site: 'https://everwynn.github.io',
  base: isCI ? '/repo-rank/' : '/',
  integrations: [tailwind()],
  output: 'static',
  // Astro 开发工具条一直浮在页面底部挡住页脚，本地也关掉；需要时改回 true 即可
  devToolbar: { enabled: false },
});
