/**
 * 语言配色：取自 GitHub Linguist 的官方语言颜色。
 *
 * 关于对比度：色点只有 8px，且旁边永远跟着语言名文字，属于装饰性图形，
 * WCAG 1.4.11 只约束「理解内容所必需」的图形，所以不在色点上强推 3:1——
 * 强推会把 JavaScript 的 #F1E05A 压成橄榄色，色彩识别度反而丢了。
 * 唯一必须处理的是深色模式：Lua #000080 这类深色在 #111827 卡底上几乎看不见，
 * 因此深色模式只做「可见性下限」提亮（≥ 2.2:1），浅色模式直接用官方原色。
 */

export const LANG_COLORS = {
  Go: '#00ADD8',
  Rust: '#DEA584',
  TypeScript: '#3178C6',
  Python: '#3572A5',
  JavaScript: '#F1E05A',
  Java: '#B07219',
  'C++': '#F34B7D',
  'C#': '#178600',
  C: '#555555',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Dart: '#00B4AB',
  Scala: '#C22D40',
  Zig: '#EC915C',
  Shell: '#89E051',
  HTML: '#E34C26',
  CSS: '#563D7C',
  Vue: '#41B883',
  Svelte: '#FF3E00',
  Lua: '#000080',
  'Jupyter Notebook': '#DA5B0B',
  TeX: '#3D6117',
  'Objective-C': '#438EFF',
  PowerShell: '#012456',
  Dockerfile: '#384D54',
  Makefile: '#427819',
  R: '#198CE7',
  MATLAB: '#E16737',
  CoffeeScript: '#244776',
  Nim: '#FFC200',
  Vala: '#A56DE2',
  GLSL: '#5686A5',
  Batchfile: '#C1F12E',
};

/** 色点所在的两个底：浅色模式卡片偏白，深色模式卡片 #111827 */
export const DOT_BG = { light: '#ffffff', dark: '#111827' };

/** 未收录语言的回落色（中性灰，两种模式下都看得见） */
export const FALLBACK_COLOR = '#94a3b8';

/** 深色模式下的可见性下限 */
const DARK_MIN_CONTRAST = 2.2;

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

function parseHex(hex) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(rgb) {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [high, low] = la > lb ? [la, lb] : [lb, la];
  return (high + 0.05) / (low + 0.05);
}

/**
 * 把颜色朝「远离背景」的方向按 1% 步长推移，直到对比度达标；达标就原样返回。
 */
export function ensureContrast(color, background, target = 3) {
  if (contrastRatio(color, background) >= target) return toHex(parseHex(color));

  const base = parseHex(color);
  const towards = luminance(background) > 0.5 ? BLACK : WHITE;
  for (let step = 1; step <= 100; step += 1) {
    const ratio = step / 100;
    const mixed = base.map((value, index) => value + (towards[index] - value) * ratio);
    const candidate = toHex(mixed);
    if (contrastRatio(candidate, background) >= target) return candidate;
  }
  return toHex(towards);
}

/** 返回某个语言在浅色 / 深色两种模式下使用的色点颜色 */
export function languageDot(language) {
  const base = LANG_COLORS[language] ?? FALLBACK_COLOR;
  return {
    light: toHex(parseHex(base)),
    dark: ensureContrast(base, DOT_BG.dark, DARK_MIN_CONTRAST),
  };
}
