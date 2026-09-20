export const LANGUAGES = [
  {code:'en',name:'English'}, {code:'fr',name:'Français'},
  {code:'ko',name:'한국어'}, {code:'zh-CN',name:'简体中文'},
  {code:'zh-TW',name:'繁體中文'}, {code:'ru',name:'Русский'},
  {code:'ja',name:'日本語'}, {code:'tr',name:'Türkçe'},
  {code:'es',name:'Español'},
];
let language = 'en';
let messages = {};
const cache = new Map();
export function getLanguage() { return language; }
export async function initI18n() {
  const saved = globalThis.chrome?.storage?.local
    ? (await chrome.storage.local.get('tabfoldLanguage')).tabfoldLanguage : 'en';
  language = LANGUAGES.some(item => item.code === saved) ? saved : 'en';
  if (language === 'en') { messages = {}; return language; }
  if (!cache.has(language)) {
    try {
      const response = await fetch(new URL(`./locales/${language}.json`, import.meta.url));
      if (!response.ok) throw new Error('Locale unavailable');
      cache.set(language, await response.json());
    } catch { cache.set(language, {}); }
  }
  messages = cache.get(language);
  return language;
}
export function t(source, values = {}) {
  const text = messages[source] || source;
  return text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}
export async function setLanguage(code) {
  if (!LANGUAGES.some(item => item.code === code)) throw new Error('Unsupported language');
  await chrome.storage.local.set({tabfoldLanguage:code});
  return initI18n();
}
export function applyI18n(root = document) {
  document.documentElement.lang = language;
  for (const element of root.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const [attribute, target] of [['data-i18n-placeholder','placeholder'], ['data-i18n-title','title'], ['data-i18n-label','aria-label']]) {
    for (const element of root.querySelectorAll(`[${attribute}]`)) element.setAttribute(target,t(element.getAttribute(attribute)));
  }
}
