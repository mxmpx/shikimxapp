/**
 * Shikimori MX - i18n Translation Engine
 * All translation values are stored exclusively in translations.txt.
 * No translation strings or dictionaries are hardcoded in JavaScript files.
 */

const LANGUAGE_KEY = 'app_language';
const TRANSLATIONS_TXT_CACHE_KEY = 'shikimx_translations_txt_data';
let currentLanguage = 'ru';
window.TRANSLATIONS = { ru: {}, en: {} };

/**
 * Parse plain-text translation dictionary format:
 * [ru]
 * key = value
 * [en]
 * key = value
 */
function parseTranslationsText(text) {
    const result = { ru: {}, en: {} };
    if (!text || typeof text !== 'string') return result;
    let currentSection = 'ru';
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;
        if (line.startsWith('[') && line.endsWith(']')) {
            const sec = line.slice(1, -1).toLowerCase().trim();
            if (sec === 'ru' || sec === 'en') {
                currentSection = sec;
            }
            continue;
        }
        const eqIndex = line.indexOf('=');
        if (eqIndex !== -1) {
            const key = line.slice(0, eqIndex).trim();
            const val = line.slice(eqIndex + 1).trim();
            if (key) {
                result[currentSection][key] = val;
            }
        }
    }
    return result;
}

// Immediate synchronous initialization from localStorage cache (ensures instant rendering with 0 delay)
try {
    const cachedTxt = localStorage.getItem(TRANSLATIONS_TXT_CACHE_KEY);
    if (cachedTxt) {
        window.TRANSLATIONS = parseTranslationsText(cachedTxt);
    }
} catch (e) {}

/**
 * Asynchronously fetch translations.txt and update memory & local storage
 */
async function loadTranslationsFromTxt() {
    try {
        const v = (typeof window.APP_VERSION !== 'undefined' && window.APP_VERSION) ? window.APP_VERSION : ((typeof window.ASSET_VERSION !== 'undefined' && window.ASSET_VERSION) ? window.ASSET_VERSION : '');
        const res = await fetch('/translations.txt' + (v ? ('?v=' + v) : ''));
        if (res.ok) {
            const text = await res.text();
            window.TRANSLATIONS = parseTranslationsText(text);
            try {
                localStorage.setItem(TRANSLATIONS_TXT_CACHE_KEY, text);
            } catch (e) {}
            applyTranslations();
            updateLanguageButton();
            if (typeof updateDesktopMenuBadges === 'function') updateDesktopMenuBadges();
            if (typeof updateMobileProfileBadges === 'function') updateMobileProfileBadges();
        }
    } catch (err) {
        console.debug('translations.txt fetch note:', err);
    }
}

function getSavedLanguage() {
    try {
        return localStorage.getItem(LANGUAGE_KEY) || 'ru';
    } catch (err) {
        return 'ru';
    }
}

function saveLanguage(lang) {
    try {
        localStorage.setItem(LANGUAGE_KEY, lang);
    } catch (err) {
        console.error('Ошибка сохранения языка:', err);
    }
    // Save to SQLite DB for user session
    fetch('/api/settings/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
    }).catch(() => {});
}

async function syncLanguageFromDB() {
    try {
        const res = await fetch('/api/settings/language');
        if (res.ok) {
            const data = await res.json();
            const dbLang = data.language || data.value;
            if (dbLang && (dbLang === 'ru' || dbLang === 'en')) {
                const localLang = localStorage.getItem(LANGUAGE_KEY);
                if (localLang !== dbLang) {
                    localStorage.setItem(LANGUAGE_KEY, dbLang);
                    currentLanguage = dbLang;
                    applyTranslations();
                    updateLanguageButton();
                    if (typeof updateDesktopMenuBadges === 'function') updateDesktopMenuBadges();
                    if (typeof updateMobileProfileBadges === 'function') updateMobileProfileBadges();
                }
            }
        }
    } catch (e) {}
}

function t(key, fallback) {
    if (!key) return fallback !== undefined ? fallback : '';
    const lang = getSavedLanguage();
    const dict = (window.TRANSLATIONS && window.TRANSLATIONS[lang]) || (window.TRANSLATIONS && window.TRANSLATIONS['ru']) || {};
    if (dict[key] !== undefined && dict[key] !== '') return dict[key];

    // Fallback check in Russian section
    if (window.TRANSLATIONS && window.TRANSLATIONS['ru'] && window.TRANSLATIONS['ru'][key] !== undefined && window.TRANSLATIONS['ru'][key] !== '') {
        return window.TRANSLATIONS['ru'][key];
    }
    return fallback !== undefined ? fallback : key;
}

window.t = t;
window.i18n = t;

function applyTranslations() {
    const lang = getSavedLanguage();
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const translation = t(key);
        if (translation && translation !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        const translation = t(key);
        if (translation && translation !== key) {
            el.title = translation;
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const translation = t(key);
        if (translation && translation !== key) {
            el.placeholder = translation;
        }
    });
}

function toggleLanguage() {
    const current = getSavedLanguage();
    const next = current === 'ru' ? 'en' : 'ru';
    saveLanguage(next);
    currentLanguage = next;
    applyTranslations();
    updateLanguageButton();
    window.location.reload();
}

function updateLanguageButton() {
    const btn = document.getElementById('lang-toggle-btn');
    if (!btn) return;
    const lang = getSavedLanguage();
    const label = btn.querySelector('.lang-label');
    if (label) {
        label.textContent = lang === 'ru' ? 'RU' : 'EN';
    }
    btn.title = lang === 'ru' ? 'Switch to English' : 'Переключить на русский';
}

// Auto-initialize
currentLanguage = getSavedLanguage();
loadTranslationsFromTxt();

document.addEventListener('DOMContentLoaded', () => {
    currentLanguage = getSavedLanguage();
    applyTranslations();
    updateLanguageButton();
    syncLanguageFromDB();
});
