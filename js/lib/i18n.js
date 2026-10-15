// Page language comes from <html lang>. The English page lives at the site root and the
// Chinese page at zh/, so every asset URL is resolved against this module, not the page.
// Split names (test-seen / test-unseen) and metric names (SR, OSR, SPL, NE) stay in
// English on both pages, as in the paper.
export const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
export const zh = lang === 'zh';

// t('English', '中文'): pick the string for the current page.
// zh only: keep a number with its unit / measure word, and 表/图/式/第 with its number.
const GLUE = /([\d%]) (?=(?:ms|s|m|pp|个|步|次|条|页|层|头|轮|类|项|帧|倍)(?![A-Za-z]))|([表图式第]) (?=\d)/g;
const glue = (s) => s.replace(GLUE, (m, a, b) => `${a ?? b}\u00a0`);
export const t = (en, cn) => (zh && cn != null ? glue(cn) : en);

export const asset = (p) => new URL(`../../assets/${p}`, import.meta.url).href;
