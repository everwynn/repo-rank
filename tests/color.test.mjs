import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DOT_BG,
  FALLBACK_COLOR,
  LANG_COLORS,
  contrastRatio,
  ensureContrast,
  languageDot,
} from '../scripts/lib/color.mjs';

const DEV_LANGUAGES = [
  'Go', 'Rust', 'TypeScript', 'Python', 'JavaScript', 'Java',
  'C++', 'C#', 'C', 'Swift', 'Kotlin', 'PHP', 'Ruby', 'Dart', 'Scala', 'Zig',
];

test('16 个开发语言全部有配色', () => {
  for (const language of DEV_LANGUAGES) {
    assert.ok(LANG_COLORS[language], `${language} 缺少配色`);
  }
});

test('浅色模式直接用官方原色，不做压暗', () => {
  assert.equal(languageDot('JavaScript').light, '#f1e05a');
  assert.equal(languageDot('Go').light, '#00add8');
  assert.equal(languageDot('Python').light, '#3572a5');
});

test('深色模式每个色点都不低于 2.2:1 的可见性下限', () => {
  for (const language of Object.keys(LANG_COLORS)) {
    const dark = languageDot(language).dark;
    const ratio = contrastRatio(dark, DOT_BG.dark);
    assert.ok(ratio >= 2.2, `${language} 深色对比度 ${ratio.toFixed(2)}`);
  }
});

test('深色底上会消失的深色会被提亮，浅色保持不变', () => {
  assert.notEqual(languageDot('Lua').dark, '#000080');
  assert.notEqual(languageDot('PowerShell').dark, '#012456');
  // 本来就亮的颜色在深色底上不动
  assert.equal(languageDot('JavaScript').dark, '#f1e05a');
});

test('未知语言回落到中性灰', () => {
  assert.deepEqual(languageDot('Fluent'), { light: FALLBACK_COLOR, dark: FALLBACK_COLOR });
});

test('无语言（undefined）不会崩', () => {
  assert.deepEqual(languageDot(undefined), { light: FALLBACK_COLOR, dark: FALLBACK_COLOR });
});

test('对比度计算符合 WCAG 已知值', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrastRatio('#ffffff', '#ffffff').toFixed(2), '1.00');
});

test('达标的颜色原样返回，不达标才推移', () => {
  assert.equal(ensureContrast('#701516', DOT_BG.light), '#701516');
  assert.notEqual(ensureContrast('#000080', DOT_BG.dark, 2.2), '#000080');
});
