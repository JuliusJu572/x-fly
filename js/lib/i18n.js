// Page language comes from <html lang>. The English page lives at the site root and the
// Chinese page at zh/, so every asset URL is resolved against this module, not the page.
// Split names (test-seen / test-unseen) and metric names (SR, OSR, SPL, NE) stay in
// English on both pages, as in the paper.
export const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
export const zh = lang === 'zh';

// t('English', '中文'): pick the string for the current page.
export const t = (en, cn) => (zh && cn != null ? cn : en);

export const asset = (p) => new URL(`../../assets/${p}`, import.meta.url).href;
