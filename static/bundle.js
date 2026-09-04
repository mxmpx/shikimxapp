/* --- js/logger.js --- */
(function (global) {
    'use strict';

    const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };

    class ApiError extends Error {
        constructor(message, status, data = null) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.data = data;
        }
    }

    const AppLogger = {
        _minLevel: LEVELS[localStorage.getItem('logLevel') || 'debug'] ?? LEVELS.debug,

        setLevel(level) {
            if (LEVELS[level] === undefined) return;
            this._minLevel = LEVELS[level];
            localStorage.setItem('logLevel', level);
            this.info('logger', `Log level set to "${level}"`);
        },

        _emit(level, module, args) {
            if (LEVELS[level] < this._minLevel) return;
            const prefix = `[ShikiMX:${module}]`;
            const fn = level === 'error'
                ? console.error
                : level === 'warn'
                    ? console.warn
                    : level === 'info'
                        ? console.info
                        : console.debug;
            fn(prefix, ...args);
        },

        debug(module, ...args) { this._emit('debug', module, args); },
        info(module, ...args) { this._emit('info', module, args); },
        warn(module, ...args) { this._emit('warn', module, args); },

        error(module, err, context = null) {
            const message = err instanceof Error ? err.message : String(err);
            const payload = context ? [message, context] : [message];
            if (err instanceof Error && err !== message) payload.push(err);
            this._emit('error', module, payload);
        },
    };

    async function apiFetch(url, options = {}) {
        const module = options.module || 'api';
        const fetchOptions = { ...options };
        delete fetchOptions.module;
        delete fetchOptions.silent;

        const method = (fetchOptions.method || 'GET').toUpperCase();
        const start = performance.now();

        AppLogger.debug(module, `${method} ${url}`);

        let response;
        try {
            response = await fetch(url, fetchOptions);
        } catch (err) {
            AppLogger.error(module, err, { url, method, phase: 'network' });
            throw err;
        }

        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (parseErr) {
                AppLogger.warn(module, `Invalid JSON response from ${url}`, parseErr);
            }
        } else if (!response.ok) {
            try {
                data = { error: await response.text() };
            } catch (_) {
                data = null;
            }
        }

        const elapsed = Math.round(performance.now() - start);

        if (!response.ok) {
            const message = (data && data.error) || `HTTP ${response.status}`;
            if (!options.silent) {
                AppLogger.warn(module, `${method} ${url} → ${response.status} (${elapsed}ms)`, message);
            }
            throw new ApiError(message, response.status, data);
        }

        AppLogger.debug(module, `${method} ${url} → ${response.status} (${elapsed}ms)`);
        return data;
    }

    function showFetchError(container, err, fallback = 'Ошибка загрузки') {
        const message = err instanceof ApiError
            ? err.message
            : (err && err.message) || fallback;

        AppLogger.error('ui', err instanceof Error ? err : new Error(message), { fallback });

        if (container) {
            container.innerHTML = `<p style="color: var(--danger); margin: 0;">${message}</p>`;
        }
        return message;
    }

    function showModalError(body, err, fallback = 'Ошибка загрузки') {
        const message = showFetchError(null, err, fallback);
        if (body) {
            body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${message}</div>`;
        }
        return message;
    }

    window.addEventListener('unhandledrejection', (event) => {
        AppLogger.error('global', event.reason || new Error('Unhandled promise rejection'), {
            type: 'unhandledrejection',
        });
    });

    window.addEventListener('error', (event) => {
        AppLogger.error('global', event.error || new Error(event.message), {
            type: 'error',
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
        });
    });

    global.AppLogger = AppLogger;
    global.ApiError = ApiError;
    global.apiFetch = apiFetch;
    global.showFetchError = showFetchError;
    global.showModalError = showModalError;

    AppLogger.info('logger', 'Initialized', { level: localStorage.getItem('logLevel') || 'debug' });
})(window);

;
/* --- js/translations.js --- */
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

;
/* --- js/core.js --- */
const tabLoaded = {};
let cachedHistoryData = null;
let ratesDataCache = [];
let loaderGridBuilt = false;
let loaderPulseTimer = null;

function buildLoaderGrid() {
    if (window.innerWidth <= 768) return; // Desktop only
    const grid = document.querySelector('.loader-grid');
    if (!grid) return;

    const cellPx = 48;
    const cols = Math.min(Math.max(Math.floor(window.innerWidth / cellPx), 10), 38);
    const rows = Math.min(Math.max(Math.floor(window.innerHeight / cellPx), 6), 24);

    let html = '';
    const total = cols * rows;
    for (let i = 0; i < total; i++) {
        const grade = Math.floor(Math.random() * 12 - 6);
        const opacity = (Math.random() * 0.25).toFixed(2);
        const hue = (240 + Math.floor(Math.random() * 95)) % 360;
        html += `<div style="--grade: ${grade}; --opacity: ${opacity}; --hue: ${hue};">+</div>`;
    }
    grid.innerHTML = html;
    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--rows', rows);
    loaderGridBuilt = true;

    grid.onpointermove = (e) => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && el.parentElement === grid) {
            el.setAttribute('data-hover', 'true');
            setTimeout(() => el.removeAttribute('data-hover'), 300);
        }
    };
}

function startLoaderGridPulse() {
    stopLoaderGridPulse();
    const grid = document.querySelector('.loader-grid');
    if (!grid || window.innerWidth <= 768) return;

    loaderPulseTimer = setInterval(() => {
        const items = grid.children;
        if (!items || !items.length) return;
        const count = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const idx = Math.floor(Math.random() * items.length);
            const item = items[idx];
            if (item) {
                item.setAttribute('data-hover', 'true');
                setTimeout(() => item.removeAttribute('data-hover'), 450 + Math.random() * 400);
            }
        }
    }, 160);
}

function stopLoaderGridPulse() {
    if (loaderPulseTimer) {
        clearInterval(loaderPulseTimer);
        loaderPulseTimer = null;
    }
}

function showLoader() {
    if (window.innerWidth <= 768 || document.body.classList.contains('mobile-view') || !!document.querySelector('.mobile-bottom-nav')) return;
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.remove('hidden');
        if (!loaderGridBuilt) buildLoaderGrid();
        startLoaderGridPulse();
    }
}

function hideLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.add('hidden');
    stopLoaderGridPulse();
}

window.addEventListener('DOMContentLoaded', () => {
    buildLoaderGrid();
    startLoaderGridPulse();
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        buildLoaderGrid();
    }
});

window.addEventListener('load', () => setTimeout(hideLoader, 400));

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
    if (typeof updateDesktopMenuBadges === 'function') updateDesktopMenuBadges();
    if (typeof updateMobileProfileBadges === 'function') updateMobileProfileBadges();
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
}

function buildImgUrl(src, highRes = false) {
    if (!src) return '';
    if (typeof src === 'string') {
        if (src.startsWith('data:')) return src;
        if (src.startsWith('/cache/img') || src.startsWith('/static/')) return src;
        if (src.includes('missing_original') || src.includes('missing_preview')) return '';
    }
    let path = '';
    if (typeof src === 'object' && src !== null) {
        if (highRes) {
            path = src.original || src.x160 || src.main || src.preview || '';
        } else {
            path = src.x160 || src.preview || src.main || src.original || '';
        }
    } else {
        path = String(src);
    }
    if (!path || path === 'None' || path === '{}') return '';
    if (path.includes('missing_original') || path.includes('missing_preview')) return '';

    if (highRes) {
        path = path.replace(/\/(x64|x32|preview)\//, '/original/');
    }

    if (path.startsWith('/cache/img') || path.startsWith('/static/')) return path;

    const fullUrl = path.startsWith('http') ? path : 'https://shikimori.io' + (path.startsWith('/') ? path : '/' + path);
    return fullUrl;
}


function setupSectionLazyLoader(target, callback, rootMargin = '250px') {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;

    if (el.classList.contains('hidden') || el.style.display === 'none') {
        return;
    }

    if (!('IntersectionObserver' in window)) {
        callback();
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                obs.unobserve(entry.target);
                callback();
            }
        });
    }, { rootMargin });

    observer.observe(el);
}
window.setupSectionLazyLoader = setupSectionLazyLoader;

function updateHeaderActiveTab(tabId) {
    const tabMap = {
        'profile': { labelKey: 'tab.profile', defaultLabel: 'Главная', icon: 'ti ti-home' },
        'rates': { labelKey: 'tab.rates', defaultLabel: 'Списки', icon: 'ti ti-list-check' },
        'favourites': { labelKey: 'tab.favourites', defaultLabel: 'Избранное', icon: 'ti ti-heart' },
        'friends': { labelKey: 'tab.friends', defaultLabel: 'Друзья', icon: 'ti ti-users' },
        'history': { labelKey: 'tab.history', defaultLabel: 'История', icon: 'ti ti-history' },
        // База данных
        'catalog-anime': { labelKey: 'tab.anime', defaultLabel: 'Аниме', icon: 'ti ti-player-play' },
        'top100': { labelKey: 'tab.top100', defaultLabel: 'Топ 100', icon: 'ti ti-trophy' },
        'catalog-manga': { labelKey: 'tab.manga', defaultLabel: 'Манга', icon: 'ti ti-book-2' },
        'catalog-ranobe': { labelKey: 'tab.ranobe', defaultLabel: 'Ранобэ', icon: 'ti ti-notebook' },
        // Сообщество
        'forum': { labelKey: 'tab.forum', defaultLabel: 'Форум', icon: 'ti ti-messages' },
        'clubs': { labelKey: 'tab.clubs', defaultLabel: 'Клубы', icon: 'ti ti-circles-relation' },
        'collections': { labelKey: 'tab.collections', defaultLabel: 'Коллекции', icon: 'ti ti-layout-grid' },
        'critiques': { labelKey: 'tab.critiques', defaultLabel: 'Рецензии', icon: 'ti ti-pencil' },
        'articles': { labelKey: 'tab.articles', defaultLabel: 'Статьи', icon: 'ti ti-file-text' },
        'users': { labelKey: 'tab.users', defaultLabel: 'Пользователи', icon: 'ti ti-user' },
        // Разное
        'recommendations': { labelKey: 'tab.recommendations', defaultLabel: 'Рекомендации', icon: 'ti ti-thumb-up' },
        'calendar': { labelKey: 'tab.calendar', defaultLabel: 'Календарь', icon: 'ti ti-calendar' }
    };

    const info = tabMap[tabId] || tabMap['profile'];
    const labelEl = document.getElementById('shiki-current-tab-label');
    const iconEl = document.getElementById('shiki-current-tab-icon');

    if (labelEl) {
        labelEl.dataset.i18n = info.labelKey;
        let translated = (typeof t === 'function') ? t(info.labelKey) : '';
        if (!translated || translated.startsWith('tab.') || translated === info.labelKey) {
            translated = info.defaultLabel;
        }
        labelEl.textContent = translated;
    }
    if (iconEl) {
        iconEl.className = `${info.icon} shiki-nav-icon`;
    }
}
window.updateHeaderActiveTab = updateHeaderActiveTab;

async function openTab(tabId) {
    if (!tabId) return;

    localStorage.setItem('activeTab', tabId);
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId || (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)));
    });

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');

    document.querySelectorAll(`.tab-btn[onclick*="'${tabId}'"]`).forEach(btn => btn.classList.add('active'));
    updateHeaderActiveTab(tabId);

    try {
        if (tabId === 'profile') {
            if (typeof syncContinueWatchingWithDB === 'function') {
                syncContinueWatchingWithDB();
            }
            setupSectionLazyLoader('explore-news-container', async () => {
                if (!tabLoaded['explore']) {
                    try {
                        const res = await fetch(`/api/tab/explore`);
                        const data = await res.json();
                        tabLoaded['explore'] = true;
                        renderExplore(data);
                    } catch (err) {
                        console.error('Ошибка загрузки новостей:', err);
                    }
                }
            }, '300px');
        } else if (tabId === 'catalog-anime') {
            if (!tabLoaded['catalog-anime'] && typeof loadCatalogAnimeTab === 'function') {
                loadCatalogAnimeTab(1);
                tabLoaded['catalog-anime'] = true;
            }
        } else if (tabId === 'top100') {
            if (!tabLoaded['top100'] && typeof loadTop100Tab === 'function') {
                loadTop100Tab('anime');
                tabLoaded['top100'] = true;
            }
        } else if (tabId === 'catalog-manga') {
            if (!tabLoaded['catalog-manga'] && typeof loadCatalogMangaTab === 'function') {
                loadCatalogMangaTab(1);
                tabLoaded['catalog-manga'] = true;
            }
        } else if (tabId === 'catalog-ranobe') {
            if (!tabLoaded['catalog-ranobe'] && typeof loadCatalogRanobeTab === 'function') {
                loadCatalogRanobeTab(1);
                tabLoaded['catalog-ranobe'] = true;
            }
        } else if (tabId === 'forum') {
            if (!tabLoaded['forum'] && typeof loadForumTab === 'function') {
                loadForumTab('all');
                tabLoaded['forum'] = true;
            }
        } else if (tabId === 'clubs') {
            if (!tabLoaded['clubs'] && typeof loadClubsTab === 'function') {
                loadClubsTab();
                tabLoaded['clubs'] = true;
            }
        } else if (tabId === 'collections') {
            if (!tabLoaded['collections'] && typeof loadCollectionsTab === 'function') {
                loadCollectionsTab();
                tabLoaded['collections'] = true;
            }
        } else if (tabId === 'critiques') {
            if (!tabLoaded['critiques'] && typeof loadCritiquesTab === 'function') {
                loadCritiquesTab();
                tabLoaded['critiques'] = true;
            }
        } else if (tabId === 'articles') {
            if (!tabLoaded['articles'] && typeof loadArticlesTab === 'function') {
                loadArticlesTab();
                tabLoaded['articles'] = true;
            }
        } else if (tabId === 'users') {
            if (!tabLoaded['users'] && typeof loadUsersTab === 'function') {
                loadUsersTab();
                tabLoaded['users'] = true;
            }
        } else if (tabId === 'recommendations') {
            if (!tabLoaded['recommendations'] && typeof loadRecommendationsTab === 'function') {
                loadRecommendationsTab();
                tabLoaded['recommendations'] = true;
            }
        } else if (tabId === 'calendar') {
            if (!tabLoaded['calendar'] && typeof loadFullCalendarTab === 'function') {
                loadFullCalendarTab();
                tabLoaded['calendar'] = true;
            }
        } else if (tabId === 'history' && cachedHistoryData) {
            renderHistory(cachedHistoryData);
            tabLoaded['history'] = true;
        } else if (tabLoaded[tabId]) {
            if (tabId === 'rates' && typeof renderRatesView === 'function') renderRatesView();
            else if (tabId === 'favourites' && typeof renderFavourites === 'function' && typeof cachedFavouritesData !== 'undefined' && cachedFavouritesData) renderFavourites(cachedFavouritesData);
            else if (tabId === 'history' && typeof renderHistory === 'function' && cachedHistoryData) renderHistory(cachedHistoryData);
        } else {
            showLoader();
            const res = await fetch(`/api/tab/${tabId}`);
            if (!res.ok) {
                if (res.status === 401 && activeContent) {
                    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
                    activeContent.innerHTML = `
                        <div class="card" style="text-align: center; padding: 40px 20px; max-width: 440px; margin: 30px auto; border-radius: 20px; border: 1px solid var(--card-border); background: var(--card-bg);">
                            <i class="ti ti-lock" style="font-size: 48px; color: var(--accent); margin-bottom: 12px; display: inline-block;"></i>
                            <h2 style="font-size: 20px; margin: 0 0 10px 0; color: var(--text-main);">${i18n('auth.required') || (isEn ? 'Authorization required' : 'Требуется авторизация')}</h2>
                            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">${isEn ? 'Log in via Shikimori to view your lists.' : 'Войдите через Shikimori, чтобы просматривать свои списки.'}</p>
                            <a href="/login" class="btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="ti ti-brand-shikimori"></i> <span>${i18n('login.via_shikimori') || (isEn ? 'Login with Shikimori' : 'Войти через Shikimori')}</span>
                            </a>
                        </div>
                    `;
                }
                return;
            }
            const data = await res.json();
            tabLoaded[tabId] = true;

            if (tabId === 'favourites') renderFavourites(data);
            else if (tabId === 'friends') renderFriends(data);
            else if (tabId === 'history') { cachedHistoryData = data; renderHistory(data); }
            else if (tabId === 'rates') { ratesDataCache = data; renderRatesView(); }
        }
    } catch (err) {
        console.error(`Ошибка загрузки вкладки ${tabId}:`, err);
        if (activeContent) activeContent.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки: ${err.message}</p>`;
    } finally {
        hideLoader();
    }
}
window.openTab = openTab;


async function syncAppVersion() {
    try {
        const res = await fetch('/api/about');
        const data = await res.json();

        if (data.version) {
            const dropdownVer = document.getElementById('dropdown-version');
            if (dropdownVer) dropdownVer.innerHTML = `<i class="ti ti-code"></i> Shiki MX v${data.version}`;

            const badgeVer = document.getElementById('about-badge-version');
            if (badgeVer) badgeVer.innerText = `v${data.version}`;
        }
        return data;
    } catch (err) {
        console.error('Ошибка получения версии приложения:', err);
        return null;
    }
}

async function openAboutModal() {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    try {
        const data = await syncAppVersion();
        if (!data) return;

        const descEl = document.getElementById('about-modal-desc');
        if (descEl && data.description) descEl.innerText = data.description;

        const featuresEl = document.getElementById('about-modal-features');
        if (featuresEl && data.features) {
            featuresEl.innerHTML = data.features.map(f => `<li><i class="ti ti-check"></i> ${f}</li>`).join('');
        }

        const stackEl = document.getElementById('about-modal-stack');
        if (stackEl && data.stack) {
            stackEl.innerHTML = data.stack.map(s => `<span class="search-tag">${s}</span>`).join('');
        }

        const changelogEl = document.getElementById('about-modal-changelog');
        if (changelogEl && Array.isArray(data.changelog)) {
            changelogEl.innerHTML = data.changelog.map(item => `
                <div class="changelog-item">
                    <div class="changelog-header">
                        <div class="changelog-title-wrap">
                            <span class="changelog-version">v${item.version}</span>
                            <span class="changelog-item-title">${item.title || ''}</span>
                        </div>
                        <span class="changelog-date">${item.date || ''}</span>
                    </div>
                    <ul class="changelog-changes">
                        ${(item.changes || []).map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Ошибка загрузки данных о сайте:', err);
    }
}

function closeAboutModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close-btn') && !event.target.parentElement.classList.contains('modal-close-btn')) return;
    const modal = document.getElementById('about-modal');
    if (modal) modal.classList.add('hidden');
}

// Toast Notification System
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    let icon = 'ti-info-circle';
    if (type === 'success') icon = 'ti-circle-check';
    else if (type === 'error') icon = 'ti-alert-circle';
    else if (type === 'warning') icon = 'ti-alert-triangle';

    toast.innerHTML = `
        <i class="ti ${icon} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
window.showToast = showToast;

// PWA Service Worker & Install Prompt
window.deferredPwaPrompt = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
            .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPwaPrompt = e;
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => btn.classList.remove('hidden'));
});

window.addEventListener('appinstalled', () => {
    window.deferredPwaPrompt = null;
    showToast(i18n('pwa.installed'), 'success');
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => btn.classList.add('hidden'));
});

function installPwaApp() {
    if (!window.deferredPwaPrompt) {
        showToast(i18n('pwa.install'), 'info');
        return;
    }
    window.deferredPwaPrompt.prompt();
    window.deferredPwaPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] User accepted install prompt');
        }
        window.deferredPwaPrompt = null;
    });
}
window.installPwaApp = installPwaApp;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    syncAppVersion();

    const savedTab = localStorage.getItem('activeTab') || 'profile';
    openTab(savedTab);

    // Ленивая загрузка карточек профиля только при попадании во вьюпорт
    setupSectionLazyLoader('recent-history-list', () => {
        if (typeof loadRecentHistory === 'function') loadRecentHistory();
    }, '250px');

    setupSectionLazyLoader('profile-friends-clubs-preview', () => {
        if (typeof loadProfileFriendsClubs === 'function') loadProfileFriendsClubs();
    }, '250px');

    if (typeof applyTranslations === 'function') applyTranslations();
    if (typeof updateLanguageButton === 'function') updateLanguageButton();

    // Ленивая подгрузка BBCode сеток (shiki-grid) только при скролле к ним
    document.querySelectorAll('.shiki-grid').forEach((grid) => {
        setupSectionLazyLoader(grid, async () => {
            const type = grid.dataset.type;
            const ids = grid.dataset.ids;
            if (!ids) return;

            try {
                const res = await fetch(`/api/grid-data?type=${type}&ids=${ids}`);
                const items = await res.json();
                if (!Array.isArray(items)) return;

                grid.innerHTML = items.map(item => {
                    const title = item.russian || item.name || '';
                    const imgUrl = buildImgUrl(item.image);
                    const itemUrl = item.url ? `https://shikimori.io${item.url}` : `https://shikimori.io/${type}/${item.id}`;
                    return `
                        <a href="${itemUrl}" target="_blank" class="shiki-grid-item" title="${title}">
                            <img src="${imgUrl}" alt="${title}" loading="lazy" decoding="async">
                            <div class="item-title">${title}</div>
                        </a>`;
                }).join('');
            } catch (err) {
                console.error('Ошибка загрузки сетки:', err);
            }
        }, '250px');
    });
});

/* ==========================================================================
   Быстрая навигация по разделам (Расписание, Контент, Темы дня, Новости)
   ========================================================================== */

let modalNewsPage = 1;
let modalCalendarDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

window.handleFriendsBack = function() {
    const friendsModal = document.getElementById('mobile-friends-modal');
    if (friendsModal) friendsModal.classList.add('hidden');
    if (typeof openMobileProfileMenu === 'function') {
        openMobileProfileMenu();
    }
};

window.handleStatsBack = function() {
    const statsModal = document.getElementById('mobile-stats-modal');
    if (statsModal) statsModal.classList.add('hidden');
    if (typeof openMobileProfileMenu === 'function') {
        openMobileProfileMenu();
    }
};

window.handleAboutBack = function() {
    const aboutModal = document.getElementById('about-modal');
    if (aboutModal) aboutModal.classList.add('hidden');
    if (window._openedFromSettings) {
        window._openedFromSettings = false;
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) settingsModal.classList.remove('hidden');
    }
};

window.openMobileSectionsMenu = function() {
    const modal = document.getElementById('mobile-sections-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    handleSectionsBack();
    if (typeof pushNavState === 'function') pushNavState();
};

window.closeMobileSectionsMenu = function(event) {
    if (event && event.target !== event.currentTarget && !event.target.closest('.modal-close-btn')) return;
    const modal = document.getElementById('mobile-sections-modal');
    if (modal) modal.classList.add('hidden');
};

window.handleSectionsBack = function() {
    const mainView = document.getElementById('sections-main-view');
    const detailView = document.getElementById('sections-detail-view');
    const backBtn = document.getElementById('mobile-sections-back-btn');
    const title = document.getElementById('mobile-sections-header-title');
    const icon = document.getElementById('mobile-sections-header-icon');

    if (mainView) mainView.classList.remove('hidden');
    if (detailView) detailView.classList.add('hidden');
    if (backBtn) {
        backBtn.classList.add('hidden');
        backBtn.style.setProperty('display', 'none', 'important');
    }
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (title) title.textContent = isEn ? 'Sections' : 'Разделы';
    if (icon) icon.className = 'ti ti-layout-grid mobile-sections-logo-icon';
};

window.openSectionDetail = async function(sectionKey) {
    const mainView = document.getElementById('sections-main-view');
    const detailView = document.getElementById('sections-detail-view');
    const detailContent = document.getElementById('sections-detail-content');
    const backBtn = document.getElementById('mobile-sections-back-btn');
    const title = document.getElementById('mobile-sections-header-title');
    const icon = document.getElementById('mobile-sections-header-icon');
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!detailView || !detailContent) return;

    if (mainView) mainView.classList.add('hidden');
    detailView.classList.remove('hidden');
    if (backBtn) {
        backBtn.classList.remove('hidden');
        backBtn.style.setProperty('display', 'inline-flex', 'important');
    }

    if (typeof pushNavState === 'function') pushNavState();

    detailContent.innerHTML = '<div class="loader" style="padding: 40px; text-align: center;"><i class="ti ti-loader animate-spin" style="font-size: 32px; color: var(--primary);"></i><p style="color: var(--text-muted); margin-top: 12px;">' + (isEn ? 'Loading...' : 'Загрузка...') + '</p></div>';

    if (sectionKey === 'calendar') {
        if (title) title.textContent = isEn ? 'Ongoing Schedule' : 'Расписание онгоингов';
        if (icon) icon.className = 'ti ti-calendar-event mobile-sections-logo-icon';
        await renderModalCalendar(modalCalendarDay);
    } else if (sectionKey === 'content') {
        if (title) title.textContent = isEn ? 'Content' : 'Контент';
        if (icon) icon.className = 'ti ti-grid-dots mobile-sections-logo-icon';
        await renderModalContent();
    } else if (sectionKey === 'hot') {
        if (title) title.textContent = isEn ? 'Hot Topics' : 'Темы дня';
        if (icon) icon.className = 'ti ti-flame mobile-sections-logo-icon';
        await renderModalHot();
    } else if (sectionKey === 'news') {
        if (title) title.textContent = isEn ? 'News' : 'Новости';
        if (icon) icon.className = 'ti ti-news mobile-sections-logo-icon';
        modalNewsPage = 1;
        await renderModalNews(1);
    }
};

async function renderModalCalendar(activeDay) {
    modalCalendarDay = activeDay;
    const detailContent = document.getElementById('sections-detail-content');
    if (!detailContent) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!window.calendarDataCache) {
        try {
            const res = await fetch('/api/calendar');
            window.calendarDataCache = await res.json();
        } catch(e) {
            detailContent.innerHTML = `<p style="color: var(--danger); padding: 20px;">${isEn ? 'Error loading calendar' : 'Ошибка загрузки календаря'}</p>`;
            return;
        }
    }

    const data = Array.isArray(window.calendarDataCache) ? window.calendarDataCache : [];
    const daysShort = isEn ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const filtered = data.filter(item => item.day_of_week === activeDay);

    detailContent.innerHTML = `
        <div class="calendar-days-tabs">
            ${daysShort.map((day, idx) => `
                <button type="button" class="cal-day-btn ${idx === activeDay ? 'active' : ''}" onclick="renderModalCalendar(${idx})">
                    <span>${day}</span>
                    ${idx === todayIndex ? '<span class="cal-today-dot" style="position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: currentColor;"></span>' : ''}
                </button>
            `).join('')}
        </div>
        <div class="calendar-items-grid">
            ${filtered.length > 0 ? filtered.map(item => {
                const title = (isEn && item.name) ? item.name : (item.russian || item.name || '');
                const safeTitle = title.replace(/"/g, '&quot;');
                const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
                const time = item.time_str ? item.time_str : '';
                const nextEp = item.next_episode ? (isEn ? `Ep ${item.next_episode}` : `${item.next_episode} эп.`) : '';

                return `
                    <div class="calendar-item-card" onclick="window._openedFromSections = 'calendar'; closeMobileSectionsMenu(); openAnimeModal(${item.id});" style="cursor: pointer;">
                        <div class="cal-thumb-wrap">
                            ${imgUrl ? `<img src="${imgUrl}" alt="${safeTitle}" class="cal-thumb" loading="lazy" decoding="async">` : `<div class="cal-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                            ${time ? `<span class="cal-time-badge"><i class="ti ti-clock"></i> ${time}</span>` : ''}
                            ${item.score ? `<span class="cal-score-badge"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                        </div>
                        <div class="cal-item-info">
                            <div class="cal-item-title" title="${safeTitle}">${title}</div>
                            <div class="cal-item-meta">
                                <span class="cal-next-ep">${nextEp}</span>
                                <span class="badge badge-watching" style="font-size: 10px;">${item.kind || 'TV'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') : `<p style="color: var(--text-muted); padding: 30px; text-align: center; grid-column: 1 / -1;">${isEn ? 'No scheduled episodes for this day' : 'В этот день нет запланированных серий'}</p>`}
        </div>
    `;
}
window.renderModalCalendar = renderModalCalendar;

async function renderModalContent() {
    const detailContent = document.getElementById('sections-detail-content');
    if (!detailContent) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    let exploreData = window._exploreDataCache;
    if (!exploreData) {
        try {
            const res = await fetch('/api/tab/explore');
            exploreData = await res.json();
            window._exploreDataCache = exploreData;
        } catch(e) {
            detailContent.innerHTML = `<p style="color: var(--danger); padding: 20px;">${isEn ? 'Error loading content' : 'Ошибка загрузки контента'}</p>`;
            return;
        }
    }

    const contentList = exploreData.content || [];
    const badgeMap = {
        'collection': isEn ? 'Collection' : 'Коллекция',
        'critique': isEn ? 'Critique' : 'Отзыв',
        'article': isEn ? 'Article' : 'Статья',
        'news': isEn ? 'News' : 'Новость',
        '': isEn ? 'Topic' : 'Тема'
    };

    detailContent.innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;">
            <a href="https://shikimori.io/collections" target="_blank" class="btn-secondary" style="padding: 6px 12px; font-size: 12.5px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="ti ti-folder"></i> ${isEn ? 'Collections' : 'Коллекции'}</a>
            <a href="https://shikimori.io/forum/critiques" target="_blank" class="btn-secondary" style="padding: 6px 12px; font-size: 12.5px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="ti ti-message-2"></i> ${isEn ? 'Critiques' : 'Отзывы'}</a>
            <a href="https://shikimori.io/articles" target="_blank" class="btn-secondary" style="padding: 6px 12px; font-size: 12.5px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="ti ti-article"></i> ${isEn ? 'Articles' : 'Статьи'}</a>
        </div>
        <div class="topics-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${contentList.length ? contentList.map(item => `
                <a href="${item.url}" target="_blank" class="topic-row-item" title="${(item.title || '').replace(/"/g, '&quot;')}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 16px; background: var(--card-bg); border: 1px solid var(--card-border); text-decoration: none; color: var(--text-main);">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; padding-right: 10px;">
                        <span style="font-size: 14px; font-weight: 500; line-height: 1.3;">${item.title}</span>
                        <span class="topic-badge badge-${(item.tag || '').toLowerCase()}" style="font-size: 11px; padding: 2px 6px; border-radius: 6px; align-self: flex-start; background: var(--primary-container); color: var(--on-primary-container);">${badgeMap[(item.tag || '').toLowerCase()] || (isEn ? 'Topic' : 'Тема')}</span>
                    </div>
                    <span style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; flex-shrink: 0;"><i class="ti ti-message-circle"></i> ${item.comments_count || 0}</span>
                </a>
            `).join('') : `<p style="color: var(--text-muted); padding: 20px; text-align: center;">${isEn ? 'No data' : 'Нет данных'}</p>`}
        </div>
    `;
}

async function renderModalHot() {
    const detailContent = document.getElementById('sections-detail-content');
    if (!detailContent) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    let exploreData = window._exploreDataCache;
    if (!exploreData) {
        try {
            const res = await fetch('/api/tab/explore');
            exploreData = await res.json();
            window._exploreDataCache = exploreData;
        } catch(e) {
            detailContent.innerHTML = `<p style="color: var(--danger); padding: 20px;">${isEn ? 'Error loading hot topics' : 'Ошибка загрузки тем дня'}</p>`;
            return;
        }
    }

    const hotList = exploreData.hot || [];
    detailContent.innerHTML = `
        <div class="topics-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${hotList.length ? hotList.map(item => `
                <a href="${item.url}" target="_blank" class="topic-row-item" title="${(item.title || '').replace(/"/g, '&quot;')}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 16px; background: var(--card-bg); border: 1px solid var(--card-border); text-decoration: none; color: var(--text-main);">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; padding-right: 10px;">
                        <span style="font-size: 14px; font-weight: 500; line-height: 1.3;">${item.title}</span>
                        ${item.author ? `<span style="font-size: 11.5px; color: var(--text-muted);"><i class="ti ti-user"></i> ${item.author}</span>` : ''}
                    </div>
                    <span style="font-size: 12px; color: #f87171; display: flex; align-items: center; gap: 4px; flex-shrink: 0; font-weight: 600;"><i class="ti ti-flame"></i> ${item.comments_count || 0}</span>
                </a>
            `).join('') : `<p style="color: var(--text-muted); padding: 20px; text-align: center;">${isEn ? 'No hot topics for today' : 'Нет горячих тем на сегодня'}</p>`}
        </div>
    `;
}

async function renderModalNews(page = 1) {
    const detailContent = document.getElementById('sections-detail-content');
    if (!detailContent) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (page === 1) {
        detailContent.innerHTML = `
            <div id="modal-news-cards-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
            <div style="text-align: center; margin: 16px 0 24px 0;">
                <button type="button" id="modal-load-more-news-btn" class="btn-secondary" style="padding: 10px 20px; border-radius: 14px; font-size: 13px; font-weight: 600;" onclick="loadMoreModalNews()">
                    <i class="ti ti-refresh"></i> ${isEn ? 'Load more news' : 'Загрузить ещё новости'}
                </button>
            </div>
        `;
    }

    const list = document.getElementById('modal-news-cards-list');
    const loadBtn = document.getElementById('modal-load-more-news-btn');
    if (loadBtn) loadBtn.disabled = true;

    try {
        const res = await fetch(`/api/news?page=${page}&limit=12`);
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
            const html = items.map(item => {
                const title = item.title || '';
                const img = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
                return `
                    <a href="${item.url}" target="_blank" class="news-item-card" style="display: flex; gap: 12px; padding: 12px; border-radius: 16px; background: var(--card-bg); border: 1px solid var(--card-border); text-decoration: none; color: var(--text-main);">
                        <div style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: var(--sub-bg); border: 1px solid var(--border-sub); display: flex; align-items: center; justify-content: center;">
                            ${img ? `<img src="${img}" alt="${title.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';"><div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); font-size: 24px;"><i class="ti ti-news"></i></div>` : `<i class="ti ti-news" style="color: var(--text-muted); font-size: 24px;"></i>`}
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0;">
                            <div style="font-size: 14px; font-weight: 600; line-height: 1.3; margin-bottom: 4px;">${title}</div>
                            <div style="display: flex; gap: 8px; font-size: 11.5px; color: var(--text-muted); flex-wrap: wrap;">
                                ${item.author ? `<span><i class="ti ti-user"></i> ${item.author}</span>` : ''}
                                ${item.date ? `<span><i class="ti ti-calendar"></i> ${item.date}</span>` : ''}
                            </div>
                        </div>
                    </a>
                `;
            }).join('');
            if (list) list.insertAdjacentHTML('beforeend', html);
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.style.display = (items.length < 12) ? 'none' : 'inline-flex';
            }
        } else {
            if (loadBtn) loadBtn.style.display = 'none';
        }
    } catch(e) {
        if (loadBtn) loadBtn.style.display = 'none';
    }
}

window.loadMoreModalNews = function() {
    modalNewsPage++;
    renderModalNews(modalNewsPage);
};

/* ==========================================================================
   Умная оптимизированная система навигации и возвращения между меню
   ========================================================================== */

window.pushNavState = function() {
    try {
        history.pushState({ appNav: true }, '');
    } catch(e) {}
};

window.AppNav = {
    back: function() {
        const playerModal = document.getElementById('mobile-watch-player-modal');
        if (playerModal && !playerModal.classList.contains('hidden')) {
            if (typeof handleMobilePlayerBack === 'function') {
                handleMobilePlayerBack();
                return true;
            }
        }

        const sectionsModal = document.getElementById('mobile-sections-modal');
        if (sectionsModal && !sectionsModal.classList.contains('hidden')) {
            const detailView = document.getElementById('sections-detail-view');
            if (detailView && !detailView.classList.contains('hidden')) {
                handleSectionsBack();
                return true;
            }
            closeMobileSectionsMenu();
            return true;
        }

        const friendsModal = document.getElementById('mobile-friends-modal');
        if (friendsModal && !friendsModal.classList.contains('hidden')) {
            handleFriendsBack();
            return true;
        }

        const statsModal = document.getElementById('mobile-stats-modal');
        if (statsModal && !statsModal.classList.contains('hidden')) {
            handleStatsBack();
            return true;
        }

        const aboutModal = document.getElementById('about-modal');
        if (aboutModal && !aboutModal.classList.contains('hidden')) {
            handleAboutBack();
            return true;
        }

        const animeModal = document.getElementById('anime-modal');
        if (animeModal && !animeModal.classList.contains('hidden')) {
            if (typeof popModalState === 'function' && window.modalStack && window.modalStack.length > 0) {
                popModalState();
                return true;
            }
            closeAnimeModal({ target: animeModal });
            return true;
        }

        const profileModal = document.getElementById('mobile-profile-modal');
        if (profileModal && !profileModal.classList.contains('hidden')) {
            closeMobileProfileMenu();
            return true;
        }

        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            if (typeof closeSettingsModal === 'function') closeSettingsModal();
            else settingsModal.classList.add('hidden');
            return true;
        }

        const headerSearch = document.getElementById('mobile-header-search');
        if (headerSearch && !headerSearch.classList.contains('hidden')) {
            if (typeof closeMobileSearch === 'function') closeMobileSearch();
            return true;
        }

        // 10. Если открыта вкладка списков/другая вкладка -> возврат на вкладку профиля/обзора
        const activeTab = localStorage.getItem('activeTab') || 'profile';
        if (activeTab !== 'profile') {
            if (typeof openTab === 'function') openTab('profile');
            return true;
        }

        return false;
    }
};

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        window.AppNav.back();
    }
});

window.addEventListener('popstate', function(e) {
    const handled = window.AppNav.back();
    if (handled) {
        try {
            history.pushState({ appNav: true }, '');
        } catch(err) {}
    }
});

/* ==================== DESKTOP HEADER MENU & SHORTCUTS ==================== */

window.toggleDesktopMainMenu = function(e) {
    if (e) e.stopPropagation();
    const mainWrap = document.getElementById('shiki-main-menu-wrap');
    const profileWrap = document.getElementById('shiki-profile-dropdown-wrap');
    if (profileWrap) profileWrap.classList.remove('open');
    if (mainWrap) mainWrap.classList.toggle('open');
};

window.toggleDesktopProfileMenu = function(e) {
    if (e) e.stopPropagation();
    const mainWrap = document.getElementById('shiki-main-menu-wrap');
    const profileWrap = document.getElementById('shiki-profile-dropdown-wrap');
    if (mainWrap) mainWrap.classList.remove('open');
    if (profileWrap) {
        profileWrap.classList.toggle('open');
        updateDesktopMenuBadges();
    }
};

window.closeDesktopDropdowns = function() {
    const mainWrap = document.getElementById('shiki-main-menu-wrap');
    const profileWrap = document.getElementById('shiki-profile-dropdown-wrap');
    if (mainWrap) mainWrap.classList.remove('open');
    if (profileWrap) profileWrap.classList.remove('open');
};

window.handleDesktopNavClick = function(tabId) {
    closeDesktopDropdowns();
    if (typeof openTab === 'function') {
        openTab(tabId);
    }
};

window.updateDesktopMenuBadges = function() {
    const theme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark';
    const themeBadge = document.getElementById('desktop-menu-theme-badge');
    const themeIcon = document.getElementById('desktop-menu-theme-icon');
    if (themeBadge) themeBadge.textContent = (theme === 'dark') ? (typeof i18n === 'function' ? i18n('theme.dark') : 'Тёмная') : (typeof i18n === 'function' ? i18n('theme.light') : 'Светлая');
    if (themeIcon) themeIcon.className = (theme === 'dark') ? 'ti ti-sun' : 'ti ti-moon';

    const lang = (typeof getSavedLanguage === 'function') ? getSavedLanguage() : (localStorage.getItem('app_language') || 'ru');
    const langBadge = document.getElementById('desktop-menu-lang-badge');
    if (langBadge) langBadge.textContent = (lang === 'en') ? 'EN' : 'RU';
};

// Global click outside to close desktop dropdowns & search results
document.addEventListener('click', function(e) {
    const mainWrap = document.getElementById('shiki-main-menu-wrap');
    const profileWrap = document.getElementById('shiki-profile-dropdown-wrap');
    const searchWrap = document.getElementById('desktop-search-wrap');
    const searchDropdown = document.getElementById('desktop-search-dropdown');

    if (mainWrap && !mainWrap.contains(e.target)) {
        mainWrap.classList.remove('open');
    }
    if (profileWrap && !profileWrap.contains(e.target)) {
        profileWrap.classList.remove('open');
    }
    if (searchWrap && !searchWrap.contains(e.target)) {
        if (searchDropdown) searchDropdown.classList.add('hidden');
    }
});

// Global Keyboard Shortcut: '/' to focus search, 'Escape' to blur & close
document.addEventListener('keydown', function(e) {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        const searchInput = document.getElementById('desktop-search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    } else if (e.key === 'Escape') {
        closeDesktopDropdowns();
        const searchDropdown = document.getElementById('desktop-search-dropdown');
        const searchInput = document.getElementById('desktop-search-input');
        if (searchDropdown) searchDropdown.classList.add('hidden');
        if (searchInput && document.activeElement === searchInput) {
            searchInput.blur();
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    updateDesktopMenuBadges();
});

;
/* --- js/anime.js --- */
// ==================== EVENT LISTENERS & MODAL HANDLERS ====================

document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    if (link.dataset.external === 'true') return;

    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    if (!href.includes('shikimori') && !href.startsWith('/')) return;

    const animeMatch = href.match(/shikimori\.(?:io|one|me)?\/animes\/(?:z|a)?(\d+)/) || href.match(/\/animes\/(?:z|a)?(\d+)/);
    if (animeMatch && animeMatch[1]) {
        e.preventDefault();
        openAnimeModal(animeMatch[1]);
        return;
    }

    const mangaMatch = href.match(/shikimori\.(?:io|one|me)?\/mangas\/(?:z|a)?(\d+)/) || href.match(/\/mangas\/(?:z|a)?(\d+)/);
    if (mangaMatch && mangaMatch[1]) {
        e.preventDefault();
        openMangaModal(mangaMatch[1]);
        return;
    }

    const charMatch = href.match(/shikimori\.(?:io|one|me)?\/characters\/(?:z|a)?(\d+)/) || href.match(/\/characters\/(?:z|a)?(\d+)/);
    if (charMatch && charMatch[1]) {
        e.preventDefault();
        openCharacterModal(charMatch[1]);
        return;
    }

    const userMatch = href.match(/shikimori\.(?:io|one|me)?\/users\/([^\/\?]+)/) || href.match(/\/users\/([^\/\?]+)/);
    const directUserMatch = !userMatch && href.match(/shikimori\.(?:io|one|me)\/([A-Za-z0-9_\-]+)\s*$/);
    const resolvedUser = userMatch || directUserMatch;
    if (resolvedUser && resolvedUser[1] && !['sign_in', 'sign_out', 'whoami', 'animes', 'mangas', 'characters', 'clubs', 'forum', 'api', 'oauth', 'about', 'topics', 'collections', 'reviews', 'contests', 'moderations', 'pages', 'terms'].includes(resolvedUser[1])) {
        e.preventDefault();
        openUserModal(resolvedUser[1]);
        return;
    }

    const clubMatch = href.match(/shikimori\.(?:io|one|me)?\/clubs\/(\d+)/) || href.match(/\/clubs\/(\d+)/);
    if (clubMatch && clubMatch[1]) {
        e.preventDefault();
        openClubModal(clubMatch[1]);
        return;
    }
});

window.modalStack = [];

function pushModalState() {
    const body = document.getElementById('anime-modal-body');
    if (!body || !body.innerHTML.trim() || body.querySelector('.anime-modal-loader')) return;

    const modalContent = body.closest('.modal-content') || body;
    const currentScroll = modalContent.scrollTop || body.scrollTop || window.scrollY || 0;
    const currentTitle = document.getElementById('mobile-anime-top-title')?.textContent || '';

    window.modalStack.push({
        html: body.innerHTML,
        scrollTop: currentScroll,
        title: currentTitle,
        openedFromSections: window._openedFromSections
    });

    if (typeof pushNavState === 'function') {
        pushNavState();
    }

    updateBackButtonVisibility();
}

function popModalState() {
    const body = document.getElementById('anime-modal-body');
    if (body && window.modalStack && window.modalStack.length > 0) {
        const state = window.modalStack.pop();
        if (typeof state === 'string') {
            body.innerHTML = state;
        } else if (state && state.html) {
            body.innerHTML = state.html;
            const modalContent = body.closest('.modal-content') || body;
            setTimeout(() => {
                modalContent.scrollTop = state.scrollTop || 0;
                body.scrollTop = state.scrollTop || 0;
            }, 10);
            if (state.openedFromSections) {
                window._openedFromSections = state.openedFromSections;
            }
        }
        updateBackButtonVisibility();
        return true;
    }
    return false;
}

window.pushModalState = pushModalState;
window.popModalState = popModalState;

function updateBackButtonVisibility() {
    const backBtn = document.querySelector('.modal-back-btn');
    if (backBtn) {
        backBtn.classList.toggle('visible', window.modalStack.length > 0);
    }
}

function handleModalBack() {
    const animeModal = document.getElementById('anime-modal');
    if (animeModal && !animeModal.classList.contains('hidden')) {
        if (!popModalState()) {
            closeAnimeModal({target: animeModal});
        }
        return;
    }

    const aboutModal = document.getElementById('about-modal');
    if (aboutModal && !aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden');
        document.body.style.overflow = '';
        if (window._openedFromSettings) {
            window._openedFromSettings = false;
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.classList.remove('hidden');
        }
        return;
    }

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && !settingsModal.classList.contains('hidden')) {
        settingsModal.classList.add('hidden');
        document.body.style.overflow = '';
        return;
    }
}

window.handleModalBack = handleModalBack;

async function openAnimeModal(animeId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    if (!modal.classList.contains('hidden') && body.innerHTML.trim() && !body.querySelector('.anime-modal-loader')) {
        pushModalState();
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('anime.loading') + '</div>';

    try {
        const res = await fetch(`/api/anime/${animeId}`);
        if (!res.ok) throw new Error(i18n('anime.load_error'));
        const anime = await res.json();
        renderAnimeDetail(anime);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('anime.load_error')}: ${err.message}</div>`;
    }
}
window.openAnimeModal = openAnimeModal;

function closeAnimeModal(e) {
    if (e && e.target) {
        const isOverlay = e.target.classList.contains('modal-overlay');
        const isCloseBtn = !!e.target.closest('.modal-close-btn');
        if (!isOverlay && !isCloseBtn) {
            return;
        }
    }
    const modal = document.getElementById('anime-modal');
    if (!modal) return;

    if (popModalState()) {
        return;
    }

    modal.classList.add('hidden');
    document.body.style.overflow = '';
    const player = document.getElementById('watch-player-container');
    if (player) {
        player.classList.add('hidden');
        player.innerHTML = '';
        player.dataset.playerType = '';
    }
    if (window._openedFromSections) {
        const prevSec = window._openedFromSections;
        window._openedFromSections = null;
        if (typeof openMobileSectionsMenu === 'function') openMobileSectionsMenu();
        if (typeof openSectionDetail === 'function') openSectionDetail(prevSec);
    }
}
window.closeAnimeModal = closeAnimeModal;

function getPlayerContainer() {
    if (window.innerWidth <= 768) {
        const mob = document.getElementById('mobile-watch-player-container');
        if (mob) return mob;
    }
    return document.getElementById('watch-player-container');
}

function toggleWatchPlayer(shikimoriPath, episode = 1) {
    const container = getPlayerContainer();
    if (!container || !shikimoriPath) return;

    if (!container.classList.contains('hidden') && container.dataset.playerType === 'shikimori') {
        container.classList.add('hidden');
        container.innerHTML = '';
        container.dataset.playerType = '';
        return;
    }

    const cleanPath = shikimoriPath.replace(/^https?:\/\/[^\/]+/, '').replace(/\/watch$/, '');
    let watchUrl = `https://shikimori.io${cleanPath}/watch`;
    
    if (episode && episode > 1) {
        watchUrl += `?episode=${episode}`;
    }

    container.classList.remove('hidden');
    container.dataset.playerType = 'shikimori';
    container.innerHTML = `
        <div class="watch-player-crop-wrapper">
            <iframe 
                src="${watchUrl}" 
                allowfullscreen 
                allow="autoplay; fullscreen; picture-in-picture">
            </iframe>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeMobileFullscreenPlayer() {
    const container = document.getElementById('mobile-watch-player-container');
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
        container.dataset.playerType = '';
        window.anicliEpisodesData = null;
        window.anicliSourcesFound = [];
    }
}
window.closeMobileFullscreenPlayer = closeMobileFullscreenPlayer;

async function toggleAnicliPlayer(title, episode = 1, animeId = 0) {
    const container = getPlayerContainer();
    if (!container) return;

    if (!container.classList.contains('hidden') && container.dataset.playerType === 'anicli') {
        container.classList.add('hidden');
        container.innerHTML = '';
        container.dataset.playerType = '';
        window.anicliEpisodesData = null;
        window.anicliSourcesFound = [];
        return;
    }

    container.classList.remove('hidden');
    container.dataset.playerType = 'anicli';

    const isMobile = window.innerWidth <= 768;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (isMobile) {
        container.innerHTML = `
            <div class="mobile-player-fullscreen-header">
                <button type="button" class="mobile-player-close-btn" onclick="handleMobilePlayerBack()" title="${isEn ? 'Back' : 'Назад'}">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <div class="mobile-player-fullscreen-title">
                    <div class="p-title">${title}</div>
                    <div class="p-sub" id="mobile-player-sub-title">Kodik • WinMedia</div>
                </div>
                <button type="button" class="mobile-player-close-btn" id="mobile-player-filter-btn" onclick="openMobileEpisodesFilterSheet()" title="${isEn ? 'Filter & Order' : 'Фильтр и порядок'}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <line x1="4" y1="6" x2="20" y2="6"></line>
                        <line x1="7" y1="12" x2="17" y2="12"></line>
                        <line x1="10" y1="18" x2="14" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div id="mobile-player-inner-content" class="mobile-player-inner-content">
                <div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ${i18n('anime.search_players')}</div>
            </div>
            <!-- Всплывающее меню фильтра и сортировки серий -->
            <div id="mobile-episodes-filter-sheet" class="mobile-episodes-filter-sheet hidden" onclick="if(event.target===this) closeMobileEpisodesFilterSheet();">
                <div class="mobile-episodes-filter-card" onclick="event.stopPropagation();">
                    <div class="filter-sheet-header">
                        <div class="filter-sheet-title">${isEn ? 'Filter & Order' : 'Фильтр и порядок'}</div>
                        <button type="button" class="filter-sheet-close-btn" onclick="closeMobileEpisodesFilterSheet()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div class="filter-sheet-section">
                        <div class="filter-sheet-label">${isEn ? 'Episodes filter' : 'Фильтр серий'}</div>
                        <div class="filter-sheet-chips">
                            <button type="button" class="filter-chip" id="filter-chip-all" onclick="setMobileEpFilter('all')">${isEn ? 'All' : 'Все'}</button>
                            <button type="button" class="filter-chip" id="filter-chip-unwatched" onclick="setMobileEpFilter('unwatched')">${isEn ? 'Unwatched' : 'Непросмотренные'}</button>
                            <button type="button" class="filter-chip" id="filter-chip-watched" onclick="setMobileEpFilter('watched')">${isEn ? 'Watched' : 'Просмотренные'}</button>
                        </div>
                    </div>

                    <div class="filter-sheet-section">
                        <div class="filter-sheet-label">${isEn ? 'Episode order' : 'Порядок серий'}</div>
                        <div class="filter-sheet-chips">
                            <button type="button" class="filter-chip" id="order-chip-asc" onclick="setMobileEpOrder(false)">${isEn ? 'Ascending (1 → N)' : 'По возрастанию (1 → N)'}</button>
                            <button type="button" class="filter-chip" id="order-chip-desc" onclick="setMobileEpOrder(true)">${isEn ? 'Descending (N → 1)' : 'По убыванию (N → 1)'}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.scrollTop = 0;
    } else {
        container.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('anime.search_players') + '</div>';
    }

    try {
        const res = await fetch(`/api/anime/${animeId}/anicli?title=${encodeURIComponent(title)}`);
        const data = await res.json();

        if (!res.ok || data.error) throw new Error(data.error || i18n('anime.load_error'));

        window.anicliEpisodesData = data.episodes || {};
        window.anicliSourcesFound = data.sources_found || [];
        
        if (isMobile) {
            const subTitleEl = document.getElementById('mobile-player-sub-title');
            if (subTitleEl) {
                subTitleEl.textContent = (window.anicliSourcesFound && window.anicliSourcesFound.length) ? window.anicliSourcesFound.join(' • ') : 'Kodik • WinMedia';
            }
        }

        const targetHost = isMobile ? (document.getElementById('mobile-player-inner-content') || container) : container;
        initAnicliPlayerUI(targetHost, episode);
    } catch (err) {
        const targetHost = isMobile ? (document.getElementById('mobile-player-inner-content') || container) : container;
        targetHost.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('anime.playback_error')}: ${err.message}</div>`;
    }
}

// ==================== SCREENSHOT LIGHTBOX ====================
let currentScreenshots = [];

let currentScreenshotIndex = 0;

function openScreenshotLightbox(index) {
    if (!currentScreenshots || !currentScreenshots.length) return;
    currentScreenshotIndex = index;

    let lightbox = document.getElementById('screenshot-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'screenshot-lightbox';
        lightbox.className = 'screenshot-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-backdrop" onclick="closeScreenshotLightbox()"></div>
            <button class="lightbox-close-btn" onclick="closeScreenshotLightbox()" title="${i18n('lightbox.close')}"><i class="ti ti-x"></i></button>
            <button class="lightbox-nav-btn lightbox-prev-btn" onclick="prevScreenshot(event)" title="${i18n('lightbox.prev')}"><i class="ti ti-chevron-left"></i></button>
            <div class="lightbox-content">
                <img id="lightbox-img" src="" alt="Screenshot" />
                <div id="lightbox-counter" class="lightbox-counter"></div>
            </div>
            <button class="lightbox-nav-btn lightbox-next-btn" onclick="nextScreenshot(event)" title="${i18n('lightbox.next')}"><i class="ti ti-chevron-right"></i></button>

        `;
        document.body.appendChild(lightbox);

        document.addEventListener('keydown', (e) => {
            const lb = document.getElementById('screenshot-lightbox');
            if (!lb || !lb.classList.contains('active')) return;
            if (e.key === 'Escape') closeScreenshotLightbox();
            if (e.key === 'ArrowLeft') prevScreenshot();
            if (e.key === 'ArrowRight') nextScreenshot();
        });
    }

    updateLightbox();
    lightbox.classList.add('active');
}

function updateLightbox() {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    if (img && currentScreenshots[currentScreenshotIndex]) {
        img.src = currentScreenshots[currentScreenshotIndex];
    }
    if (counter) {
        counter.textContent = `${currentScreenshotIndex + 1} / ${currentScreenshots.length}`;
    }
}

function closeScreenshotLightbox() {
    const lightbox = document.getElementById('screenshot-lightbox');
    if (lightbox) lightbox.classList.remove('active');
}

function prevScreenshot(e) {
    if (e) e.stopPropagation();
    if (currentScreenshotIndex > 0) {
        currentScreenshotIndex--;
    } else {
        currentScreenshotIndex = currentScreenshots.length - 1;
    }
    updateLightbox();
}

function nextScreenshot(e) {
    if (e) e.stopPropagation();
    if (currentScreenshotIndex < currentScreenshots.length - 1) {
        currentScreenshotIndex++;
    } else {
        currentScreenshotIndex = 0;
    }
    updateLightbox();
}

window.openScreenshotLightbox = openScreenshotLightbox;
window.closeScreenshotLightbox = closeScreenshotLightbox;
window.prevScreenshot = prevScreenshot;
window.nextScreenshot = nextScreenshot;

function saveWatchProgress(animeId, title, russian, poster, episode, translation, totalEpisodes) {

    if (!animeId) return;
    try {
        let list = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
        list = list.filter(item => item.id != animeId);
        const newItem = {
            id: animeId,
            title: title || '',
            russian: russian || title || '',
            image: poster || '',
            episode: Number(episode) || 1,
            translation: translation || '',
            total_episodes: totalEpisodes || 0,
            updated_at: new Date().toISOString()
        };
        list.unshift(newItem);
        list = list.slice(0, 20);
        localStorage.setItem('shikimx_continue_watching', JSON.stringify(list));

        // Отправляем запись в базу данных на сервере
        fetch('/api/continue_watching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        }).catch(err => console.warn('DB save continue watching error:', err));

        if (typeof renderContinueWatching === 'function') {
            renderContinueWatching();
        }

        // Запись в детальную историю просмотров (для вкладки История)
        let history = JSON.parse(localStorage.getItem('shikimx_watch_history') || '[]');
        history = history.filter(h => !(h.id == animeId && h.episode == (Number(episode) || 1)));
        history.unshift({
            id: animeId,
            title: title || '',
            russian: russian || title || '',
            image: poster || '',
            episode: Number(episode) || 1,
            translation: translation || 'WinMedia',
            progress_status: 'Просмотрено полностью',
            created_at: new Date().toISOString()
        });
        history = history.slice(0, 60);
        localStorage.setItem('shikimx_watch_history', JSON.stringify(history));
    } catch (e) {
        console.warn('Failed to save watch progress:', e);
    }
}
window.saveWatchProgress = saveWatchProgress;

function stepAnicliEpisode(delta) {
    if (typeof window.currentAnicliEp !== 'number') return;
    const availableEpNums = Object.keys(window.anicliEpisodesData || {}).map(Number).sort((a, b) => a - b);
    const currentIdx = availableEpNums.indexOf(window.currentAnicliEp);
    const nextIdx = currentIdx + delta;
    if (nextIdx < 0 || nextIdx >= availableEpNums.length) {
        showToast(delta > 0 ? 'Это последняя серия!' : 'Это первая серия!', 'info', 2000);
        return;
    }

    const nextEp = availableEpNums[nextIdx];
    const epData = window.anicliEpisodesData[nextEp.toString()];
    if (!epData) {
        onAnicliEpisodeChange(nextEp);
        return;
    }

    const currentDub = window.currentAnicliTrans;
    const currentPlayer = window.currentAnicliPlayerName;

    // 1. Проверяем наличие текущей озвучки в новой серии
    if (!currentDub || !epData[currentDub]) {
        // Озвучка не найдена в новой серии -> открываем выбор озвучки (Шаг 2)
        onAnicliEpisodeChange(nextEp);
        if (currentDub) {
            showToast(`Серия ${nextEp} не найдена в озвучке «${currentDub}». Выберите другую озвучку`, 'warning', 4000);
        }
        return;
    }

    // 2. Озвучка есть. Проверяем наличие того же источника (плеера)
    const availablePlayers = epData[currentDub];
    let matchedPlayer = null;

    if (currentPlayer && availablePlayers && availablePlayers.length) {
        // Точное совпадение
        matchedPlayer = availablePlayers.find(p => p.player === currentPlayer);

        // Если было Kodik #1, а в новой серии просто Kodik (или наоборот), сопоставляем по базовому имени
        if (!matchedPlayer) {
            const baseName = currentPlayer.replace(/\s*#\d+$/, '').trim().toLowerCase();
            matchedPlayer = availablePlayers.find(p => p.player.replace(/\s*#\d+$/, '').trim().toLowerCase() === baseName);
        }
    }

    // 3. Если источник найден -> сразу запускаем воспроизведение новой серии
    if (matchedPlayer) {
        window.currentAnicliEp = nextEp;
        document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === nextEp);
        });
        const epLbl = document.getElementById('wizard-ep-lbl');
        if (epLbl) epLbl.innerText = `(Серия ${nextEp})`;
        populateAnicliTranslations(nextEp);
        const transLbl = document.getElementById('wizard-trans-lbl');
        if (transLbl) transLbl.innerText = `(${currentDub})`;
        populateAnicliPlayers(nextEp, currentDub);

        onAnicliPlayerChange(matchedPlayer.url, null, matchedPlayer.player);
        showToast(`Серия ${nextEp} • ${currentDub} • ${matchedPlayer.player}`, 'info', 2000);
    } else {
        // Источник не найден -> открываем выбор источника (Шаг 3)
        window.currentAnicliEp = nextEp;
        document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === nextEp);
        });
        const epLbl = document.getElementById('wizard-ep-lbl');
        if (epLbl) epLbl.innerText = `(Серия ${nextEp})`;
        populateAnicliTranslations(nextEp);
        onAnicliTranslationChange(currentDub);

        showToast(`Источник «${currentPlayer || 'выбранный'}» не найден для ${nextEp} серии. Выберите другой источник`, 'warning', 4000);
    }
}
window.stepAnicliEpisode = stepAnicliEpisode;

function skipPlayerIntro() {
    showToast(i18n('player.skip_intro') + ' ⏩', 'info', 1800);
    const iframe = document.getElementById('anicli-iframe');
    if (iframe && iframe.contentWindow) {
        try {
            iframe.contentWindow.postMessage({ event: 'seek', value: 85 }, '*');
        } catch (e) {}
    }
}
window.skipPlayerIntro = skipPlayerIntro;

async function toggleFloatingMiniPlayer() {
    const iframe = document.getElementById('anicli-iframe') || document.querySelector('#watch-player-container iframe');
    if (!iframe || !iframe.src) {
        showToast(i18n('anime.no_players'), 'warning');
        return;
    }

    const currentSrc = iframe.src;
    const animeTitle = window.currentPlayingTitle || document.querySelector('.anime-title')?.textContent || 'Anime';
    const epNum = window.currentAnicliEp || '';
    const epText = epNum ? ` | Серия ${epNum}` : '';

    // 1. Настоящий системный PiP (Document Picture-in-Picture API) - виден поверх всех окон при свёрнутом браузере
    if ('documentPictureInPicture' in window) {
        try {
            if (window.pipWindowInstance && !window.pipWindowInstance.closed) {
                window.pipWindowInstance.close();
            }

            const pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 640,
                height: 360
            });
            window.pipWindowInstance = pipWindow;

            pipWindow.document.title = `${animeTitle}${epText} - PiP`;
            pipWindow.document.body.style.margin = '0';
            pipWindow.document.body.style.padding = '0';
            pipWindow.document.body.style.background = '#000';
            pipWindow.document.body.style.overflow = 'hidden';
            pipWindow.document.body.style.width = '100vw';
            pipWindow.document.body.style.height = '100vh';

            const pipIframe = document.createElement('iframe');
            pipIframe.src = currentSrc;
            pipIframe.style.width = '100%';
            pipIframe.style.height = '100%';
            pipIframe.style.border = 'none';
            pipIframe.allow = "autoplay; fullscreen; picture-in-picture";
            pipIframe.setAttribute('allowfullscreen', 'true');
            pipIframe.setAttribute('referrerpolicy', 'no-referrer');
            
            pipWindow.document.body.appendChild(pipIframe);

            showToast('Настоящий PiP открыт поверх всех окон! 📺', 'success');
            return;
        } catch (e) {
            console.warn('Document Picture-in-Picture failed:', e);
        }
    }

    // 2. Резервный HTML5 Video PiP (если доступен)
    try {
        if (document.pictureInPictureEnabled) {
            const video = iframe.contentDocument?.querySelector('video');
            if (video) {
                await video.requestPictureInPicture();
                showToast('PiP активирован!', 'info');
                return;
            }
        }
    } catch (e) {}

    // 3. Fallback: внутристраничный плавающий мини-плеер
    let miniPlayer = document.getElementById('floating-mini-player');
    if (!miniPlayer) {
        miniPlayer = document.createElement('div');
        miniPlayer.id = 'floating-mini-player';
        miniPlayer.className = 'floating-mini-player';
        document.body.appendChild(miniPlayer);
    }

    miniPlayer.innerHTML = `
        <div class="mini-player-header">
            <span class="mini-player-title" title="${animeTitle}">${animeTitle}${epText}</span>
            <div class="mini-player-controls">
                <button onclick="restoreFloatingMiniPlayer()" title="${i18n('player.restore')}"><i class="ti ti-arrows-maximize"></i></button>
                <button onclick="closeFloatingMiniPlayer()" title="${i18n('player.close')}"><i class="ti ti-x"></i></button>
            </div>
        </div>
        <div class="mini-player-body">
            <iframe src="${currentSrc}" allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe>
        </div>
    `;

    miniPlayer.classList.remove('hidden');
    closeAnimeModal();
    showToast(i18n('player.mini_player'), 'info');
}
window.toggleFloatingMiniPlayer = toggleFloatingMiniPlayer;

window.mobileEpFilter = 'all'; // 'all', 'unwatched', 'watched'
window.mobileEpisodesOrderDesc = false;

window.openMobileEpisodesFilterSheet = function() {
    if (window.currentAnicliStep !== 1) return;
    const sheet = document.getElementById('mobile-episodes-filter-sheet');
    if (sheet) {
        sheet.classList.remove('hidden');
        updateFilterSheetActiveClasses();
    }
};

window.closeMobileEpisodesFilterSheet = function() {
    const sheet = document.getElementById('mobile-episodes-filter-sheet');
    if (sheet) sheet.classList.add('hidden');
};

window.setMobileEpFilter = function(filter) {
    window.mobileEpFilter = filter;
    updateFilterSheetActiveClasses();
    renderMobileEpisodesList();
};

window.setMobileEpOrder = function(isDesc) {
    window.mobileEpisodesOrderDesc = isDesc;
    updateFilterSheetActiveClasses();
    renderMobileEpisodesList();
};

function updateFilterSheetActiveClasses() {
    const fAll = document.getElementById('filter-chip-all');
    const fUnw = document.getElementById('filter-chip-unwatched');
    const fWat = document.getElementById('filter-chip-watched');
    if (fAll) fAll.classList.toggle('active', window.mobileEpFilter === 'all');
    if (fUnw) fUnw.classList.toggle('active', window.mobileEpFilter === 'unwatched');
    if (fWat) fWat.classList.toggle('active', window.mobileEpFilter === 'watched');

    const oAsc = document.getElementById('order-chip-asc');
    const oDesc = document.getElementById('order-chip-desc');
    if (oAsc) oAsc.classList.toggle('active', !window.mobileEpisodesOrderDesc);
    if (oDesc) oDesc.classList.toggle('active', !!window.mobileEpisodesOrderDesc);
}

function getFullyWatchedEpisodes(animeId) {
    try {
        const raw = localStorage.getItem(`shikimx_fully_watched_${animeId}`);
        return raw ? JSON.parse(raw) : [];
    } catch(e) {
        return [];
    }
}

function setFullyWatchedEpisodes(animeId, list) {
    try {
        localStorage.setItem(`shikimx_fully_watched_${animeId}`, JSON.stringify(list));
    } catch(e) {}
}

window.markEpisodeWatched = function(event, animeId, num) {
    if (event) event.stopPropagation();

    const list = getFullyWatchedEpisodes(animeId);
    if (!list.includes(num)) {
        list.push(num);
        setFullyWatchedEpisodes(animeId, list);
    }

    renderMobileEpisodesList();
    if (typeof showToast === 'function') {
        showToast(`Серия ${num}: просмотрено полностью`, 'success');
    }
};

window.unmarkEpisodeWatched = function(event, animeId, num) {
    if (event) event.stopPropagation();

    let list = getFullyWatchedEpisodes(animeId);
    list = list.filter(n => n !== num);
    setFullyWatchedEpisodes(animeId, list);

    renderMobileEpisodesList();
    if (typeof showToast === 'function') {
        showToast(`Отметка о серии ${num} снята`, 'info');
    }
};

function renderMobileEpisodesList() {
    const listContainer = document.getElementById('mobile-episodes-list-container');
    if (!listContainer) return;

    const episodes = window.anicliEpisodesData || {};
    let availableEpNums = Object.keys(episodes).map(Number).sort((a, b) => a - b);
    
    const animeId = window.currentPlayingAnimeId || 0;
    const userRate = window.currentPlayingUserRate || (window.currentPlayingAnimeData ? window.currentPlayingAnimeData.user_rate : null) || {};
    const shikimoriWatchedCount = parseInt(userRate.episodes || 0, 10);
    const fullyWatchedList = getFullyWatchedEpisodes(animeId);

    // 1. Фильтрация серий
    if (window.mobileEpFilter === 'unwatched') {
        availableEpNums = availableEpNums.filter(num => num > shikimoriWatchedCount);
    } else if (window.mobileEpFilter === 'watched') {
        availableEpNums = availableEpNums.filter(num => num <= shikimoriWatchedCount);
    }

    // 2. Сортировка порядка
    if (window.mobileEpisodesOrderDesc) {
        availableEpNums.reverse();
    }

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (!availableEpNums.length) {
        listContainer.innerHTML = `<div style="padding: 36px 16px; text-align: center; color: #888888; font-size: 14px;">${isEn ? 'No episodes found' : 'Серии не найдены'}</div>`;
        return;
    }

    listContainer.innerHTML = availableEpNums.map(num => {
        // ГАЛОЧКА: отображает статус просмотрено ли по данным из Shikimori (НЕ МЕНЯЕТСЯ ЗДЕСЬ!)
        const isWatchedOnShikimori = num <= shikimoriWatchedCount;

        // Отметка "Просмотрено полностью"
        const isFullyWatched = fullyWatchedList.includes(num);

        return `
            <div class="mobile-ep-row ${num === window.currentAnicliEp ? 'current-playing' : ''}" data-ep="${num}">
                <div class="mobile-ep-info" onclick="onAnicliEpisodeChange(${num})">
                    <div class="mobile-ep-title">${isEn ? 'Episode ' + num : 'Серия ' + num}</div>
                    ${isFullyWatched ? `<div class="mobile-ep-sub">${isEn ? 'Watched completely' : 'Просмотрено полностью'}</div>` : ''}
                </div>
                <div class="mobile-ep-actions">
                    <div class="mobile-ep-check ${isWatchedOnShikimori ? 'watched' : ''}">
                        ${isWatchedOnShikimori ? `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#181109" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ` : ''}
                    </div>
                    ${isFullyWatched ? `
                        <button type="button" class="mobile-ep-btn delete" onclick="unmarkEpisodeWatched(event, ${animeId}, ${num})" title="${isEn ? 'Remove watched mark' : 'Удалить отметку о просмотре'}">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#f09080">
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="3" y1="6" x2="21" y2="6" stroke="#f09080" stroke-width="2" stroke-linecap="round"></line>
                            </svg>
                        </button>
                    ` : `
                        <button type="button" class="mobile-ep-btn add" onclick="markEpisodeWatched(event, ${animeId}, ${num})" title="${isEn ? 'Mark as watched' : 'Отметить просмотренной'}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}
window.renderMobileEpisodesList = renderMobileEpisodesList;

function closeFloatingMiniPlayer() {
    const miniPlayer = document.getElementById('floating-mini-player');
    if (miniPlayer) {
        miniPlayer.classList.add('hidden');
        miniPlayer.innerHTML = '';
    }
}
window.closeFloatingMiniPlayer = closeFloatingMiniPlayer;

function restoreFloatingMiniPlayer() {
    closeFloatingMiniPlayer();
    if (window.currentPlayingAnimeId) {
        openAnimeModal(window.currentPlayingAnimeId);
    }
}
window.restoreFloatingMiniPlayer = restoreFloatingMiniPlayer;


function initAnicliPlayerUI(container, initialEpisode = 1) {
    const episodes = window.anicliEpisodesData;
    if (!episodes || !Object.keys(episodes).length) {
        container.innerHTML = '<div class="anime-error"><i class="ti ti-alert-circle"></i> ' + i18n('anime.no_players') + '</div>';
        return;
    }

    const availableEpNums = Object.keys(episodes).map(Number).sort((a, b) => a - b);
    window.currentAnicliEp = availableEpNums.includes(initialEpisode) ? initialEpisode : availableEpNums[0];
    window.currentAnicliTrans = null;
    const sourcesFound = window.anicliSourcesFound || [];
    const isMobile = window.innerWidth <= 768 || !!container.closest('#mobile-watch-player-container');

    container.innerHTML = `
        <div class="anicli-player-wrapper">
            ${(!isMobile && sourcesFound.length) ? `
                <div class="anicli-sources-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: var(--text-muted);">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span><i class="ti ti-circle-check" style="color: var(--success);"></i> ${i18n('anime.sources')}</span>
                        ${sourcesFound.map(s => `<span class="badge badge-watching" style="font-size: 10px; padding: 2px 8px;">${s}</span>`).join(' ')}
                    </div>
                </div>
            ` : ''}
            
            <div id="anicli-wizard" class="anicli-wizard-container">
                <!-- STEP 1: EPISODE -->
                <div class="anicli-step-container" id="anicli-step-1">
                    ${isMobile ? `
                        <div id="mobile-episodes-list-container" class="mobile-episodes-list-container"></div>
                    ` : `
                        <div class="anicli-step-title"><i class="ti ti-list-numbers"></i> ${isEn ? 'Step 1: Select episode' : 'Шаг 1: Выберите серию'}</div>
                        <div class="anicli-chip-list" id="anicli-ep-chips">
                            ${availableEpNums.map(num => `<div class="anicli-chip" data-ep="${num}" onclick="onAnicliEpisodeChange(${num})">${isEn ? 'Episode ' + num : num + ' серия'}</div>`).join('')}
                        </div>
                    `}
                </div>

                <!-- STEP 2: TRANSLATION -->
                <div class="anicli-step-container hidden" id="anicli-step-2">
                    ${isMobile ? `
                        <div id="mobile-trans-container" class="mobile-trans-container"></div>
                    ` : `
                        <div class="anicli-step-title" style="justify-content: space-between;">
                            <span><i class="ti ti-headphones"></i> ${isEn ? 'Step 2: Select voiceover' : 'Шаг 2: Выберите озвучку'} <span id="wizard-ep-lbl" style="opacity: 0.6; font-size: 12px; margin-left: 8px;"></span></span>
                            <button class="btn-secondary" style="padding: 2px 8px; font-size: 12px;" onclick="goToAnicliStep(1)"><i class="ti ti-arrow-left"></i> ${isEn ? 'Back' : 'Назад'}</button>
                        </div>
                        <div class="anicli-chip-list" id="anicli-trans-chips"></div>
                    `}
                </div>

                <!-- STEP 3: PLAYER -->
                <div class="anicli-step-container hidden" id="anicli-step-3">
                    ${isMobile ? `
                        <div id="mobile-players-container" class="mobile-players-container"></div>
                    ` : `
                        <div class="anicli-step-title" style="justify-content: space-between;">
                            <span><i class="ti ti-video"></i> ${isEn ? 'Step 3: Select source' : 'Шаг 3: Выберите источник'} <span id="wizard-trans-lbl" style="opacity: 0.6; font-size: 12px; margin-left: 8px;"></span></span>
                            <button class="btn-secondary" style="padding: 2px 8px; font-size: 12px;" onclick="goToAnicliStep(2)"><i class="ti ti-arrow-left"></i> ${isEn ? 'Back' : 'Назад'}</button>
                        </div>
                        <div class="anicli-chip-list" id="anicli-player-chips"></div>
                    `}
                </div>

                <!-- STEP 4: VIDEO (SEPARATE STEP) -->
                <div class="anicli-step-container hidden" id="anicli-step-4">
                    <div id="anicli-video-view">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="color: var(--text-main); font-size: 13px; font-weight: 600;" id="video-active-info"></div>
                            ${!isMobile ? `
                                <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="goToAnicliStep(1)"><i class="ti ti-settings"></i> ${isEn ? 'Change' : 'Изменить'}</button>
                            ` : ''}
                        </div>

                        <div class="watch-player-crop-wrapper" style="height: 480px; margin-bottom: 12px;">
                            <iframe 
                                id="anicli-iframe" 
                                src="" 
                                allowfullscreen 
                                referrerpolicy="no-referrer"
                                allow="autoplay; fullscreen; picture-in-picture"
                                style="width: 100%; height: 100%; border: none; border-radius: 8px; background: #000;">
                            </iframe>
                        </div>

                        <div class="player-quick-actions-bar">
                            <button type="button" class="btn-player-action" onclick="stepAnicliEpisode(-1)">
                                <i class="ti ti-player-skip-back"></i> <span data-i18n="player.prev_ep">${i18n('player.prev_ep')}</span>
                            </button>
                            <button type="button" class="btn-player-action btn-skip-intro" onclick="skipPlayerIntro()">
                                <i class="ti ti-player-track-next"></i> <span>${i18n('player.skip_intro')}</span>
                            </button>
                            <button type="button" class="btn-player-action" onclick="stepAnicliEpisode(1)">
                                <i class="ti ti-player-skip-forward"></i> <span data-i18n="player.next_ep">${i18n('player.next_ep')}</span>
                            </button>
                            <button type="button" class="btn-player-action" onclick="toggleFloatingMiniPlayer()">
                                <i class="ti ti-picture-in-picture-top"></i> <span data-i18n="player.mini_player">${i18n('player.mini_player')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize state
    goToAnicliStep(1);
    if (isMobile) {
        renderMobileEpisodesList();
    }
}

window.handleMobilePlayerBack = function() {
    if (window.currentAnicliStep === 2) {
        goToAnicliStep(1);
    } else if (window.currentAnicliStep === 3) {
        goToAnicliStep(2);
    } else if (window.currentAnicliStep === 4) {
        goToAnicliStep(2);
    } else {
        closeMobileFullscreenPlayer();
    }
};

window.mobileTransFilter = 'all'; // 'all', 'dub', 'sub'

window.setMobileTransFilter = function(filter) {
    window.mobileTransFilter = filter;
    renderMobileTranslations();
};

function getInitials(name) {
    if (!name) return '??';
    const clean = name.replace(/^[#\[\]\(\)\s]+/, '').trim();
    const parts = clean.split(/[\s\-_&]+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (clean.length >= 2) {
        return clean.slice(0, 2).toUpperCase();
    }
    return clean.toUpperCase();
}

function isSubtitles(name) {
    const lower = (name || '').toLowerCase();
    return lower.includes('субтитр') || lower.includes('sub') || lower.includes('саб');
}

function getLastWatched(animeId) {
    try {
        const raw = localStorage.getItem(`shikimx_last_watched_${animeId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch(e) {
        return null;
    }
}

function setLastWatched(animeId, trans, ep) {
    try {
        const fullyWatchedList = getFullyWatchedEpisodes(animeId);
        const fullyWatched = fullyWatchedList.includes(ep);
        localStorage.setItem(`shikimx_last_watched_${animeId}`, JSON.stringify({
            trans: trans,
            ep: ep,
            fullyWatched: fullyWatched,
            time: Date.now()
        }));
    } catch(e) {}
}

function renderMobileTranslations() {
    const container = document.getElementById('mobile-trans-container');
    if (!container) return;

    const epNum = window.currentAnicliEp || 1;
    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[epNum.toString()] : null;
    if (!epData) {
        container.innerHTML = '<div style="padding: 32px 16px; text-align: center; color: #888;">Озвучки не найдены</div>';
        return;
    }

    const allTrans = Object.keys(epData);
    const animeId = window.currentPlayingAnimeId || 0;
    const fullyWatchedList = getFullyWatchedEpisodes(animeId);

    // Filter by type (Все / Озвучка / Субтитры)
    let filteredTrans = allTrans;
    if (window.mobileTransFilter === 'dub') {
        filteredTrans = allTrans.filter(t => !isSubtitles(t));
    } else if (window.mobileTransFilter === 'sub') {
        filteredTrans = allTrans.filter(t => isSubtitles(t));
    }

    // Last watched card data
    const savedLast = getLastWatched(animeId);
    const lastWatched = savedLast || (allTrans.length ? {
        trans: allTrans[0],
        ep: epNum,
        fullyWatched: fullyWatchedList.includes(epNum)
    } : null);

    const f = window.mobileTransFilter;

    container.innerHTML = `
        <div class="mobile-trans-pills">
            <button type="button" class="trans-pill ${f === 'all' ? 'active' : ''}" onclick="setMobileTransFilter('all')">
                ${f === 'all' ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''} Все
            </button>
            <button type="button" class="trans-pill ${f === 'dub' ? 'active' : ''}" onclick="setMobileTransFilter('dub')">
                ${f === 'dub' ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''} Озвучка
            </button>
            <button type="button" class="trans-pill ${f === 'sub' ? 'active' : ''}" onclick="setMobileTransFilter('sub')">
                ${f === 'sub' ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''} Субтитры
            </button>
        </div>

        ${lastWatched ? `
            <div class="mobile-last-watched-card">
                <div class="last-watched-info">
                    <div class="last-watched-heading">${isEn ? 'Recently watched' : 'Последнее просмотренное'}</div>
                    <div class="last-watched-title">${lastWatched.trans} &bull; ${isEn ? 'Episode' : 'Серия'} ${lastWatched.ep}</div>
                    <div class="last-watched-sub">${lastWatched.fullyWatched ? (isEn ? 'Watched completely' : 'Просмотрено полностью') : (isEn ? `Episode ${lastWatched.ep}` : `Серия ${lastWatched.ep}`)}</div>
                </div>
                <button type="button" class="last-watched-continue-btn" onclick="onAnicliTranslationChange(this.getAttribute('data-trans'))" data-trans="${lastWatched.trans.replace(/"/g, '&quot;')}">
                    ${isEn ? 'Continue' : 'Продолжить'}
                </button>
            </div>
        ` : ''}

        <div class="mobile-trans-list">
            ${filteredTrans.map(tr => {
                const initials = getInitials(tr);
                const isSub = isSubtitles(tr);
                const typeText = isSub ? (isEn ? 'Subtitles' : 'Субтитры') : (isEn ? 'Dubbing' : 'Озвучка');
                const safeTr = tr.replace(/"/g, '&quot;');
                return `
                    <div class="mobile-trans-row ${tr === window.currentAnicliTrans ? 'active' : ''}" onclick="onAnicliTranslationChange(this.getAttribute('data-trans'))" data-trans="${safeTr}">
                        <div class="mobile-trans-avatar">${initials}</div>
                        <div class="mobile-trans-details">
                            <div class="mobile-trans-name">${tr}</div>
                            <div class="mobile-trans-sub">${typeText}</div>
                        </div>
                    </div>
                `;
            }).join('')}
            ${!filteredTrans.length ? `
                <div style="padding: 32px 16px; text-align: center; color: #888; font-size: 13.5px;">${isEn ? 'Nothing found for selected filter' : 'Ничего не найдено для выбранного фильтра'}</div>
            ` : ''}
        </div>
    `;
}
window.renderMobileTranslations = renderMobileTranslations;

function goToAnicliStep(step) {
    window.currentAnicliStep = step;
    const s1 = document.getElementById('anicli-step-1');
    const s2 = document.getElementById('anicli-step-2');
    const s3 = document.getElementById('anicli-step-3');
    const s4 = document.getElementById('anicli-step-4');
    const iframe = document.getElementById('anicli-iframe');
    const subTitle = document.getElementById('mobile-player-sub-title');
    const filterBtn = document.getElementById('mobile-player-filter-btn');

    if (!s1) return;

    // Скрываем все 4 шага
    [s1, s2, s3, s4].forEach(s => {
        if (s) {
            s.classList.add('hidden');
            s.style.setProperty('display', 'none', 'important');
        }
    });

    if (step === 1) {
        // Шаг 1: Серии
        s1.classList.remove('hidden');
        s1.style.removeProperty('display');
        if (iframe) iframe.src = ""; // Stop video if going back to setup
        renderMobileEpisodesList();
        if (subTitle) subTitle.innerText = (window.anicliSourcesFound && window.anicliSourcesFound.length) ? window.anicliSourcesFound.join(' • ') : 'Kodik • WinMedia';
        if (filterBtn) {
            filterBtn.classList.remove('hidden');
            filterBtn.style.setProperty('display', 'flex', 'important');
        }
    } else {
        // Шаги 2, 3, 4: Скрываем кнопку фильтра серий
        if (filterBtn) {
            filterBtn.classList.add('hidden');
            filterBtn.style.setProperty('display', 'none', 'important');
        }
        closeMobileEpisodesFilterSheet();

        if (step === 2) {
            // Шаг 2: Озвучки
            if (s2) {
                s2.classList.remove('hidden');
                s2.style.removeProperty('display');
            }
            if (iframe) iframe.src = "";
            renderMobileTranslations();
            if (subTitle) {
                const firstSource = (window.anicliSourcesFound && window.anicliSourcesFound[0]) ? window.anicliSourcesFound[0] : 'Kodik';
                subTitle.innerText = firstSource;
            }
        } else if (step === 3) {
            // Шаг 3: Плееры / Источники
            if (s3) {
                s3.classList.remove('hidden');
                s3.style.removeProperty('display');
            }
            if (iframe) iframe.src = "";
            renderMobilePlayers(window.currentAnicliEp, window.currentAnicliTrans);
            if (subTitle) subTitle.innerText = `${window.currentAnicliTrans || ''} • Серия ${window.currentAnicliEp}`;
        } else if (step === 4) {
            // Шаг 4: Видеоплеер (отдельный экран)
            if (s4) {
                s4.classList.remove('hidden');
                s4.style.removeProperty('display');
            }
            if (subTitle) subTitle.innerText = `${window.currentAnicliTrans || ''} • Серия ${window.currentAnicliEp}`;
        }
    }
}

function onAnicliEpisodeChange(epNum) {
    window.currentAnicliEp = epNum;
    
    // Update active class on chips and mobile rows
    document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === epNum);
    });
    const wizardEpLbl = document.getElementById('wizard-ep-lbl');
    if (wizardEpLbl) wizardEpLbl.innerText = `(Серия ${epNum})`;
    populateAnicliTranslations(epNum);
    goToAnicliStep(2);
}

function populateAnicliTranslations(epNum) {
    const isMobile = window.innerWidth <= 768 || !!document.getElementById('mobile-trans-container');
    if (isMobile) {
        renderMobileTranslations();
    }

    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[epNum.toString()] : null;
    const transChips = document.getElementById('anicli-trans-chips');
    if (!epData || !transChips) return;

    const availableTrans = Object.keys(epData);
    
    transChips.innerHTML = availableTrans.map(tr => {
        const safeTr = tr.replace(/"/g, '&quot;');
        return `<div class="anicli-chip" onclick="onAnicliTranslationChange(this.getAttribute('data-trans'))" data-trans="${safeTr}">${tr}</div>`;
    }).join('');
}

function onAnicliTranslationChange(transName) {
    window.currentAnicliTrans = transName;
    if (window.currentPlayingAnimeId) {
        setLastWatched(window.currentPlayingAnimeId, transName, window.currentAnicliEp);
    }
    
    document.querySelectorAll('#anicli-trans-chips .anicli-chip').forEach(c => {
        c.classList.toggle('active', c.innerText === transName);
    });
    document.querySelectorAll('.mobile-trans-row').forEach(r => {
        r.classList.toggle('active', r.querySelector('.mobile-trans-name') && r.querySelector('.mobile-trans-name').innerText === transName);
    });

    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[window.currentAnicliEp.toString()] : null;
    const players = epData ? epData[transName] : null;

    if (players && players.length === 1) {
        onAnicliPlayerChange(players[0].url, null, players[0].player);
    } else {
        const wizardTransLbl = document.getElementById('wizard-trans-lbl');
        if (wizardTransLbl) wizardTransLbl.innerText = `(${transName})`;
        populateAnicliPlayers(window.currentAnicliEp, transName);
        goToAnicliStep(3);
    }
}

function renderMobilePlayers(epNum, transName) {
    const container = document.getElementById('mobile-players-container');
    if (!container) return;

    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[epNum.toString()] : null;
    if (!epData || !epData[transName]) {
        container.innerHTML = '<div style="padding: 32px 16px; text-align: center; color: #888;">Источники не найдены</div>';
        return;
    }

    const players = epData[transName];

    container.innerHTML = `
        <div class="mobile-sources-header-bar">
            <div class="mobile-sources-title">Доступные источники</div>
            <div class="mobile-sources-subtitle">${transName} &bull; Серия ${epNum}</div>
        </div>
        <div class="mobile-players-list">
            ${players.map((p, idx) => {
                const initials = getInitials(p.player);
                const safePlayer = p.player.replace(/"/g, '&quot;');
                return `
                    <div class="mobile-player-row" onclick="onAnicliPlayerChange(this.getAttribute('data-url'), this, this.getAttribute('data-player'))" data-url="${p.url}" data-player="${safePlayer}">
                        <div class="mobile-player-avatar">${initials}</div>
                        <div class="mobile-player-details">
                            <div class="mobile-player-name">${p.player}</div>
                            <div class="mobile-player-sub">${isEn ? 'Video stream • Fast loading' : 'Видеопоток • Быстрая загрузка'}</div>
                        </div>
                        <div class="mobile-player-arrow">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f7a863">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
window.renderMobilePlayers = renderMobilePlayers;

function populateAnicliPlayers(epNum, transName) {
    const isMobile = window.innerWidth <= 768 || !!document.getElementById('mobile-players-container');
    if (isMobile) {
        renderMobilePlayers(epNum, transName);
    }

    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[epNum.toString()] : null;
    const playerChips = document.getElementById('anicli-player-chips');
    if (!epData || !epData[transName] || !playerChips) return;

    const players = epData[transName];

    playerChips.innerHTML = players.map((p, idx) => {
        return `<div class="anicli-chip" onclick="onAnicliPlayerChange('${p.url}', this, '${p.player}')">
                    ${p.player}
                </div>`;
    }).join('');
}

function onAnicliPlayerChange(url, element, playerName) {
    window.currentAnicliPlayerName = playerName;
    window.currentAnicliPlayerUrl = url;

    // 1. Show video view
    goToAnicliStep(4);
    
    // 2. Update info text
    const info = document.getElementById('video-active-info');
    if (info) {
        info.innerHTML = `Серия ${window.currentAnicliEp} &bull; ${window.currentAnicliTrans} &bull; ${playerName}`;
    }

    // 3. Render iframe
    updateAnicliIframe(url);

    // 4. Save progress
    if (window.currentPlayingAnimeId) {
        saveWatchProgress(
            window.currentPlayingAnimeId,
            window.currentPlayingTitle,
            window.currentPlayingRussian,
            window.currentPlayingPoster,
            window.currentAnicliEp,
            window.currentAnicliTrans,
            window.currentPlayingTotalEpisodes
        );
    }
}

function updateAnicliIframe(url) {
    const iframe = document.getElementById('anicli-iframe');
    if (iframe && url) {
        iframe.src = url;
    }
}

// User Rate Management helpers
function stepRateCounter(targetId, delta, maxVal = 0) {
    const input = document.getElementById(`rate-episodes-input-${targetId}`);
    if (!input) return;
    let val = (parseInt(input.value) || 0) + delta;
    if (val < 0) val = 0;
    if (maxVal > 0 && val > maxVal) val = maxVal;
    input.value = val;
}
window.stepRateCounter = stepRateCounter;

function setUserRateScore(targetId, score) {
    const container = document.getElementById(`stars-container-${targetId}`);
    const textEl = document.getElementById(`score-text-${targetId}`);
    if (!container) return;

    const current = parseInt(container.dataset.score) || 0;
    const newScore = (current === score) ? 0 : score;
    container.dataset.score = newScore;

    container.querySelectorAll('.star-btn').forEach(btn => {
        const starVal = parseInt(btn.dataset.star);
        btn.classList.toggle('active', starVal <= newScore);
    });

    if (textEl) {
        textEl.textContent = newScore ? `${newScore}/10` : '—';
    }
}
window.setUserRateScore = setUserRateScore;

function previewUserRateScore(targetId, score) {
    const container = document.getElementById(`stars-container-${targetId}`);
    if (!container) return;
    container.querySelectorAll('.star-btn').forEach(btn => {
        const starVal = parseInt(btn.dataset.star);
        btn.classList.toggle('hover', starVal <= score);
    });
}
window.previewUserRateScore = previewUserRateScore;

function resetPreviewUserRateScore(targetId) {
    const container = document.getElementById(`stars-container-${targetId}`);
    if (!container) return;
    container.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.remove('hover');
    });
}
window.resetPreviewUserRateScore = resetPreviewUserRateScore;

async function submitUserRate(targetId, targetType, rateId, totalCount = 0) {
    const statusSelect = document.getElementById(`rate-status-select-${targetId}`);
    const epInput = document.getElementById(`rate-episodes-input-${targetId}`);
    const starsContainer = document.getElementById(`stars-container-${targetId}`);
    const noteInput = document.getElementById(`rate-note-input-${targetId}`);

    if (!statusSelect) return;

    const status = statusSelect.value;
    const count = parseInt(epInput ? epInput.value : 0) || 0;
    const score = parseInt(starsContainer ? starsContainer.dataset.score : 0) || 0;
    const text = noteInput ? noteInput.value.trim() : '';

    const payload = {
        target_id: parseInt(targetId),
        target_type: targetType,
        status: status,
        score: score,
        text: text
    };
    if (rateId) payload.id = parseInt(rateId);

    if (targetType === 'Anime') {
        payload.episodes = count;
    } else {
        payload.chapters = count;
    }

    try {
        const saveBtn = document.querySelector(`#user-rate-widget-${targetId} .btn-save-rate`);
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="ti ti-loader animate-spin"></i> ${i18n('mylist.saving')}`;
        }

        const res = await fetch('/api/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="ti ti-check"></i> ${i18n('mylist.save')}`;
        }

        if (res.ok && data.success) {
            showToast(i18n('mylist.saved'), 'success');
            tabLoaded['rates'] = false;
        } else {
            showToast(data.error || i18n('mylist.save_error'), 'error');
        }
    } catch (err) {
        console.error('Ошибка сохранения оценки:', err);
        showToast(err.message, 'error');
    }
}
window.submitUserRate = submitUserRate;

async function deleteUserRateAction(targetId, targetType, rateId) {
    if (!confirm(i18n('mylist.delete_confirm'))) return;
    try {
        const res = await fetch(`/api/rate/${rateId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(i18n('mylist.deleted'), 'warning');
            tabLoaded['rates'] = false;
            if (targetType === 'Anime') openAnimeModal(targetId);
            else openMangaModal(targetId);
        } else {
            showToast(data.error || i18n('mylist.delete_error'), 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

window.deleteUserRateAction = deleteUserRateAction;

function renderAnimeUserRateWidget(a) {
    const rate = a.user_rate;
    const currentStatus = rate ? rate.status : '';
    const currentEpisodes = rate ? (rate.episodes || 0) : 0;
    const currentScore = rate ? (rate.score || 0) : 0;
    const currentText = rate ? (rate.text || '') : '';
    const rateId = rate ? rate.id : '';
    const totalEpisodes = a.episodes || 0;

    const statusMap = typeof getStatusMap === 'function' ? getStatusMap() : {};

    return `
        <div class="user-rate-widget-card" id="user-rate-widget-${a.id}">
            <div class="user-rate-widget-header">
                <h4><i class="ti ti-bookmark"></i> ${i18n('mylist.title')}</h4>
                ${currentStatus ? `<span class="badge badge-${currentStatus}">${statusMap[currentStatus] ? (statusMap[currentStatus].label || statusMap[currentStatus].name) : currentStatus}</span>` : `<span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-muted);">${i18n('mylist.not_in_list')}</span>`}
            </div>
            <div class="user-rate-widget-body">
                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.status')}</label>
                    <select id="rate-status-select-${a.id}" class="sort-select user-rate-select">
                        <option value="watching" ${currentStatus === 'watching' ? 'selected' : ''}>${i18n('rates.watching')}</option>
                        <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>${i18n('rates.completed')}</option>
                        <option value="planned" ${currentStatus === 'planned' ? 'selected' : (!currentStatus ? 'selected' : '')}>${i18n('rates.planned')}</option>
                        <option value="on_hold" ${currentStatus === 'on_hold' ? 'selected' : ''}>${i18n('rates.on_hold')}</option>
                        <option value="dropped" ${currentStatus === 'dropped' ? 'selected' : ''}>${i18n('rates.dropped')}</option>
                        <option value="rewatching" ${currentStatus === 'rewatching' ? 'selected' : ''}>${i18n('rates.rewatching')}</option>
                    </select>
                </div>

                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.episodes')}</label>
                    <div class="episode-stepper">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${a.id}', -1)"><i class="ti ti-minus"></i></button>
                        <input type="number" id="rate-episodes-input-${a.id}" class="stepper-input" min="0" max="${totalEpisodes || 9999}" value="${currentEpisodes}">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${a.id}', 1, ${totalEpisodes || 0})"><i class="ti ti-plus"></i></button>
                        ${totalEpisodes ? `<span class="stepper-total">/ ${totalEpisodes}</span>` : ''}
                    </div>
                </div>

                <div class="user-rate-row user-rate-score-row">
                    <div class="user-rate-score-header">
                        <label class="user-rate-label">${i18n('mylist.score')}</label>
                        <span class="score-display-text" id="score-text-${a.id}">${currentScore ? `${currentScore}/10` : '—'}</span>
                    </div>
                    <div class="stars-rating-container" id="stars-container-${a.id}" data-score="${currentScore}">
                        ${[1,2,3,4,5,6,7,8,9,10].map(s => `
                            <button type="button" class="star-btn ${s <= currentScore ? 'active' : ''}" data-star="${s}" onclick="setUserRateScore('${a.id}', ${s})" onmouseenter="previewUserRateScore('${a.id}', ${s})" onmouseleave="resetPreviewUserRateScore('${a.id}')" title="${s}/10">
                                <i class="ti ti-star-filled"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="user-rate-row" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <label class="user-rate-label">${i18n('mylist.note')}</label>
                    <textarea id="rate-note-input-${a.id}" class="user-rate-textarea" placeholder="${i18n('mylist.note_placeholder')}" rows="2">${currentText}</textarea>
                </div>

                <div class="user-rate-actions">
                    <button type="button" class="btn btn-save-rate" onclick="submitUserRate('${a.id}', 'Anime', ${rateId ? `'${rateId}'` : 'null'}, ${totalEpisodes || 0})">
                        <i class="ti ti-check"></i> <span>${i18n('mylist.save')}</span>
                    </button>
                    ${rateId ? `
                        <button type="button" class="btn-secondary btn-delete-rate" onclick="deleteUserRateAction('${a.id}', 'Anime', '${rateId}')">
                            <i class="ti ti-trash"></i> <span>${i18n('mylist.delete')}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function formatRussianDate(dateStr) {
    if (!dateStr) return '—';
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const month = months[parseInt(parts[1], 10) - 1];
        const year = parts[0];
        return `${day} ${month} ${year} г.`;
    }
    return dateStr;
}

function getSeasonFromDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
        const month = parseInt(parts[1], 10);
        const year = parts[0];
        let season = '';
        if (month === 12 || month <= 2) season = 'Зима';
        else if (month >= 3 && month <= 5) season = 'Весна';
        else if (month >= 6 && month <= 8) season = 'Лето';
        else season = 'Осень';
        return `${season} ${year}`;
    }
    return dateStr;
}

window.copyAnimeShikimoriLink = function(url) {
    const targetUrl = url || (window.currentPlayingAnimeId ? `https://shikimori.io/animes/${window.currentPlayingAnimeId}` : window.location.href);
    
    function onSuccess() {
        if (typeof showToast === 'function') {
            showToast('Ссылка на Shikimori скопирована', 'success');
        }
    }

    function onFallback() {
        try {
            const ta = document.createElement('textarea');
            ta.value = targetUrl;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(ta);
            if (successful) {
                onSuccess();
                return;
            }
        } catch (e) {}
        if (typeof showToast === 'function') {
            showToast(targetUrl, 'info');
        }
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(targetUrl).then(onSuccess).catch(onFallback);
    } else {
        onFallback();
    }
};

window.handleShareAnime = window.copyAnimeShikimoriLink;

window.copyCharacterLink = function(url) {
    const targetUrl = url || window.location.href;
    function onSuccess() {
        if (typeof showToast === 'function') {
            showToast('Ссылка на персонажа скопирована', 'success');
        }
    }
    function onFallback() {
        try {
            const ta = document.createElement('textarea');
            ta.value = targetUrl;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(ta);
            if (successful) {
                onSuccess();
                return;
            }
        } catch (e) {}
        if (typeof showToast === 'function') {
            showToast(targetUrl, 'info');
        }
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(targetUrl).then(onSuccess).catch(onFallback);
    } else {
        onFallback();
    }
};

window.toggleMobileAnimeDesc = function(animeId, btn) {
    const desc = document.getElementById(`mobile-desc-body-${animeId}`);
    if (!desc) return;
    if (desc.classList.contains('collapsed')) {
        desc.classList.remove('collapsed');
        btn.textContent = 'Свернуть';
    } else {
        desc.classList.add('collapsed');
        btn.textContent = 'Развернуть';
    }
};

window.openMobileRateSheet = function(animeId) {
    const sheet = document.getElementById('mobile-rate-sheet');
    if (sheet) sheet.classList.remove('hidden');
};

window.closeMobileRateSheet = function() {
    const sheet = document.getElementById('mobile-rate-sheet');
    if (sheet) sheet.classList.add('hidden');
};

function formatTimestampRussian(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        const months = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} г., ${hours}:${mins}`;
    } catch(e) {
        return isoStr;
    }
}

window.setMobileRateStatus = function(animeId, status) {
    document.querySelectorAll(`.mobile-status-pill-${animeId}`).forEach(el => {
        el.classList.remove('active');
    });
    const selected = document.getElementById(`mobile-status-pill-${animeId}-${status}`);
    if (selected) selected.classList.add('active');
    const input = document.getElementById(`mobile-rate-status-input-${animeId}`);
    if (input) input.value = status;

    if (status === 'completed') {
        const epEl = document.getElementById(`mobile-rate-episodes-val-${animeId}`);
        const total = parseInt(epEl ? epEl.dataset.total : 0, 10) || 0;
        if (total > 0 && epEl) {
            epEl.textContent = total;
        }
    }
};

window.stepMobileCounter = function(animeId, type, delta) {
    const el = document.getElementById(`mobile-rate-${type}-val-${animeId}`);
    if (!el) return;
    let val = parseInt(el.textContent, 10) || 0;
    val += delta;
    if (val < 0) val = 0;
    if (type === 'episodes') {
        const total = parseInt(el.dataset.total, 10) || 0;
        if (total > 0 && val > total) val = total;
    }
    el.textContent = val;
};

window.updateMobileRateScore = function(animeId, score) {
    const num = document.getElementById(`mobile-rate-score-num-${animeId}`);
    const track = document.getElementById(`mobile-rate-slider-track-${animeId}`);
    const dots = document.querySelectorAll(`#mobile-rate-sheet .slider-dot`);
    const val = parseInt(score, 10) || 0;
    if (num) num.textContent = val > 0 ? val : '0';
    if (track) track.style.width = `${val * 10}%`;
    dots.forEach((d, idx) => {
        if (idx <= val) d.classList.add('active');
        else d.classList.remove('active');
    });
};

window.saveMobileUserRate = async function(animeId, rateId) {
    const statusInput = document.getElementById(`mobile-rate-status-input-${animeId}`);
    const status = statusInput ? statusInput.value : 'watching';

    const epEl = document.getElementById(`mobile-rate-episodes-val-${animeId}`);
    const episodes = parseInt(epEl ? epEl.textContent : 0, 10) || 0;

    const rewEl = document.getElementById(`mobile-rate-rewatches-val-${animeId}`);
    const rewatches = parseInt(rewEl ? rewEl.textContent : 0, 10) || 0;

    const scoreSlider = document.getElementById(`mobile-rate-score-slider-${animeId}`);
    const score = parseInt(scoreSlider ? scoreSlider.value : 0, 10) || 0;

    const noteEl = document.getElementById(`mobile-rate-note-input-${animeId}`);
    const text = noteEl ? noteEl.value.trim() : '';

    const saveBtn = document.querySelector('.rate-sheet-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.6';
    }

    const payload = {
        target_id: parseInt(animeId, 10),
        target_type: 'Anime',
        status: status,
        score: score,
        episodes: episodes,
        rewatches: rewatches,
        text: text
    };
    if (rateId) payload.id = parseInt(rateId, 10);

    try {
        const res = await fetch('/api/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (typeof showToast === 'function') {
                showToast('Сохранено в список', 'success');
            }
            if (typeof tabLoaded !== 'undefined') tabLoaded['rates'] = false;
            closeMobileRateSheet();
            openAnimeModal(animeId);
        } else {
            if (typeof showToast === 'function') {
                showToast(data.error || 'Ошибка сохранения', 'error');
            }
        }
    } catch(err) {
        if (typeof showToast === 'function') {
            showToast(err.message, 'error');
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
        }
    }
};

function buildMobileRateSheetHTML(a) {
    const rate = a.user_rate;
    const currentStatus = rate ? rate.status : 'watching';
    const currentEpisodes = rate ? (rate.episodes || 0) : 0;
    const currentRewatches = rate ? (rate.rewatches || 0) : 0;
    const currentScore = rate ? (rate.score || 0) : 0;
    const currentText = rate ? (rate.text || '') : '';
    const rateId = rate ? rate.id : '';
    const totalEpisodes = a.episodes || 0;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const title = (isEn && a.name) ? a.name : (a.russian || a.name);

    const createdAtStr = rate && rate.created_at ? formatTimestampRussian(rate.created_at) : '';
    const updatedAtStr = rate && rate.updated_at ? formatTimestampRussian(rate.updated_at) : '';

    const statuses = [
        { id: 'watching', label: typeof i18n === 'function' ? i18n('rates.watching') : (isEn ? 'Watching' : 'Смотрю'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' },
        { id: 'planned', label: typeof i18n === 'function' ? i18n('rates.planned') : (isEn ? 'Planned' : 'В планах'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
        { id: 'completed', label: typeof i18n === 'function' ? i18n('rates.completed') : (isEn ? 'Completed' : 'Просмотрено'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' },
        { id: 'on_hold', label: typeof i18n === 'function' ? i18n('rates.on_hold') : (isEn ? 'On hold' : 'Отложено'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>' },
        { id: 'dropped', label: typeof i18n === 'function' ? i18n('rates.dropped') : (isEn ? 'Dropped' : 'Брошено'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' },
        { id: 'rewatching', label: typeof i18n === 'function' ? i18n('rates.rewatching') : (isEn ? 'Rewatching' : 'Пересматриваю'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>' }
    ];

    return `
        <div id="mobile-rate-sheet" class="mobile-rate-sheet hidden" onclick="if (event.target === this) closeMobileRateSheet();">
            <div class="mobile-rate-sheet-card" onclick="event.stopPropagation();">
                <!-- 1. Header с постером, заголовком Прогресс и корзиной -->
                <div class="rate-sheet-header">
                    <div class="rate-sheet-header-left">
                        <div class="rate-sheet-poster-wrap">
                            ${a.image ? `<img src="${a.image}" alt="${title}" class="rate-sheet-poster">` : `<div class="rate-sheet-poster placeholder"><i class="ti ti-movie"></i></div>`}
                        </div>
                        <div class="rate-sheet-header-text">
                            <div class="rate-sheet-main-title">${isEn ? 'Progress' : 'Прогресс'}</div>
                            <div class="rate-sheet-sub-title">${title}</div>
                        </div>
                    </div>
                    ${rateId ? `
                        <button type="button" class="rate-sheet-delete-btn" onclick="deleteUserRateAction('${a.id}', 'Anime', '${rateId}')" title="${isEn ? 'Delete from list' : 'Удалить из списка'}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e07a68" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>

                <!-- 2. Статусы (Смотрю, В планах, Просмотрено...) -->
                <div class="rate-sheet-statuses-scroll">
                    <input type="hidden" id="mobile-rate-status-input-${a.id}" value="${currentStatus}">
                    ${statuses.map(st => `
                        <button type="button" 
                            id="mobile-status-pill-${a.id}-${st.id}" 
                            class="mobile-status-pill mobile-status-pill-${a.id} ${currentStatus === st.id ? 'active' : ''}" 
                            onclick="setMobileRateStatus('${a.id}', '${st.id}')">
                            <span class="pill-icon">${st.icon}</span>
                            <span class="pill-text">${st.label}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- 3. Две карточки счетчиков: Эпизоды и Повторения -->
                <div class="rate-sheet-counters-row">
                    <!-- Эпизоды -->
                    <div class="rate-counter-card">
                        <div class="rate-counter-label">${isEn ? 'Episodes' : 'Эпизоды'}</div>
                        <div class="rate-counter-val" id="mobile-rate-episodes-val-${a.id}" data-total="${totalEpisodes}">${currentEpisodes}</div>
                        <div class="rate-counter-btns">
                            <button type="button" class="rate-counter-btn" onclick="stepMobileCounter('${a.id}', 'episodes', -1)">−</button>
                            <button type="button" class="rate-counter-btn" onclick="stepMobileCounter('${a.id}', 'episodes', 1)">+</button>
                        </div>
                    </div>

                    <!-- Повторения -->
                    <div class="rate-counter-card">
                        <div class="rate-counter-label">${isEn ? 'Rewatches' : 'Повторения'}</div>
                        <div class="rate-counter-val" id="mobile-rate-rewatches-val-${a.id}">${currentRewatches}</div>
                        <div class="rate-counter-btns">
                            <button type="button" class="rate-counter-btn" onclick="stepMobileCounter('${a.id}', 'rewatches', -1)">−</button>
                            <button type="button" class="rate-counter-btn" onclick="stepMobileCounter('${a.id}', 'rewatches', 1)">+</button>
                        </div>
                    </div>
                </div>

                <!-- 4. Оценка со слайдером и точками 0..10 -->
                <div class="rate-sheet-score-section">
                    <div class="rate-sheet-section-title">${isEn ? 'Score' : 'Оценка'}</div>
                    <div class="rate-sheet-slider-row">
                        <div class="rate-sheet-slider-wrap">
                            <input type="range" min="0" max="10" step="1" value="${currentScore}" id="mobile-rate-score-slider-${a.id}" class="rate-sheet-slider" oninput="updateMobileRateScore('${a.id}', this.value)">
                            <div class="rate-sheet-slider-track" id="mobile-rate-slider-track-${a.id}" style="width: ${(currentScore / 10) * 100}%"></div>
                            <div class="rate-sheet-slider-dots">
                                ${[0,1,2,3,4,5,6,7,8,9,10].map(i => `<span class="slider-dot ${i <= currentScore ? 'active' : ''}"></span>`).join('')}
                            </div>
                        </div>
                        <div class="rate-sheet-score-val" id="mobile-rate-score-num-${a.id}">${currentScore ? currentScore : '0'}</div>
                    </div>
                </div>

                <!-- 5. Заметка -->
                <div class="rate-sheet-note-section">
                    <div class="rate-sheet-section-title">${isEn ? 'Note' : 'Заметка'}</div>
                    <textarea id="mobile-rate-note-input-${a.id}" class="rate-sheet-note-input" placeholder="${isEn ? 'Personal note...' : 'Личная заметка...'}" rows="2">${currentText}</textarea>
                </div>

                <!-- 6. Футер с датами и кнопкой сохранить -->
                <div class="rate-sheet-footer">
                    <div class="rate-sheet-timestamps">
                        ${createdAtStr ? `<div class="rate-timestamp-item"><span class="t-icon">+</span> <span>${createdAtStr}</span></div>` : ''}
                        ${updatedAtStr ? `<div class="rate-timestamp-item"><span class="t-icon">✏</span> <span>${updatedAtStr}</span></div>` : ''}
                    </div>
                    <button type="button" class="rate-sheet-save-btn" onclick="saveMobileUserRate('${a.id}', ${rateId ? `'${rateId}'` : 'null'})" title="${isEn ? 'Save' : 'Сохранить'}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM7 5v4h10V5H7zm5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                        </svg>
                    </button>
                </div>

                <!-- Нижний индикатор свайпа -->
                <div class="rate-sheet-home-bar"></div>
            </div>
        </div>
    `;
}

function initMobileAnimeModalScroll() {
    const modalContent = document.querySelector('#anime-modal .modal-content');
    const topBar = document.getElementById('mobile-anime-top-bar');
    const topTitle = document.getElementById('mobile-anime-top-title');
    if (!modalContent || !topBar) return;

    modalContent.onscroll = function() {
        if (modalContent.scrollTop > 120) {
            topBar.classList.add('scrolled');
            if (topTitle) topTitle.style.opacity = '1';
        } else {
            topBar.classList.remove('scrolled');
            if (topTitle) topTitle.style.opacity = '0';
        }
    };
}

function buildMobileAnimeDetailHTML(a, targetEpisode, safeTitle, userRateWidgetHTML) {
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const title = (isEn && a.name) ? a.name : (a.russian || a.name);
    const scoreVal = a.score ? parseFloat(a.score) : 0;
    const secondaryScore = a.scores_stats && a.scores_stats.length ? (scoreVal ? (scoreVal * 0.958).toFixed(2) : '') : '';

    const statusMapRu = {
        'planned': isEn ? 'Planned' : 'В планах',
        'watching': isEn ? 'Watching' : 'Смотрю',
        'completed': isEn ? 'Completed' : 'Просмотрено',
        'on_hold': isEn ? 'On hold' : 'Отложено',
        'dropped': isEn ? 'Dropped' : 'Брошено',
        'rewatching': isEn ? 'Rewatching' : 'Пересматриваю'
    };

    let userRateLabel = isEn ? 'Add to list' : 'В список';
    let userRateHasScore = false;
    if (a.user_rate) {
        const st = statusMapRu[a.user_rate.status] || a.user_rate.status || (isEn ? 'In list' : 'В списке');
        const sc = a.user_rate.score ? ` • ${a.user_rate.score} ★` : '';
        const ep = (!a.user_rate.score && a.user_rate.episodes) ? ` • ${a.user_rate.episodes} ${isEn ? 'eps' : 'эп.'}` : '';
        userRateLabel = `${st}${sc}${ep}`;
        userRateHasScore = true;
    }

    const descText = a.description || (isEn ? 'No description available.' : 'Описание отсутствует.');
    const isLongDesc = descText.length > 200;

    const statusesStats = a.statuses_stats || [];
    let plannedCount = 0, completedCount = 0, watchingCount = 0, droppedCount = 0, onHoldCount = 0;
    statusesStats.forEach(s => {
        const st = s.status || s.name;
        const cnt = parseInt(s.count || s.value || 0, 10);
        if (st === 'planned') plannedCount = cnt;
        else if (st === 'completed') completedCount = cnt;
        else if (st === 'watching') watchingCount = cnt;
        else if (st === 'dropped') droppedCount = cnt;
        else if (st === 'on_hold') onHoldCount = cnt;
    });
    const totalInLists = plannedCount + completedCount + watchingCount + droppedCount + onHoldCount;

    const charactersList = a.characters || [];
    const relatedList = a.related || [];
    const screenshotsList = a.screenshots || [];

    const studiosList = (a.studios && a.studios.length) ? a.studios.join(', ') : 'Madhouse';
    const japaneseTitle = Array.isArray(a.japanese) ? a.japanese.join(', ') : (a.japanese || '');
    const englishTitle = Array.isArray(a.english) ? a.english.join(', ') : (a.english || '');
    const synonymsText = Array.isArray(a.synonyms) ? a.synonyms.join(', ') : (a.synonyms || '');

    return `
        <div class="mobile-anime-container">
            <!-- 1. Верхний бар с кнопкой назад и поделиться -->
            <div class="mobile-anime-top-bar" id="mobile-anime-top-bar">
                <button type="button" class="mobile-anime-top-btn" onclick="handleModalBack()" title="${isEn ? 'Back' : 'Назад'}">
                    <i class="ti ti-arrow-left"></i>
                </button>
                <div class="mobile-anime-top-title" id="mobile-anime-top-title">${title}</div>
                <button type="button" class="mobile-anime-top-btn" onclick="copyAnimeShikimoriLink('${a.shikimori_url || ('https://shikimori.io/animes/' + a.id)}')" title="${isEn ? 'Share link' : 'Скопировать ссылку на Shikimori'}">
                    <i class="ti ti-share"></i>
                </button>
            </div>

            <!-- 2. Большой постер-баннер с градиентом и заголовком -->
            <div class="mobile-anime-hero" id="mobile-anime-hero">
                <div class="mobile-anime-hero-img-wrap">
                    ${a.image ? `<img src="${a.image}" alt="${title}" class="mobile-anime-hero-img">` : `<div class="mobile-anime-hero-placeholder"><i class="ti ti-movie"></i></div>`}
                    <div class="mobile-anime-hero-gradient"></div>
                </div>

                <div class="mobile-anime-hero-content">
                    <div class="mobile-anime-hero-stars-row">
                        <div class="mobile-hero-stars-outer" title="${scoreVal} / 10">
                            <div class="mobile-hero-stars-bg">★★★★★</div>
                            <div class="mobile-hero-stars-fill" style="width: ${(Math.min(100, Math.max(0, (scoreVal / 10) * 100))).toFixed(1)}%;">★★★★★</div>
                        </div>
                        <span class="mobile-hero-score">${a.score ? a.score : '—'}</span>
                        ${secondaryScore ? `<span class="mobile-hero-secondary-score">(${secondaryScore})</span>` : ''}
                    </div>

                    <h1 class="mobile-anime-hero-title">${title}</h1>

                    <div class="mobile-anime-meta-grid">
                        <div class="mobile-anime-meta-col">
                            <div class="meta-label">${isEn ? 'FORMAT' : 'ФОРМАТ'}</div>
                            <div class="meta-val">${(a.kind || 'TV')} • ${(a.status || (isEn ? 'Released' : 'Вышло'))}</div>
                        </div>
                        <div class="mobile-anime-meta-col">
                            <div class="meta-label">${isEn ? 'SEASON' : 'СЕЗОН'}</div>
                            <div class="meta-val">${getSeasonFromDate(a.aired_on)}</div>
                        </div>
                        <div class="mobile-anime-meta-col">
                            <div class="meta-label">${isEn ? 'EPISODES' : 'ЭПИЗОДЫ'}</div>
                            <div class="meta-val">${a.episodes ? a.episodes + (isEn ? ' eps' : ' эп.') : (a.episodes_aired ? a.episodes_aired + (isEn ? ' eps' : ' эп.') : '—')}</div>
                        </div>
                        <div class="mobile-anime-meta-col">
                            <div class="meta-label">${isEn ? 'RATING' : 'РЕЙТИНГ'}</div>
                            <div class="meta-val">${a.rating ? a.rating.replace('_', '-') : 'PG-13'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. Кнопки действий: статус в списке + круглая кнопка плеера -->
            <div class="mobile-anime-body-wrap">
                <div class="mobile-anime-actions-row">
                    <button type="button" class="mobile-anime-status-btn ${userRateHasScore ? 'active' : ''}" onclick="openMobileRateSheet('${a.id}')">
                        ${userRateHasScore ? `
                            <svg class="mobile-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e1910" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                        ` : `
                            <svg class="mobile-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e1910" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        `}
                        <span>${userRateLabel}</span>
                    </button>
                    <button type="button" class="mobile-anime-play-btn" onclick="toggleAnicliPlayer('${safeTitle}', ${targetEpisode}, ${a.id})" title="${isEn ? 'Watch in Player 2 (Anicli)' : 'Смотреть в Плеере 2 (Anicli)'}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#1b2612" style="margin-left: 2px; display: block;">
                            <path d="M7 4v16l13-8z"/>
                        </svg>
                    </button>
                </div>

                <!-- Контейнер для встроенного плеера на мобильном -->
                <div id="mobile-watch-player-container" class="mobile-watch-player-wrapper hidden"></div>

                <!-- 4. Карточка описания -->
                <div class="mobile-anime-desc-card">
                    <div class="mobile-anime-desc-heading">${isEn ? 'Description' : 'Описание'}</div>
                    <div class="mobile-anime-desc-body ${isLongDesc ? 'collapsed' : ''}" id="mobile-desc-body-${a.id}">
                        ${descText}
                    </div>
                    ${isLongDesc ? `<div class="mobile-anime-desc-toggle" onclick="toggleMobileAnimeDesc('${a.id}', this)">${isEn ? 'Show more' : 'Развернуть'}</div>` : ''}
                </div>

                <!-- 5. Горизонтальная прокрутка жанров -->
                ${(a.genres && a.genres.length) ? `
                    <div class="mobile-anime-genres-scroll">
                        ${a.genres.map(g => `<span class="mobile-anime-genre-pill">${g}</span>`).join('')}
                    </div>
                ` : ''}

                <!-- 6. Раздел В списках с цветной полосой -->
                ${totalInLists > 0 ? `
                    <div class="mobile-anime-section">
                        <div class="mobile-anime-section-title">${isEn ? 'In lists' : 'В списках'}</div>
                        <div class="mobile-in-lists-bar">
                            <div class="bar-seg seg-planned" style="flex: ${plannedCount || 0.05};" title="${isEn ? 'Planned' : 'В планах'}"></div>
                            <div class="bar-seg seg-completed" style="flex: ${completedCount || 0.05};" title="${isEn ? 'Completed' : 'Просмотрено'}"></div>
                            <div class="bar-seg seg-watching" style="flex: ${watchingCount || 0.05};" title="${isEn ? 'Watching' : 'Смотрю'}"></div>
                            <div class="bar-seg seg-dropped" style="flex: ${droppedCount || 0.05};" title="${isEn ? 'Dropped' : 'Брошено'}"></div>
                            <div class="bar-seg seg-onhold" style="flex: ${onHoldCount || 0.05};" title="${isEn ? 'On hold' : 'Отложено'}"></div>
                        </div>
                        <div class="mobile-in-lists-legend">
                            <div class="legend-item"><span class="dot dot-planned"></span> <span class="label">${isEn ? 'Planned' : 'В планах'}</span> <span class="val">${plannedCount.toLocaleString()}</span></div>
                            <div class="legend-item"><span class="dot dot-completed"></span> <span class="label">${isEn ? 'Completed' : 'Просмотрено'}</span> <span class="val">${completedCount.toLocaleString()}</span></div>
                            <div class="legend-item"><span class="dot dot-watching"></span> <span class="label">${isEn ? 'Watching' : 'Смотрю'}</span> <span class="val">${watchingCount.toLocaleString()}</span></div>
                            <div class="legend-item"><span class="dot dot-dropped"></span> <span class="label">${isEn ? 'Dropped' : 'Брошено'}</span> <span class="val">${droppedCount.toLocaleString()}</span></div>
                            <div class="legend-item"><span class="dot dot-onhold"></span> <span class="label">${isEn ? 'On hold' : 'Отложено'}</span> <span class="val">${onHoldCount.toLocaleString()}</span></div>
                        </div>
                    </div>
                ` : ''}

                <!-- 7. Персонажи с овальными аватарками -->
                ${charactersList.length ? `
                    <div class="mobile-anime-section">
                        <div class="mobile-anime-section-header">
                            <div class="mobile-anime-section-title">${isEn ? 'Characters' : 'Персонажи'}</div>
                            <i class="ti ti-chevron-right section-chevron"></i>
                        </div>
                        <div class="mobile-characters-scroll">
                            ${charactersList.map(c => {
                                const charId = c.id || (c.url ? (c.url.match(/characters\/(?:z|a)?(\d+)/) || [])[1] : null);
                                const clickAction = charId ? `openCharacterModal(${charId});` : (c.url ? `window.open('${c.url}', '_blank');` : '');
                                return `
                                    <div class="mobile-character-card" onclick="${clickAction}">
                                        <div class="mobile-character-avatar-wrap">
                                            ${c.image ? `<img src="${c.image}" alt="${c.name}" class="mobile-character-avatar" loading="lazy">` : `<div class="mobile-character-avatar placeholder"><i class="ti ti-user"></i></div>`}
                                        </div>
                                        <div class="mobile-character-name">${c.name}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 8. Связанное с бейджем хронологии -->
                ${relatedList.length ? `
                    <div class="mobile-anime-section">
                        <div class="mobile-anime-section-header">
                            <div class="mobile-anime-section-title">
                                ${isEn ? 'Related' : 'Связанное'} <span class="mobile-count-pill">${relatedList.length}</span>
                                <span class="mobile-chronology-badge">${isEn ? 'Chronology' : 'Хронология'}</span>
                            </div>
                            <i class="ti ti-chevron-right section-chevron"></i>
                        </div>
                        <div class="mobile-related-list">
                            ${relatedList.map(r => {
                                const isRelAnime = r.url && (r.url.includes('/animes/') || !r.url.includes('/mangas/'));
                                const isRelManga = r.url && r.url.includes('/mangas/');
                                const relId = r.id;
                                const clickAction = (isRelAnime && relId) ? `openAnimeModal(${relId});` : (isRelManga && relId ? `openMangaModal(${relId});` : (r.url ? `window.open('${r.url}', '_blank');` : ''));
                                const relThumb = r.image;
                                return `
                                    <div class="mobile-related-item" onclick="${clickAction}">
                                        <div class="mobile-related-thumb-wrap">
                                            ${relThumb ? `<img src="${relThumb}" alt="${r.name}" class="mobile-related-thumb" loading="lazy">` : `<div class="mobile-related-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                                        </div>
                                        <div class="mobile-related-info">
                                            <div class="mobile-related-title">${r.name}</div>
                                            <div class="mobile-related-kind">${r.kind || (isEn ? 'Sequel' : 'Продолжение')}</div>
                                        </div>
                                        <div class="mobile-related-action">
                                            <i class="ti ti-eye"></i>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 9. Кадры -->
                ${screenshotsList.length ? `
                    <div class="mobile-anime-section">
                        <div class="mobile-anime-section-title">${isEn ? 'Screenshots' : 'Кадры'}</div>
                        <div class="mobile-screenshots-scroll">
                            ${screenshotsList.map((src, idx) => `
                                <div class="mobile-screenshot-card" onclick="openScreenshotLightbox(${idx})">
                                    <img src="${src}" alt="${isEn ? 'Screenshot ' + (idx + 1) : 'Кадр ' + (idx + 1)}" class="mobile-screenshot-img" loading="lazy">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 10. Детали -->
                <div class="mobile-anime-section mobile-details-section">
                    <div class="mobile-anime-section-title">${isEn ? 'Details' : 'Детали'}</div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Studio' : 'Студия'}</span>
                        <span class="detail-val"><span class="studio-badge">${studiosList}</span></span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Source' : 'Первоисточник'}</span>
                        <span class="detail-val">${isEn ? 'Manga' : 'Манга'}</span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Episode duration' : 'Длительность эпизода'}</span>
                        <span class="detail-val">${a.duration ? a.duration + (isEn ? ' min.' : ' мин.') : (isEn ? '24 min.' : '24 мин.')}</span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Aired from' : 'Начало показа'}</span>
                        <span class="detail-val">${formatRussianDate(a.aired_on)}</span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Aired to' : 'Конец показа'}</span>
                        <span class="detail-val">${formatRussianDate(a.released_on)}</span>
                    </div>

                    <div class="mobile-detail-separator"></div>

                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Romaji' : 'Ромадзи'}</span>
                        <span class="detail-val">${a.name || '—'}</span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Russian' : 'По-русски'}</span>
                        <span class="detail-val">${a.russian || a.name || '—'}</span>
                    </div>
                    ${englishTitle ? `
                        <div class="mobile-detail-row">
                            <span class="detail-label">${isEn ? 'English' : 'По-английски'}</span>
                            <span class="detail-val">${englishTitle}</span>
                        </div>
                    ` : ''}
                    ${japaneseTitle ? `
                        <div class="mobile-detail-row">
                            <span class="detail-label">${isEn ? 'Japanese' : 'По-японски'}</span>
                            <span class="detail-val">${japaneseTitle}</span>
                        </div>
                    ` : ''}
                    ${synonymsText ? `
                        <div class="mobile-detail-row">
                            <span class="detail-label">${isEn ? 'Synonyms' : 'Другие названия'}</span>
                            <span class="detail-val">${synonymsText}</span>
                        </div>
                    ` : ''}

                    <div class="mobile-detail-separator"></div>
                </div>

                <!-- 11. Навигационные пункты -->
                <div class="mobile-anime-nav-list">
                    <div class="mobile-nav-link-item" onclick="window.open('${a.shikimori_url || '#'}', '_blank')">
                        <div class="mobile-nav-link-left">
                            <i class="ti ti-messages"></i>
                            <span>${isEn ? 'Discussions' : 'Обсуждение'}</span>
                        </div>
                        <i class="ti ti-chevron-right"></i>
                    </div>
                    <div class="mobile-nav-link-item" onclick="window.open('${a.shikimori_url || '#'}/similar', '_blank')">
                        <div class="mobile-nav-link-left">
                            <i class="ti ti-copy"></i>
                            <span>${isEn ? 'Similar' : 'Похожее'}</span>
                        </div>
                        <i class="ti ti-chevron-right"></i>
                    </div>
                    <div class="mobile-nav-link-item" onclick="window.open('${a.shikimori_url || '#'}', '_blank')">
                        <div class="mobile-nav-link-left">
                            <i class="ti ti-link"></i>
                            <span>${isEn ? 'Links' : 'Ссылки'}</span>
                        </div>
                        <i class="ti ti-chevron-right"></i>
                    </div>
                    <div class="mobile-nav-link-item" onclick="toggleAnicliPlayer('${safeTitle}', ${targetEpisode}, ${a.id})">
                        <div class="mobile-nav-link-left">
                            <i class="ti ti-movie"></i>
                            <span>${isEn ? 'Videos' : 'Видео'}</span>
                        </div>
                        <i class="ti ti-chevron-right"></i>
                    </div>
                </div>
            </div>

            <!-- 12. Всплывающий боттом-шит прогресса -->
            ${buildMobileRateSheetHTML(a)}
        </div>
    `;
}

function renderAnimeDetail(a) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    window.currentPlayingAnimeId = a.id;
    window.currentPlayingAnimeData = a;
    window.currentPlayingUserRate = a.user_rate;
    window.currentPlayingTitle = a.name;
    window.currentPlayingRussian = a.russian || a.name;
    window.currentPlayingPoster = a.image;
    window.currentPlayingTotalEpisodes = a.episodes || 0;

    const title = a.russian || a.name;
    const origTitle = (a.russian && a.name !== a.russian) ? a.name : '';

    let targetEpisode = 1;
    if (a.user_rate) {
        const watched = a.user_rate.episodes || 0;
        const total = a.episodes || 0;
        const isCompleted = a.user_rate.status === 'completed' || (total > 0 && watched >= total);

        if (!isCompleted) {
            targetEpisode = watched + 1;
        }
    }

    const safeTitle = (a.russian || a.name).replace(/'/g, "\\'");

    const userRateWidgetHTML = renderAnimeUserRateWidget(a);

    const relatedHTML = (a.related && a.related.length) ? `
        <div class="anime-related-section">
            <h3><i class="ti ti-link"></i> ${i18n('anime.related')}</h3>
            <div class="anime-related-list">
                ${a.related.map(r => r.url ? `<a href="${r.url}" class="related-item" data-external="true"><span class="related-kind">${r.kind || ''}</span> ${r.name}</a>` : '').join('')}
            </div>
        </div>
    ` : '';

    const charactersHTML = (a.characters && a.characters.length) ? `
        <div class="anime-characters-section">
            <h3><i class="ti ti-users"></i> ${i18n('anime.characters')}</h3>
            <div class="anime-characters-scroll" id="anime-characters-scroll">
                ${a.characters.map((c, idx) => c.url ? `
                    <a href="${c.url}" class="character-card" target="_blank">
                        <div class="character-avatar-wrapper">
                            ${c.image ? `<img src="${c.image}" alt="${c.name}" class="character-avatar" loading="lazy" decoding="async">` : `<div class="character-avatar placeholder"><i class="ti ti-user"></i></div>`}
                            <span class="character-role">${c.role || ''}</span>
                        </div>
                        <div class="character-name">${c.name}</div>
                        ${c.japanese ? `<div class="character-japanese">${c.japanese}</div>` : ''}
                    </a>
                ` : '').join('')}
            </div>
            ${a.characters.length > 8 ? `
                <button class="characters-toggle-btn" onclick="toggleCharacters()" id="characters-toggle-btn">
                    <i class="ti ti-chevron-down"></i> ${i18n('anime.show_all_characters')}
                </button>
            ` : ''}
        </div>
    ` : '';

    currentScreenshots = a.screenshots || [];
    const screenshotsHTML = (a.screenshots && a.screenshots.length) ? `
        <div class="anime-screenshots-section">
            <h3><i class="ti ti-photo"></i> ${i18n('anime.screenshots')} <span class="badge-count">(${a.screenshots.length})</span></h3>
            <div class="anime-screenshots-scroll">
                ${a.screenshots.map((src, idx) => `
                    <div class="anime-screenshot-card" onclick="openScreenshotLightbox(${idx})" title="${i18n('lightbox.zoom')}">
                        <img src="${src}" class="anime-screenshot" loading="lazy" decoding="async" alt="Screenshot ${idx + 1}">
                        <div class="screenshot-zoom-overlay"><i class="ti ti-zoom-in"></i></div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    const videosHTML = (a.video && a.video.length) ? `
        <div class="anime-videos-section">
            <h3><i class="ti ti-video"></i> ${i18n('anime.videos')}</h3>
            <div class="anime-videos-list">
                ${a.video.map(v => `<a href="${v.url || v.player_url || '#'}" target="_blank" class="video-link" data-external="true"><i class="ti ti-player-play"></i> ${v.name || i18n('video.link')}</a>`).join('')}
            </div>
        </div>
    ` : '';

    const externalScoresHTML = (a.external_scores && a.external_scores.length) ? `
        <div class="anime-external-scores">
            ${a.external_scores.map(s => `<span class="external-score-badge">${s.service || ''}: ${s.score || '—'}</span>`).join(' ')}
        </div>
    ` : '';

    const franchiseHTML = a.franchise ? `
        <div class="info-item"><span class="label">${i18n('anime.franchise')}</span> <span>${a.franchise}</span></div>
    ` : '';

    const licensedByHTML = (a.licensed_by && a.licensed_by.length) ? `
        <div class="info-item info-full-row"><span class="label">${i18n('anime.licensed_by')}</span> <span>${a.licensed_by.join(', ')}</span></div>
    ` : '';

    const desktopHTML = `
        <div class="anime-detail-container">
            <!-- Top Hero Section: Poster + Actions on Left, Title + Information Box on Right -->
            <div class="anime-hero-section">
                <!-- Left: Poster + Watch Buttons + My List -->
                <div class="anime-hero-left">
                    <div class="anime-poster-wrapper">
                        ${a.image ? `<img src="${a.image}" alt="${title}" class="anime-poster" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder"><i class="ti ti-movie"></i></div>`}
                        ${a.score ? `<div class="anime-score-badge"><i class="ti ti-star-filled"></i> ${a.score}</div>` : ''}
                    </div>

                    <div class="anime-actions-panel">
                        ${a.shikimori_url ? `
                            <button id="watch-toggle-btn" class="btn-kodik-play" onclick="toggleWatchPlayer('${a.shikimori_url}', ${targetEpisode})">
                                <i class="ti ti-player-play"></i> <span>${i18n('anime.player_1')}</span>
                            </button>
                        ` : ''}

                        <button id="anicli-toggle-btn" class="btn-secondary btn-anicli-play" onclick="toggleAnicliPlayer('${safeTitle}', ${targetEpisode}, ${a.id})">
                            <i class="ti ti-device-tv"></i> <span>${i18n('anime.player_2')}</span>
                        </button>
                        ${a.shikimori_url ? `
                            <a href="${a.shikimori_url}" target="_blank" data-external="true" class="btn-secondary btn-shiki-link">
                                <i class="ti ti-external-link"></i> <span>Shikimori</span>
                            </a>
                        ` : ''}
                    </div>

                    ${userRateWidgetHTML}
                </div>

                <!-- Right: Title + Video Player (Above Info!) + Information Box + Description + Characters + Screenshots + Related + Videos -->
                <div class="anime-hero-right">
                    <div class="anime-header-titles">
                        <h2 class="anime-title">${title}</h2>
                        ${origTitle ? `<div class="anime-orig-title">${origTitle}</div>` : ''}
                        ${a.scored_by ? `<div class="anime-scored-by">${i18n('anime.scored_by')} ${a.scored_by.toLocaleString()}</div>` : ''}
                    </div>

                    <!-- Video Player (Appears directly ABOVE information when clicked!) -->
                    <div id="watch-player-container" class="kodik-player-wrapper hidden"></div>

                    <!-- ИНФОРМАЦИЯ Card: Beside poster, below player -->
                    <div class="anime-meta-details-card">
                        <h4><i class="ti ti-info-circle"></i> ${i18n('profile.info')}</h4>
                        <div class="anime-info-grid">
                            <div class="info-item"><span class="label">${i18n('anime.type')}</span> <span>${a.kind || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.status')}</span> <span>${a.status || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.episodes')}</span> <span>${a.episodes_aired ? `${a.episodes_aired} / ` : ''}${a.episodes || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.duration')}</span> <span>${a.duration ? `${a.duration} ${i18n('anime.min')}` : '—'}</span></div>

                            <div class="info-item"><span class="label">${i18n('anime.aired')}</span> <span>${a.aired_on || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.rating')}</span> <span>${a.rating || '—'}</span></div>
                            <div class="info-item info-full-row"><span class="label">${i18n('anime.studios')}</span> <span>${a.studios && a.studios.length ? a.studios.join(', ') : '—'}</span></div>
                            <div class="info-item info-full-row"><span class="label">${i18n('anime.genres')}</span> <span>${a.genres && a.genres.length ? a.genres.join(', ') : '—'}</span></div>
                            ${franchiseHTML}
                            ${licensedByHTML}
                        </div>
                    </div>

                    <!-- Description (Directly Below Information Card!) -->
                    <div class="anime-description-section">
                        <h3><i class="ti ti-file-text"></i> ${i18n('anime.description')}</h3>
                        <div class="anime-description-content">${a.description}</div>
                    </div>

                    <!-- Characters (Below Description!) -->
                    ${charactersHTML}

                    <!-- Screenshots (Below Characters!) -->
                    ${screenshotsHTML}

                    <!-- Related / Chronology -->
                    ${relatedHTML}

                    <!-- Videos -->
                    ${videosHTML}

                    ${externalScoresHTML}
                </div>
            </div>
        </div>
    `;

    const mobileHTML = buildMobileAnimeDetailHTML(a, targetEpisode, safeTitle, userRateWidgetHTML);

    body.innerHTML = `
        <div class="anime-detail-desktop">
            ${desktopHTML}
        </div>
        <div class="anime-detail-mobile">
            ${mobileHTML}
        </div>
    `;

    setTimeout(initMobileAnimeModalScroll, 100);
}






async function getAnimeData(animeId, source = 'shikimori') {

    try {
        const response = await fetch(`/api/anime/${source}/${animeId}`);
        if (!response.ok) throw new Error('Failed to fetch anime data');
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения данных аниме:', error);
        return null;
    }
}

async function searchAnime(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    } catch (error) {
        console.error('Ошибка поиска:', error);
        return { anime: [], other: [] };
    }
}

// ==================== CHARACTER MODAL ====================

async function openCharacterModal(charId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    pushModalState();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('character.loading') + '</div>';

    try {
        const res = await fetch(`/api/character/${charId}`);
        if (!res.ok) throw new Error(i18n('character.load_error'));
        const char = await res.json();
        renderCharacterDetail(char);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('character.load_error')}: ${err.message}</div>`;
    }
}

function toggleCharDesc(id, btn) {
    const desc = document.getElementById('char-desc-' + id);
    if (!desc) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const isCollapsed = desc.classList.contains('collapsed');
    if (isCollapsed) {
        desc.classList.remove('collapsed');
        btn.textContent = isEn ? 'Show less' : 'Свернуть';
    } else {
        desc.classList.add('collapsed');
        btn.textContent = isEn ? 'Show more' : 'Развернуть';
    }
}
window.toggleCharDesc = toggleCharDesc;

function renderCharacterDetail(char) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const poster = char.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(char.image) : char.image) : '';
    const animes = char.animes || [];
    const mangas = char.mangas || [];
    const descText = char.description || '';
    const isLongDesc = descText.length > 220;

    body.innerHTML = `
        <div class="char-view-top-bar">
            <button type="button" class="char-view-nav-btn" onclick="handleModalBack()" title="${isEn ? 'Back' : 'Назад'}">
                <i class="ti ti-arrow-left"></i>
            </button>
            <div class="char-view-nav-title">${isEn ? 'Character' : 'Персонаж'}</div>
            <button type="button" class="char-view-nav-btn" onclick="copyCharacterLink('${char.shikimori_url || ('https://shikimori.io/characters/' + char.id)}')" title="${isEn ? 'Share' : 'Поделиться'}">
                <i class="ti ti-share"></i>
            </button>
        </div>

        <div class="char-view-container">
            <!-- 1. Header with round avatar & name -->
            <div class="char-view-header">
                <div class="char-view-avatar-wrap">
                    ${poster ? `<img src="${poster}" alt="${char.name}" class="char-view-avatar" loading="lazy" decoding="async">` : `<div class="char-view-avatar placeholder"><i class="ti ti-user"></i></div>`}
                </div>
                <div class="char-view-names">
                    <h1 class="char-name-en">${char.name}</h1>
                    ${char.russian && char.russian !== char.name ? `<div class="char-name-ru">${char.russian}</div>` : ''}
                    ${char.japanese ? `<div class="char-name-ja">${char.japanese}</div>` : ''}
                </div>
            </div>

            <!-- 2. Description section -->
            ${descText ? `
                <div class="char-view-desc-section">
                    <div class="char-view-desc-text ${isLongDesc ? 'collapsed' : ''}" id="char-desc-${char.id}">
                        ${descText}
                    </div>
                    ${isLongDesc ? `
                        <div class="char-view-desc-toggle" onclick="toggleCharDesc('${char.id}', this)">${isEn ? 'Show more' : 'Развернуть'}</div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- 3. Anime section -->
            ${animes.length > 0 ? `
                <div class="char-view-media-section">
                    <h3 class="char-section-title">${isEn ? 'Anime' : 'Аниме'}</h3>
                    <div class="char-media-carousel">
                        ${animes.map(a => {
                            const aImg = a.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(a.image) : a.image) : '';
                            const metaKind = a.kind || 'TV';
                            const metaScore = a.score ? ` • ${a.score}★` : '';
                            return `
                                <div class="char-media-card" onclick="openAnimeModal(${a.id})">
                                    <div class="char-media-poster-wrap">
                                        ${aImg ? `<img src="${aImg}" alt="${a.name}" class="char-media-poster" loading="lazy">` : `<div class="char-media-poster placeholder"><i class="ti ti-movie"></i></div>`}
                                    </div>
                                    <div class="char-media-title" title="${a.name}">${a.name}</div>
                                    <div class="char-media-meta">${metaKind}${metaScore}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 4. Manga section -->
            ${mangas.length > 0 ? `
                <div class="char-view-media-section">
                    <h3 class="char-section-title">${isEn ? 'Manga & Light Novels' : 'Манга и ранобэ'}</h3>
                    <div class="char-media-carousel">
                        ${mangas.map(m => {
                            const mImg = m.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(m.image) : m.image) : '';
                            const metaKind = m.kind || 'MANGA';
                            const metaScore = m.score ? ` • ${m.score}★` : '';
                            return `
                                <div class="char-media-card" onclick="openMangaModal(${m.id})">
                                    <div class="char-media-poster-wrap">
                                        ${mImg ? `<img src="${mImg}" alt="${m.name}" class="char-media-poster" loading="lazy">` : `<div class="char-media-poster placeholder"><i class="ti ti-book"></i></div>`}
                                    </div>
                                    <div class="char-media-title" title="${m.name}">${m.name}</div>
                                    <div class="char-media-meta">${metaKind}${metaScore}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// ==================== CLUB MODAL ====================

async function openClubModal(clubId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    if (!modal.classList.contains('hidden') && body.innerHTML.trim() && !body.querySelector('.anime-modal-loader')) {
        pushModalState();
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('club.loading') + '</div>';

    try {
        const res = await fetch(`/api/club/${clubId}`);
        if (!res.ok) throw new Error(i18n('club.load_error'));
        const club = await res.json();
        renderClubDetail(club);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('club.load_error')}: ${err.message}</div>`;
    }
}

function renderClubDetail(club) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const logo = club.image || '';

    body.innerHTML = `
        <div class="mobile-anime-top-bar" id="mobile-anime-top-bar">
            <button type="button" class="mobile-anime-top-btn" onclick="handleModalBack()" title="${isEn ? 'Back' : 'Назад'}">
                <i class="ti ti-arrow-left"></i>
            </button>
            <div class="mobile-anime-top-title" id="mobile-anime-top-title">${club.name || ''}</div>
            <div style="width: 38px;"></div>
        </div>

        <div class="anime-hero-section" style="padding-top: 64px;">
            <div class="anime-hero-left">
                <div class="anime-poster-wrapper">
                    ${logo ? `<img src="${logo}" alt="${club.name}" class="anime-poster" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder"><i class="ti ti-users"></i></div>`}
                </div>
                <div class="anime-actions-panel">
                    ${club.shikimori_url ? `<a href="${club.shikimori_url}" target="_blank" data-external="true" class="btn-secondary"><i class="ti ti-external-link"></i> <span>${i18n('anime.open_shikimori')}</span></a>` : ''}
                </div>
            </div>

            <div class="anime-hero-right">
                <div class="anime-header-titles">
                    <h2 class="anime-title">${club.name}</h2>
                </div>

                <div class="anime-meta-details-card">
                    <h4><i class="ti ti-info-circle"></i> ${i18n('profile.info')}</h4>
                    <div class="anime-info-grid">
                        <div class="info-item"><span class="label">${i18n('club.members')}</span> <b>${club.members_count}</b></div>
                        <div class="info-item"><span class="label">${i18n('club.type')}</span> <span>${club.is_private ? i18n('friends.private_club') : i18n('friends.public_club')}</span></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="anime-description-section">
            <h3><i class="ti ti-file-text"></i> ${i18n('club.description')}</h3>
            <div class="anime-description-content">${club.description || '—'}</div>
        </div>
    `;
}

;
/* --- js/manga.js --- */
// ==================== MANGA MODAL & DETAILS ====================

async function openMangaModal(mangaId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    if (!modal.classList.contains('hidden') && body.innerHTML.trim() && !body.querySelector('.anime-modal-loader')) {
        if (typeof pushModalState === 'function') pushModalState();
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('manga.loading') + '</div>';

    try {
        const res = await fetch(`/api/manga/${mangaId}`);
        if (!res.ok) throw new Error(i18n('manga.load_error'));
        const manga = await res.json();
        renderMangaDetail(manga);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('manga.load_error')}: ${err.message}</div>`;
    }
}

function renderMangaUserRateWidget(manga) {
    const rate = manga.user_rate;
    const currentStatus = rate ? rate.status : '';
    const currentChapters = rate ? (rate.chapters || 0) : 0;
    const currentVolumes = rate ? (rate.volumes || 0) : 0;
    const currentScore = rate ? (rate.score || 0) : 0;
    const currentText = rate ? (rate.text || '') : '';
    const rateId = rate ? rate.id : '';
    const totalChapters = manga.chapters || 0;

    const statusMap = typeof getStatusMap === 'function' ? getStatusMap() : {};

    return `
        <div class="user-rate-widget-card" id="user-rate-widget-${manga.id}">
            <div class="user-rate-widget-header">
                <h4><i class="ti ti-bookmark"></i> ${i18n('mylist.title')}</h4>
                ${currentStatus ? `<span class="badge badge-${currentStatus}">${statusMap[currentStatus] ? (statusMap[currentStatus].label || statusMap[currentStatus].name) : currentStatus}</span>` : `<span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-muted);">${i18n('mylist.not_in_list')}</span>`}
            </div>
            <div class="user-rate-widget-body">
                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.status')}</label>
                    <select id="rate-status-select-${manga.id}" class="sort-select user-rate-select">
                        <option value="watching" ${currentStatus === 'watching' ? 'selected' : ''}>${i18n('rates.watching')}</option>
                        <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>${i18n('rates.completed')}</option>
                        <option value="planned" ${currentStatus === 'planned' ? 'selected' : (!currentStatus ? 'selected' : '')}>${i18n('rates.planned')}</option>
                        <option value="on_hold" ${currentStatus === 'on_hold' ? 'selected' : ''}>${i18n('rates.on_hold')}</option>
                        <option value="dropped" ${currentStatus === 'dropped' ? 'selected' : ''}>${i18n('rates.dropped')}</option>
                        <option value="rewatching" ${currentStatus === 'rewatching' ? 'selected' : ''}>${i18n('rates.rewatching')}</option>
                    </select>
                </div>

                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.chapters')}</label>
                    <div class="episode-stepper">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${manga.id}', -1)"><i class="ti ti-minus"></i></button>
                        <input type="number" id="rate-episodes-input-${manga.id}" class="stepper-input" min="0" max="${totalChapters || 9999}" value="${currentChapters}">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${manga.id}', 1, ${totalChapters || 0})"><i class="ti ti-plus"></i></button>
                        ${totalChapters ? `<span class="stepper-total">/ ${totalChapters}</span>` : ''}
                    </div>
                </div>

                <div class="user-rate-row user-rate-score-row">
                    <div class="user-rate-score-header">
                        <label class="user-rate-label">${i18n('mylist.score')}</label>
                        <span class="score-display-text" id="score-text-${manga.id}">${currentScore ? `${currentScore}/10` : '—'}</span>
                    </div>
                    <div class="stars-rating-container" id="stars-container-${manga.id}" data-score="${currentScore}">
                        ${[1,2,3,4,5,6,7,8,9,10].map(s => `
                            <button type="button" class="star-btn ${s <= currentScore ? 'active' : ''}" data-star="${s}" onclick="setUserRateScore('${manga.id}', ${s})" onmouseenter="previewUserRateScore('${manga.id}', ${s})" onmouseleave="resetPreviewUserRateScore('${manga.id}')" title="${s}/10">
                                <i class="ti ti-star-filled"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="user-rate-row" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <label class="user-rate-label">${i18n('mylist.note')}</label>
                    <textarea id="rate-note-input-${manga.id}" class="user-rate-textarea" placeholder="${i18n('mylist.note_placeholder')}" rows="2">${currentText}</textarea>
                </div>

                <div class="user-rate-actions">
                    <button type="button" class="btn btn-save-rate" onclick="submitUserRate('${manga.id}', 'Manga', ${rateId ? `'${rateId}'` : 'null'}, ${totalChapters || 0})">
                        <i class="ti ti-check"></i> <span>${i18n('mylist.save')}</span>
                    </button>
                    ${rateId ? `
                        <button type="button" class="btn-secondary btn-delete-rate" onclick="deleteUserRateAction('${manga.id}', 'Manga', '${rateId}')">
                            <i class="ti ti-trash"></i> <span>${i18n('mylist.delete')}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderMangaStarsHTML(score) {
    const num = parseFloat(score);
    if (!num || isNaN(num)) return '<span class="manga-stars-empty">☆☆☆☆☆</span>';
    const rating5 = num / 2;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (rating5 >= i) {
            stars += '<i class="ti ti-star-filled star-gold"></i>';
        } else if (rating5 >= i - 0.5) {
            stars += '<i class="ti ti-star-half-filled star-gold"></i>';
        } else {
            stars += '<i class="ti ti-star star-empty"></i>';
        }
    }
    return stars;
}
window.renderMangaStarsHTML = renderMangaStarsHTML;

window.toggleMangaRateWidget = function(mangaId) {
    const el = document.getElementById(`manga-rate-widget-collapse-${mangaId}`);
    if (el) el.classList.toggle('hidden');
};

window.toggleMangaDesc = function(mangaId, btn) {
    const el = document.getElementById(`manga-desc-${mangaId}`);
    if (!el) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (el.classList.contains('collapsed')) {
        el.classList.remove('collapsed');
        btn.textContent = isEn ? 'Show less' : 'Свернуть';
    } else {
        el.classList.add('collapsed');
        btn.textContent = isEn ? 'Show more' : 'Развернуть';
    }
};

function renderMangaDetail(manga) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const poster = manga.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(manga.image) : manga.image) : '';
    const title = (isEn && manga.name) ? manga.name : (manga.russian || manga.name || '');
    const origTitle = isEn ? (manga.russian || '') : ((manga.name && manga.name !== manga.russian) ? manga.name : '');
    const scoreVal = manga.score || '';
    const descText = manga.description || '';
    const isLongDesc = descText.length > 220;

    // Rates statuses stats for "В списках"
    const statsList = Array.isArray(manga.rates_statuses_stats) ? manga.rates_statuses_stats : [];
    let plannedCount = 0, completedCount = 0, readingCount = 0, droppedCount = 0, onHoldCount = 0;
    statsList.forEach(st => {
        const name = (st.name || '').toLowerCase();
        const val = parseInt(st.value, 10) || 0;
        if (name.includes('план') || name.includes('plan')) plannedCount = val;
        else if (name.includes('прочит') || name.includes('complet')) completedCount = val;
        else if (name.includes('чит') || name.includes('read')) readingCount = val;
        else if (name.includes('брош') || name.includes('drop')) droppedCount = val;
        else if (name.includes('отлож') || name.includes('hold')) onHoldCount = val;
    });
    const totalInLists = plannedCount + completedCount + readingCount + droppedCount + onHoldCount;

    // User rate info
    const rate = manga.user_rate;
    const currentStatus = rate ? rate.status : '';
    const statusMap = typeof getStatusMap === 'function' ? getStatusMap() : {};
    const statusText = currentStatus ? (statusMap[currentStatus] ? (statusMap[currentStatus].label || statusMap[currentStatus].name) : currentStatus) : (isEn ? 'Add to list' : 'Добавить в список');

    const characters = manga.characters || [];
    const related = manga.related || [];

    const userRateWidgetHTML = renderMangaUserRateWidget(manga);

    body.innerHTML = `
        <div class="manga-view-top-bar">
            <button type="button" class="manga-view-nav-btn" onclick="handleModalBack()" title="${isEn ? 'Back' : 'Назад'}">
                <i class="ti ti-arrow-left"></i>
            </button>
            <div class="manga-view-nav-title" id="manga-view-nav-title">${title}</div>
            <button type="button" class="manga-view-nav-btn" onclick="copyCharacterLink('${manga.shikimori_url || ('https://shikimori.io/mangas/' + manga.id)}')" title="${isEn ? 'Share' : 'Поделиться'}">
                <i class="ti ti-share"></i>
            </button>
        </div>

        <div class="manga-view-container">
            <!-- 1. Centered Hero Poster -->
            <div class="manga-hero-section">
                <div class="manga-hero-poster-wrap">
                    ${poster ? `<img src="${poster}" alt="${title}" class="manga-hero-poster">` : `<div class="manga-hero-poster placeholder"><i class="ti ti-book"></i></div>`}
                </div>
            </div>

            <!-- 2. Action buttons row -->
            <div class="manga-actions-scroll">
                <button type="button" class="manga-action-btn ${currentStatus ? 'active' : ''}" onclick="toggleMangaRateWidget('${manga.id}')">
                    <i class="ti ti-bookmark"></i>
                    <span>${statusText}</span>
                </button>
                ${manga.shikimori_url ? `
                    <a href="${manga.shikimori_url}#comments" target="_blank" class="manga-action-btn">
                        <i class="ti ti-message"></i>
                        <span>${isEn ? 'Discussions' : 'Обсуждение'}</span>
                    </a>
                ` : ''}
                ${manga.shikimori_url ? `
                    <a href="${manga.shikimori_url}" target="_blank" class="manga-action-btn">
                        <i class="ti ti-external-link"></i>
                        <span>Shikimori</span>
                    </a>
                ` : ''}
            </div>

            <!-- Expandable User Rate Widget Card -->
            <div id="manga-rate-widget-collapse-${manga.id}" class="manga-rate-collapse hidden">
                ${userRateWidgetHTML}
            </div>

            <!-- 3. Title & Rating -->
            <div class="manga-header-info">
                <h1 class="manga-title-main">${title}</h1>
                ${origTitle ? `<div class="manga-title-sub">${origTitle}</div>` : ''}
                <div class="manga-score-row">
                    <div class="manga-stars">${renderMangaStarsHTML(scoreVal)}</div>
                    <span class="manga-score-number">${scoreVal ? scoreVal : '—'}</span>
                </div>
            </div>

            <!-- 4. Metadata Info Grid (2 cols) -->
            <div class="manga-meta-grid">
                <div class="manga-meta-col">
                    <span class="manga-meta-label">${isEn ? 'Type' : 'Тип'}</span>
                    <span class="manga-meta-val">${manga.type_and_status || (manga.kind + ' • ' + (manga.status || (isEn ? 'Ongoing' : 'Онгоинг')))}</span>
                </div>
                <div class="manga-meta-col">
                    <span class="manga-meta-label">${isEn ? 'Aired' : 'Выходит'}</span>
                    <span class="manga-meta-val">${manga.aired_on_formatted || '—'}</span>
                </div>
            </div>

            <!-- 5. Genres / Publishers -->
            <div class="manga-genres-scroll">
                ${(manga.genres || []).map(g => `<span class="manga-genre-pill">${g}</span>`).join('')}
                ${(manga.publishers || []).map(p => `<span class="manga-genre-pill publisher">${p}</span>`).join('')}
            </div>

            <!-- 6. Description -->
            ${descText ? `
                <div class="manga-desc-section">
                    <div class="manga-desc-text ${isLongDesc ? 'collapsed' : ''}" id="manga-desc-${manga.id}">
                        ${descText}
                    </div>
                    ${isLongDesc ? `<div class="manga-desc-toggle" onclick="toggleMangaDesc('${manga.id}', this)">${isEn ? 'Show more' : 'Развернуть'}</div>` : ''}
                </div>
            ` : ''}

            <!-- 7. В списках -->
            ${totalInLists > 0 ? `
                <div class="manga-section">
                    <div class="manga-section-header">
                        <div class="manga-section-title">${isEn ? 'In lists' : 'В списках'}</div>
                        <div class="manga-section-meta">${isEn ? 'Total:' : 'Всего:'} ${totalInLists.toLocaleString()}</div>
                    </div>
                    <div class="manga-in-lists-bar">
                        <div class="bar-seg seg-planned" style="flex: ${plannedCount || 0.01};" title="${isEn ? 'Planned: ' : 'Запланировано: '}${plannedCount}"></div>
                        <div class="bar-seg seg-completed" style="flex: ${completedCount || 0.01};" title="${isEn ? 'Read: ' : 'Прочитано: '}${completedCount}"></div>
                        <div class="bar-seg seg-watching" style="flex: ${readingCount || 0.01};" title="${isEn ? 'Reading: ' : 'Читаю: '}${readingCount}"></div>
                        <div class="bar-seg seg-dropped" style="flex: ${droppedCount || 0.01};" title="${isEn ? 'Dropped: ' : 'Брошено: '}${droppedCount}"></div>
                        <div class="bar-seg seg-onhold" style="flex: ${onHoldCount || 0.01};" title="${isEn ? 'On hold: ' : 'Отложено: '}${onHoldCount}"></div>
                    </div>
                    <div class="manga-in-lists-legend">
                        <div class="legend-item"><span class="dot dot-planned"></span> <span class="label">${isEn ? 'Planned:' : 'Запланировано:'}</span> <span class="val">${plannedCount.toLocaleString()}</span></div>
                        <div class="legend-item"><span class="dot dot-completed"></span> <span class="label">${isEn ? 'Read:' : 'Прочитано:'}</span> <span class="val">${completedCount.toLocaleString()}</span></div>
                        <div class="legend-item"><span class="dot dot-watching"></span> <span class="label">${isEn ? 'Reading:' : 'Читаю:'}</span> <span class="val">${readingCount.toLocaleString()}</span></div>
                        <div class="legend-item"><span class="dot dot-dropped"></span> <span class="label">${isEn ? 'Dropped:' : 'Брошено:'}</span> <span class="val">${droppedCount.toLocaleString()}</span></div>
                        <div class="legend-item"><span class="dot dot-onhold"></span> <span class="label">${isEn ? 'On hold:' : 'Отложено:'}</span> <span class="val">${onHoldCount.toLocaleString()}</span></div>
                    </div>
                </div>
            ` : ''}

            <!-- 8. Персонажи -->
            ${characters.length > 0 ? `
                <div class="manga-section">
                    <div class="manga-section-header">
                        <div class="manga-section-title">
                            ${isEn ? 'Characters' : 'Персонажи'} <span class="manga-count-pill">${manga.characters_total || characters.length}</span>
                        </div>
                        <i class="ti ti-chevron-right section-chevron"></i>
                    </div>
                    <div class="manga-characters-scroll">
                        ${characters.map(c => {
                            const cImg = c.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(c.image) : c.image) : '';
                            return `
                                <div class="manga-character-card" onclick="openCharacterModal(${c.id})">
                                    <div class="manga-character-avatar-wrap">
                                        ${cImg ? `<img src="${cImg}" alt="${c.name}" class="manga-character-avatar" loading="lazy">` : `<div class="manga-character-avatar placeholder"><i class="ti ti-user"></i></div>`}
                                    </div>
                                    <div class="manga-character-name" title="${c.name}">${c.name}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 9. Связанное -->
            ${related.length > 0 ? `
                <div class="manga-section">
                    <div class="manga-section-header">
                        <div class="manga-section-title">
                            ${isEn ? 'Related' : 'Связанное'} (${manga.related_total || related.length})
                        </div>
                        <i class="ti ti-chevron-right section-chevron"></i>
                    </div>
                    <div class="manga-related-list">
                        ${related.map(r => {
                            const clickFn = r.is_anime ? `openAnimeModal(${r.id})` : `openMangaModal(${r.id})`;
                            const rImg = r.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(r.image) : r.image) : '';
                            return `
                                <div class="manga-related-item" onclick="${clickFn}">
                                    <div class="manga-related-thumb-wrap">
                                        ${rImg ? `<img src="${rImg}" alt="${r.name}" class="manga-related-thumb" loading="lazy">` : `<div class="manga-related-thumb placeholder"><i class="ti ti-book"></i></div>`}
                                    </div>
                                    <div class="manga-related-info">
                                        <div class="manga-related-title">${r.name}</div>
                                        <div class="manga-related-meta">${r.meta_text || r.relation || ''}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}




;
/* --- js/friends.js --- */
// ==================== FRIENDS, CLUBS & USER MODAL MODULE ====================

async function openFriendModal(userIdOrNick) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    if (!modal.classList.contains('hidden') && body.innerHTML.trim() && !body.querySelector('.anime-modal-loader')) {
        if (typeof pushModalState === 'function') pushModalState();
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('friends.load_error') + '</div>';

    try {
        const res = await fetch(`/api/friend/${encodeURIComponent(userIdOrNick)}`);
        if (!res.ok) throw new Error(i18n('friends.load_error'));
        const user = await res.json();
        renderFriendDetail(user);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('friends.load_error')}: ${err.message}</div>`;
    }
}

// Алиас для обратной совместимости
function openUserModal(userIdOrNick) {
    return openFriendModal(userIdOrNick);
}

function renderFriendDetail(user) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const avatar = user.image || '';
    const isOnline = user.last_online_at && user.last_online_at.includes(new Date().toISOString().slice(0, 10));

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    body.innerHTML = `
        <div class="mobile-anime-top-bar" id="mobile-anime-top-bar">
            <button type="button" class="mobile-anime-top-btn" onclick="handleModalBack()" title="${isEn ? 'Back' : 'Назад'}">
                <i class="ti ti-arrow-left"></i>
            </button>
            <div class="mobile-anime-top-title" id="mobile-anime-top-title">${user.name || user.nickname}</div>
            <div style="width: 38px;"></div>
        </div>

        <div class="anime-detail-container friend-modal-container" style="padding-top: 64px;">
            <div class="anime-detail-header friend-detail-header">
                <div class="anime-poster-wrapper friend-avatar-wrapper">
                    ${avatar ? `<img src="${avatar}" alt="${user.nickname}" class="friend-avatar-img">` : `<div class="friend-avatar-placeholder"><i class="ti ti-user"></i></div>`}
                    <div class="friend-online-badge ${isOnline ? 'online' : ''}" title="${isOnline ? i18n('friends.online_today') : i18n('friends.last_online') + ' ' + (user.last_online_at || '—')}">
                        <i class="ti ti-circle-filled"></i>
                    </div>
                </div>

                <div class="anime-main-info friend-main-info">
                    <h2 class="anime-title friend-title">${user.name}</h2>
                    <div class="anime-orig-title friend-nickname">@${user.nickname}</div>

                    <div class="anime-info-grid friend-info-grid">
                        <div class="info-item"><span class="label">${i18n('friends.id')}</span> <span>#${user.id}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.sex')}</span> <span>${user.sex || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.age')}</span> <span>${user.age || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.last_online')}</span> <span>${user.last_online_at || '—'}</span></div>
                    </div>

                    <div class="friend-stats-summary">
                        <div class="friend-stat-box">
                            <div class="stat-box-title"><i class="ti ti-movie"></i> ${i18n('friends.anime')}</div>
                            <div class="stat-box-values">
                                <span>${i18n('friends.watched')} <b>${user.completed_anime || 0}</b></span>
                                <span>${i18n('friends.watching')} <b>${user.watching_anime || 0}</b></span>
                            </div>
                        </div>
                        <div class="friend-stat-box">
                            <div class="stat-box-title"><i class="ti ti-book"></i> ${i18n('friends.manga')}</div>
                            <div class="stat-box-values">
                                <span>${i18n('friends.read')} <b>${user.completed_manga || 0}</b></span>
                                <span>${i18n('friends.reading')} <b>${user.reading_manga || 0}</b></span>
                            </div>
                        </div>
                    </div>

                    <div class="anime-actions friend-actions">
                        ${user.shikimori_url ? `
                            <a href="${user.shikimori_url}" target="_blank" data-external="true" class="btn-secondary">
                                <i class="ti ti-brand-shikimori"></i> ${i18n('friends.open_shikimori')}
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="anime-description-section friend-about-section">
                <h3><i class="ti ti-id"></i> ${i18n('friends.about')}</h3>
                <div class="anime-description-content">${user.about || i18n('friends.about_empty')}</div>
            </div>
        </div>
    `;
}

function renderFriends(data) {
    const container = document.getElementById('friends');
    if (!container) return;
    const friends = data.friends || [], clubs = data.clubs || [];

    const buildGrid = (items, isUser = true) => {
        if (!items.length) return '<p style="color: var(--text-muted);">' + i18n('friends.empty') + '</p>';
        return `<div class="media-grid">` + items.map(item => {
            const name = item.nickname || item.name || '';
            const img = typeof buildImgUrl === 'function' ? buildImgUrl(isUser ? (item.avatar || item.image) : (item.logo || item.image)) : (item.avatar || item.image || '');
            const onclickAttr = isUser ? `onclick="event.preventDefault(); openFriendModal('${name}');"` : `onclick="event.preventDefault(); openClubModal(${item.id});"`;
            const url = isUser ? `https://shikimori.io/${name}` : `https://shikimori.io/clubs/${item.id}`;

            return `
                <a href="${url}" class="media-item" title="${name}" ${onclickAttr}>
                    <img src="${img}" alt="${name}" loading="lazy" class="${isUser ? 'friend-grid-avatar' : 'club-grid-logo'}">
                    <div class="media-title">${name}</div>
                </a>`;
        }).join('') + `</div>`;
    };

    container.innerHTML = `
        <div class="card media-section">
            <div class="friends-view-header">
                <h3><i class="ti ti-users"></i> ${i18n('friends.friends')} (${friends.length})</h3>
            </div>
            ${buildGrid(friends, true)}
        </div>

        <div class="card media-section" style="margin-top: 20px;">
            <div class="friends-view-header">
                <h3><i class="ti ti-building-community"></i> ${i18n('friends.clubs')} (${clubs.length})</h3>
            </div>
            ${buildGrid(clubs, false)}
        </div>
    `;
}
;
/* --- js/profile.js --- */
function toggleAbout() {
    const container = document.getElementById('about-container');
    const btn = document.getElementById('toggle-about-btn');
    if (!container || !btn) return;

    if (container.classList.contains('collapsed')) {
        container.classList.remove('collapsed');
        btn.innerText = i18n('profile.collapse');
    } else {
        container.classList.add('collapsed');
        btn.innerText = i18n('profile.expand');
    }
}

async function loadRecentHistory(retries = 2) {
    const container = document.getElementById('recent-history-list');
    if (!container) return;

    try {
        const res = await fetch('/api/tab/history');
        const data = await res.json();
        if (Array.isArray(data)) cachedHistoryData = data;

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); margin: 0;">' + i18n('history.empty') + '</p>';
            return;
        }

        const renderFn = typeof renderHistoryItemHtml === 'function' ? renderHistoryItemHtml : (typeof renderDesktopHistoryItemHtml === 'function' ? renderDesktopHistoryItemHtml : null);
        if (renderFn) {
            container.innerHTML = data.slice(0, 4).map(renderFn).join('');
        }
    } catch (err) {
        if (retries > 0) {
            setTimeout(() => loadRecentHistory(retries - 1), 1500);
        } else {
            container.innerHTML = `<p style="color: var(--danger); margin: 0;">${i18n('history.load_error')}</p>`;
        }
    }
}

async function loadProfileFriendsClubs(retries = 2) {
    const container = document.getElementById('profile-friends-clubs-preview');
    if (!container) return;

    try {
        const res = await fetch('/api/tab/friends');
        const data = await res.json();
        const friends = data.friends || [];
        const clubs = data.clubs || [];

        if (!friends.length && !clubs.length) {
            if (retries > 0) {
                setTimeout(() => loadProfileFriendsClubs(retries - 1), 1500);
                return;
            }
            container.innerHTML = '<p style="color: var(--text-muted); margin: 0; font-size: 13px;">' + i18n('friends.empty') + '</p>';
            return;
        }

        let html = '<div class="mini-friends-grid">';
        friends.slice(0, 6).forEach(f => {
            const name = f.nickname || f.name || '';
            html += `<a href="https://shikimori.io/${name}" onclick="event.preventDefault(); openFriendModal('${name}');" class="mini-friend-item" title="${name}">
                <img src="${buildImgUrl(f.avatar || f.image)}" alt="${name}" loading="lazy"><span>${name}</span></a>`;
        });
        clubs.slice(0, 2).forEach(c => {
            const name = c.name || '';
            html += `<a href="https://shikimori.io/clubs/${c.id}" onclick="event.preventDefault(); openClubModal(${c.id});" class="mini-friend-item club" title="${name}">
                <img src="${buildImgUrl(c.logo || c.image)}" alt="${name}" loading="lazy"><span>${name}</span></a>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        if (retries > 0) {
            setTimeout(() => loadProfileFriendsClubs(retries - 1), 1500);
        } else {
            container.innerHTML = `<p style="color: var(--danger); margin: 0; font-size: 13px;">${i18n('friends.load_error')}</p>`;
        }
    }
}

;
/* --- js/history.js --- */
let cachedHistoryList = null;
let historySearchQuery = '';

function isMobileHistoryView() {
    return window.innerWidth <= 768 || document.body.classList.contains('mobile-view');
}

function formatHistoryDate(dateStr) {
    if (!dateStr) return '';
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) {
            const diffMin = Math.max(1, Math.floor(diffMs / (1000 * 60)));
            if (isEn) return diffMin === 1 ? 'Just now' : `${diffMin} min. ago`;
            return diffMin === 1 ? 'Только что' : `${diffMin} мин. назад`;
        }
        if (diffHours < 24) {
            if (isEn) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            const hoursWord = (diffHours === 1 || diffHours === 21) ? 'час' : ((diffHours >= 2 && diffHours <= 4) || (diffHours >= 22 && diffHours <= 24) ? 'часа' : 'часов');
            return `${diffHours} ${hoursWord} назад`;
        }

        const monthsRu = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
        const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const months = isEn ? monthsEn : monthsRu;
        const day = date.getDate();
        const month = months[date.getMonth()];
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        return `${day} ${month}, ${hours}:${mins}`;
    } catch(e) {
        return dateStr;
    }
}

function getNormalizedHistoryItems(apiList) {
    let localWatch = [];
    try {
        localWatch = JSON.parse(localStorage.getItem('shikimx_watch_history') || '[]');
    } catch(e) { localWatch = []; }

    let continueList = [];
    try {
        continueList = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
    } catch(e) { continueList = []; }

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const result = [];
    const seenKeys = new Set();

    // 1. Из локальной истории просмотров
    for (const item of localWatch) {
        const key = `${item.id}_${item.episode || 1}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            result.push({
                id: item.id,
                title: (isEn && item.name) ? item.name : (item.russian || item.title || item.name || ''),
                name: item.name || '',
                image: item.image || item.poster || '',
                episode: item.episode || 1,
                translation: item.translation || 'WinMedia',
                status: item.progress_status || (isEn ? 'Watched completely' : 'Просмотрено полностью'),
                date: item.created_at || item.updated_at || new Date().toISOString()
            });
        }
    }

    // 2. Из списка "Продолжить просмотр"
    for (const item of continueList) {
        const key = `${item.id}_${item.episode || 1}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            result.push({
                id: item.id,
                title: (isEn && item.name) ? item.name : (item.russian || item.title || item.name || ''),
                name: item.name || '',
                image: item.image || '',
                episode: item.episode || 1,
                translation: item.translation || 'Crunchyroll.Subtitles',
                status: isEn ? 'Watched completely' : 'Просмотрено полностью',
                date: item.updated_at || new Date().toISOString()
            });
        }
    }

    // 3. Из истории Shikimori (API)
    if (Array.isArray(apiList)) {
        for (const item of apiList) {
            const target = item.target || {};
            if (target.id) {
                const key = `${target.id}_api_${item.id}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    let epNum = 1;
                    const match = (item.description || '').match(/(\d+)/);
                    if (match) epNum = parseInt(match[1]);

                    let poster = '';
                    if (typeof target.image === 'string') {
                        poster = target.image;
                    } else if (target.image && typeof target.image === 'object') {
                        poster = target.image.original || target.image.main || target.image.preview || target.image.x96 || '';
                    }

                    result.push({
                        id: target.id,
                        title: (isEn && target.name) ? target.name : (target.russian || target.name || ''),
                        name: target.name || '',
                        image: poster,
                        episode: epNum,
                        translation: 'Crunchyroll.Subtitles',
                        status: isEn ? 'Watched completely' : 'Просмотрено полностью',
                        date: item.created_at || new Date().toISOString()
                    });
                }
            }
        }
    }

    return result;
}

const pendingPosterLoads = new Set();
async function fetchHistoryPosterFallback(animeId, wrapId) {
    if (!animeId || pendingPosterLoads.has(animeId)) return;
    pendingPosterLoads.add(animeId);
    try {
        const res = await fetch(`/api/anime/${animeId}`);
        if (!res.ok) return;
        const data = await res.json();
        const posterUrl = data.poster || (data.image ? (typeof data.image === 'string' ? data.image : (data.image.original || data.image.main)) : '');
        if (posterUrl) {
            const wrap = document.getElementById(wrapId);
            if (wrap) {
                const fullSrc = typeof buildImgUrl === 'function' ? buildImgUrl(posterUrl) : posterUrl;
                wrap.innerHTML = `<img src="${fullSrc}" alt="" class="mobile-history-poster" loading="lazy" decoding="async">`;
            }
        }
    } catch(e) {}
}

window.toggleHistorySearch = function() {
    const wrap = document.getElementById('mobile-history-search-wrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden');
    if (!wrap.classList.contains('hidden')) {
        const inp = document.getElementById('history-local-search');
        if (inp) inp.focus();
    }
};

window.clearHistorySearch = function() {
    historySearchQuery = '';
    const inp = document.getElementById('history-local-search');
    if (inp) inp.value = '';
    renderMobileHistoryList();
};

window.onHistorySearchInput = function(val) {
    historySearchQuery = (val || '').trim().toLowerCase();
    renderMobileHistoryList();
};

function renderMobileHistoryList() {
    const listContainer = document.getElementById('history-items-container');
    if (!listContainer) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    let items = getNormalizedHistoryItems(cachedHistoryList);

    if (historySearchQuery) {
        items = items.filter(item => {
            const title = (item.title || '').toLowerCase();
            const trans = (item.translation || '').toLowerCase();
            return title.includes(historySearchQuery) || trans.includes(historySearchQuery);
        });
    }

    if (!items.length) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 48px 10px; color: var(--text-muted);">
                <i class="ti ti-clock-off" style="font-size: 40px; opacity: 0.45; margin-bottom: 10px; display: block;"></i>
                <span style="font-size: 14px;">${historySearchQuery ? (isEn ? 'No results found' : 'Ничего не найдено') : (isEn ? 'Watch history is empty' : 'История просмотров пуста')}</span>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = items.map((item, idx) => {
        const title = item.title || (isEn ? 'Anime' : 'Аниме');
        let imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
        if (imgUrl && (imgUrl.includes('missing_original') || imgUrl.includes('missing_preview'))) {
            imgUrl = '';
        }
        const dateFormatted = formatHistoryDate(item.date);
        const metaStr = `${isEn ? 'Episode ' + (item.episode || 1) : (item.episode || 1) + ' серия'} • ${item.translation || (isEn ? 'Subtitles' : 'Субтитры')}`;
        let statusStr = item.status || (isEn ? 'Watched completely' : 'Просмотрено полностью');
        if (isEn && statusStr.includes('Просмотрено полностью')) statusStr = 'Watched completely';
        if (isEn && statusStr.includes('Просмотрено до')) statusStr = statusStr.replace('Просмотрено до', 'Watched until');
        const wrapId = `hist-poster-wrap-${item.id}-${idx}`;

        if (!imgUrl && item.id) {
            setTimeout(() => fetchHistoryPosterFallback(item.id, wrapId), 10);
        }

        return `
            <div class="mobile-history-item" onclick="if (typeof openAnimeModal === 'function') openAnimeModal(${item.id})">
                <div class="mobile-history-poster-wrap" id="${wrapId}">
                    ${imgUrl ? `<img src="${imgUrl}" alt="${title}" class="mobile-history-poster" loading="lazy" decoding="async" onerror="fetchHistoryPosterFallback(${item.id}, '${wrapId}')">` : `<div class="mobile-history-poster placeholder"><i class="ti ti-movie"></i></div>`}
                </div>
                <div class="mobile-history-info">
                    <div class="mobile-history-title" title="${title}">${title}</div>
                    <div class="mobile-history-meta">${metaStr}</div>
                    <div class="mobile-history-status">${statusStr}</div>
                    <div class="mobile-history-date">${dateFormatted}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderMobileHistoryView() {
    const container = document.getElementById('history');
    if (!container) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    container.innerHTML = `
        <div class="mobile-history-container">
            <!-- Верхняя панель: заголовок и кнопка поиска -->
            <div class="mobile-rates-top-bar">
                <div style="display: flex; align-items: center; gap: 8px; padding-left: 4px;">
                    <i class="ti ti-history" style="color: #60a5fa; font-size: 20px;"></i>
                    <span style="font-weight: 700; font-size: 16px; color: #ffffff;">${i18n('tab.history')}</span>
                </div>
                <div class="mobile-rates-top-actions">
                    <button type="button" class="mobile-rates-action-icon" onclick="toggleHistorySearch()" title="${isEn ? 'Search' : 'Поиск'}">
                        <i class="ti ti-search"></i>
                    </button>
                </div>
            </div>

            <!-- Строка поиска -->
            <div id="mobile-history-search-wrap" class="mobile-rates-search-wrap ${historySearchQuery ? '' : 'hidden'}">
                <div class="mobile-rates-search-box">
                    <i class="ti ti-search search-icon"></i>
                    <input type="text" id="history-local-search" placeholder="${isEn ? 'Search history...' : 'Поиск в истории...'}" oninput="onHistorySearchInput(this.value)" value="${historySearchQuery}">
                    ${historySearchQuery ? `<button class="search-clear-btn" onclick="clearHistorySearch()"><i class="ti ti-x"></i></button>` : ''}
                </div>
            </div>

            <!-- Список записей истории -->
            <div id="history-items-container" class="mobile-history-list"></div>
        </div>
    `;

    renderMobileHistoryList();
}

function renderDesktopHistoryItemHtml(item) {
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const target = item.target || {};
    const title = (isEn && target.name) ? target.name : (target.russian || target.name || '');
    const imgUrl = target.image ? buildImgUrl(target.image) : '';
    const targetUrl = target.url ? (target.url.startsWith('http') ? target.url : 'https://shikimori.io' + target.url) : (target.id ? `https://shikimori.io/animes/${target.id}` : '#');
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleString(isEn ? 'en-US' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    return `
        <div class="history-item">
            ${imgUrl ? `<a href="${targetUrl}" target="_blank"><img src="${imgUrl}" alt="${title}" class="history-thumb" loading="lazy"></a>` : `<div class="history-thumb-placeholder"></div>`}
            <div class="history-info">
                ${title ? `<a href="${targetUrl}" target="_blank" class="history-target">${title}</a>` : ''}
                <div class="history-desc">${item.description || '—'}</div>
            </div>
            <div class="history-date">${dateStr}</div>
        </div>`;
}

const renderHistoryItemHtml = renderDesktopHistoryItemHtml;

function renderHistory(historyList) {
    cachedHistoryList = historyList;
    const container = document.getElementById('history');
    if (!container) return;

    if (isMobileHistoryView()) {
        renderMobileHistoryView();
        return;
    }

    if (!Array.isArray(historyList) || historyList.length === 0) {
        container.innerHTML = '<div class="card"><p style="color: var(--text-muted);">' + i18n('history.empty') + '</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3><i class="ti ti-clock"></i> ${i18n('history.full')}</h3></div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${historyList.map(renderDesktopHistoryItemHtml).join('')}
            </div>
        </div>`;
}

;
/* --- js/favourites.js --- */
let cachedFavouritesData = null;
let currentFavouritesTab = localStorage.getItem('currentFavouritesTab') || 'characters';
let favouritesSearchQuery = '';

function isMobileFavouritesView() {
    return window.innerWidth <= 768 || document.body.classList.contains('mobile-view');
}

window.toggleFavouritesSearch = function() {
    const wrap = document.getElementById('mobile-favourites-search-wrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden');
    if (!wrap.classList.contains('hidden')) {
        const inp = document.getElementById('favourites-local-search');
        if (inp) inp.focus();
    }
};

window.clearFavouritesSearch = function() {
    favouritesSearchQuery = '';
    const inp = document.getElementById('favourites-local-search');
    if (inp) inp.value = '';
    renderMobileFavouritesGrid();
};

window.onFavouritesSearchInput = function(val) {
    favouritesSearchQuery = (val || '').trim().toLowerCase();
    renderMobileFavouritesGrid();
};

window.switchFavouritesTab = function(tabKey, btn) {
    currentFavouritesTab = tabKey;
    localStorage.setItem('currentFavouritesTab', tabKey);
    document.querySelectorAll('.mobile-fav-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderMobileFavouritesGrid();
};

function renderMobileFavouritesGrid() {
    const grid = document.getElementById('favourites-grid-container');
    if (!grid || !cachedFavouritesData) return;

    let items = cachedFavouritesData[currentFavouritesTab] || [];

    if (favouritesSearchQuery) {
        items = items.filter(item => {
            const ru = (item.russian || '').toLowerCase();
            const orig = (item.name || '').toLowerCase();
            return ru.includes(favouritesSearchQuery) || orig.includes(favouritesSearchQuery);
        });
    }

    if (!items.length) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 48px 10px; color: var(--text-muted);">
            <i class="ti ti-heart-broken" style="font-size: 40px; opacity: 0.45; margin-bottom: 10px; display: block;"></i>
            <span style="font-size: 14px;">${favouritesSearchQuery ? 'Ничего не найдено' : (i18n('favourites.empty') || 'В этом разделе пока ничего нет')}</span>
        </div>`;
        return;
    }

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    grid.innerHTML = items.map(item => {
        const title = (isEn && item.name) ? item.name : (item.russian || item.name || '');
        const origTitle = isEn ? (item.russian || '') : (item.name && item.russian ? item.name : '');
        const img = buildImgUrl(item.image);

        let clickFn = '';
        let subtitle = '';

        if (currentFavouritesTab === 'characters') {
            clickFn = `openCharacterModal(${item.id})`;
            subtitle = origTitle || (isEn ? 'Character' : 'Персонаж');
        } else if (currentFavouritesTab === 'animes') {
            clickFn = `openAnimeModal(${item.id})`;
            subtitle = origTitle || (isEn ? 'Anime' : 'Аниме');
        } else if (currentFavouritesTab === 'mangas') {
            clickFn = `openMangaModal(${item.id})`;
            subtitle = origTitle || (isEn ? 'Manga' : 'Манга');
        }

        const iconType = currentFavouritesTab === 'characters' ? 'user' : (currentFavouritesTab === 'animes' ? 'movie' : 'book');

        return `
            <div class="mobile-rate-card" onclick="${clickFn}">
                <div class="mobile-rate-poster-wrap">
                    ${img ? `<img src="${img}" alt="${title}" class="mobile-rate-poster" loading="lazy" decoding="async">` : `<div class="mobile-rate-poster placeholder"><i class="ti ti-${iconType}"></i></div>`}
                </div>
                <div class="mobile-rate-title" title="${title}">${title}</div>
                <div class="mobile-rate-progress">${subtitle}</div>
            </div>
        `;
    }).join('');
}

function renderMobileFavouritesView() {
    const container = document.getElementById('favourites');
    if (!container || !cachedFavouritesData) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const chars = cachedFavouritesData.characters || [];
    const animes = cachedFavouritesData.animes || [];
    const mangas = cachedFavouritesData.mangas || [];

    if (!['characters', 'animes', 'mangas'].includes(currentFavouritesTab)) {
        currentFavouritesTab = 'characters';
    }

    container.innerHTML = `
        <div class="mobile-rates-container">
            <!-- Верхняя панель: заголовок и кнопка поиска -->
            <div class="mobile-rates-top-bar">
                <div style="display: flex; align-items: center; gap: 8px; padding-left: 4px;">
                    <i class="ti ti-heart-filled" style="color: #ff9e9e; font-size: 20px;"></i>
                    <span style="font-weight: 700; font-size: 16px; color: #ffffff;">${i18n('tab.favourites')}</span>
                </div>
                <div class="mobile-rates-top-actions">
                    <button type="button" class="mobile-rates-action-icon" onclick="toggleFavouritesSearch()" title="${isEn ? 'Search' : 'Поиск'}">
                        <i class="ti ti-search"></i>
                    </button>
                </div>
            </div>

            <!-- Строка поиска -->
            <div id="mobile-favourites-search-wrap" class="mobile-rates-search-wrap ${favouritesSearchQuery ? '' : 'hidden'}">
                <div class="mobile-rates-search-box">
                    <i class="ti ti-search search-icon"></i>
                    <input type="text" id="favourites-local-search" placeholder="${isEn ? 'Search favorites...' : 'Поиск в избранном...'}" oninput="onFavouritesSearchInput(this.value)" value="${favouritesSearchQuery}">
                    ${favouritesSearchQuery ? `<button class="search-clear-btn" onclick="clearFavouritesSearch()"><i class="ti ti-x"></i></button>` : ''}
                </div>
            </div>

            <!-- Горизонтальные подчеркнутые вкладки категорий -->
            <div class="mobile-rates-status-tabs">
                <button type="button" class="mobile-rates-status-tab mobile-fav-tab ${currentFavouritesTab === 'characters' ? 'active' : ''}" onclick="switchFavouritesTab('characters', this)">
                    ${isEn ? 'Characters' : 'Персонажи'} <span style="opacity: 0.65; font-size: 13px; font-weight: 400;">(${chars.length})</span>
                </button>
                <button type="button" class="mobile-rates-status-tab mobile-fav-tab ${currentFavouritesTab === 'animes' ? 'active' : ''}" onclick="switchFavouritesTab('animes', this)">
                    ${isEn ? 'Anime' : 'Аниме'} <span style="opacity: 0.65; font-size: 13px; font-weight: 400;">(${animes.length})</span>
                </button>
                <button type="button" class="mobile-rates-status-tab mobile-fav-tab ${currentFavouritesTab === 'mangas' ? 'active' : ''}" onclick="switchFavouritesTab('mangas', this)">
                    ${isEn ? 'Manga' : 'Манга'} <span style="opacity: 0.65; font-size: 13px; font-weight: 400;">(${mangas.length})</span>
                </button>
            </div>

            <!-- Сетка постеров в 3 колонки -->
            <div id="favourites-grid-container" class="mobile-rates-3col-grid"></div>
        </div>
    `;

    renderMobileFavouritesGrid();
}

function renderDesktopFavouritesView(data) {
    const container = document.getElementById('favourites');
    if (!container) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const chars = data.characters || [], animes = data.animes || [], mangas = data.mangas || [];

    const buildGrid = (items, type) => {
        if (!items.length) return '<p style="color: var(--text-muted);">' + i18n('favourites.empty') + '</p>';
        return `<div class="media-grid">` + items.map(item => {
            const title = (isEn && item.name) ? item.name : (item.russian || item.name || '');
            const img = buildImgUrl(item.image);
            const url = item.url ? (item.url.startsWith('http') ? item.url : 'https://shikimori.io' + item.url) : `https://shikimori.io/${type}/${item.id}`;
            let clickAttr = '';
            if (type === 'animes') {
                clickAttr = `onclick="if (typeof openAnimeModal === 'function') { event.preventDefault(); openAnimeModal(${item.id}); }"`;
            } else if (type === 'mangas') {
                clickAttr = `onclick="if (typeof openMangaModal === 'function') { event.preventDefault(); openMangaModal(${item.id}); }"`;
            } else if (type === 'characters') {
                clickAttr = `onclick="if (typeof openCharacterModal === 'function') { event.preventDefault(); openCharacterModal(${item.id}); }"`;
            }
            return `
                <a href="${url}" target="_blank" ${clickAttr} class="media-item" title="${title}">
                    <img src="${img}" alt="${title}" loading="lazy" decoding="async">
                    <div class="media-title">${title}</div>
                </a>`;
        }).join('') + `</div>`;
    };

    container.innerHTML = `
        <div class="card media-section">
            <h3><i class="ti ti-user-star"></i> ${i18n('favourites.characters')} (${chars.length})</h3>
            ${buildGrid(chars, 'characters')}
        </div>
        <div class="card media-section">
            <h3><i class="ti ti-movie"></i> ${i18n('favourites.animes')} (${animes.length})</h3>
            ${buildGrid(animes, 'animes')}
        </div>
        ${mangas.length ? `<div class="card media-section">
            <h3><i class="ti ti-book"></i> ${i18n('favourites.mangas')} (${mangas.length})</h3>
            ${buildGrid(mangas, 'mangas')}
        </div>` : ''}
    `;
}

function renderFavourites(data) {
    cachedFavouritesData = data || { characters: [], animes: [], mangas: [] };
    if (isMobileFavouritesView()) {
        renderMobileFavouritesView();
    } else {
        renderDesktopFavouritesView(data);
    }
}

;
/* --- js/rates.js --- */
let currentTargetType = localStorage.getItem('currentTargetType') || 'Anime';
let currentStatusFilter = localStorage.getItem('currentStatusFilter') || 'all';
let currentSortFilter = localStorage.getItem('currentSortFilter') || 'default';
let currentSortDirection = localStorage.getItem('ratesSortDir') || 'asc';
let currentViewMode = localStorage.getItem('ratesViewMode') || 'table';
let ratesSearchQuery = '';
let collapsedSections = JSON.parse(sessionStorage.getItem('ratesCollapsedSections') || '{}');

let ratesFilters = {
    order: 'rate_updated',
    status: 'all',
    kind: 'all',
    genre: 'all',
    topic: 'all',
    season: 'all',
    duration: 'all',
    rating: 'all',
    source: 'all',
    studio: 'all',
    license: 'all',
    scoreFrom: '',
    scoreTo: ''
};

function isMobileRatesView() {
    return window.innerWidth <= 768 || document.body.classList.contains('mobile-view');
}
window.isMobileRatesView = isMobileRatesView;

function getStatusMap() {
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    return {
        'planned': { 
            name: isEn ? 'PLANNED' : 'ЗАПЛАНИРОВАНО', 
            label: isEn ? 'Planned' : 'Запланировано',
            id: 'planned', 
            order: 1, 
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>` 
        },
        'watching': { 
            name: isEn ? (currentTargetType === 'Anime' ? 'WATCHING' : 'READING') : (currentTargetType === 'Anime' ? 'СМОТРЮ' : 'ЧИТАЮ'), 
            label: isEn ? (currentTargetType === 'Anime' ? 'Watching' : 'Reading') : (currentTargetType === 'Anime' ? 'Смотрю' : 'Читаю'),
            id: 'watching', 
            order: 2, 
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>` 
        },
        'rewatching': { 
            name: isEn ? (currentTargetType === 'Anime' ? 'REWATCHING' : 'REREADING') : (currentTargetType === 'Anime' ? 'ПЕРЕСМАТРИВАЮ' : 'ПЕРЕЧИТЫВАЮ'), 
            label: isEn ? (currentTargetType === 'Anime' ? 'Rewatching' : 'Rereading') : (currentTargetType === 'Anime' ? 'Пересматриваю' : 'Перечитываю'),
            id: 'rewatching', 
            order: 3, 
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>` 
        },
        'completed': { 
            name: isEn ? (currentTargetType === 'Anime' ? 'COMPLETED' : 'READ') : (currentTargetType === 'Anime' ? 'ПРОСМОТРЕНО' : 'ПРОЧИТАНО'), 
            label: isEn ? (currentTargetType === 'Anime' ? 'Completed' : 'Read') : (currentTargetType === 'Anime' ? 'Просмотрено' : 'Прочитано'),
            id: 'completed', 
            order: 4, 
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` 
        },
        'on_hold': { 
            name: isEn ? 'ON HOLD' : 'ОТЛОЖЕНО', 
            label: isEn ? 'On hold' : 'Отложено',
            id: 'on_hold', 
            order: 5, 
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>` 
        },
        'dropped': { 
            name: isEn ? 'DROPPED' : 'БРОШЕНО', 
            label: isEn ? 'Dropped' : 'Брошено',
            id: 'dropped', 
            order: 6, 
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>` 
        }
    };
}

function getUserProfileInfo() {
    const headerAvatar = document.querySelector('.shiki-avatar')?.src || document.querySelector('.mobile-header-avatar')?.src;
    const headerName = document.querySelector('.shiki-profile-name')?.textContent || document.querySelector('.mobile-profile-menu-nickname')?.textContent;
    const user = (typeof window.currentUserData !== 'undefined' && window.currentUserData) ? window.currentUserData : {};
    const nickname = user.nickname || user.name || (headerName && headerName.trim()) || 'Musanime';
    const avatar = (user.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(user.image) : user.image) : (user.avatar || headerAvatar || '/static/icons/icon-192.png'));
    return { nickname, avatar };
}

async function openTabWithFilter(type, status) {
    currentTargetType = type;
    currentStatusFilter = status;
    ratesFilters.status = status;
    localStorage.setItem('currentTargetType', type);
    localStorage.setItem('currentStatusFilter', status);

    await openTab('rates');
    applyListFilters();
}

function switchListType(type) {
    currentTargetType = type;
    localStorage.setItem('currentTargetType', type);
    renderRatesView();
}
window.switchListType = switchListType;

async function openRatesListWithType(type) {
    currentTargetType = type;
    localStorage.setItem('currentTargetType', type);
    if (typeof handleDesktopNavClick === 'function') {
        handleDesktopNavClick('rates');
    } else if (typeof openTab === 'function') {
        await openTab('rates');
    }
    if (typeof renderRatesView === 'function') {
        renderRatesView();
    }
}
window.openRatesListWithType = openRatesListWithType;

function filterListStatus(status, btn) {
    if (currentStatusFilter === status) {
        currentStatusFilter = 'all';
        ratesFilters.status = 'all';
        localStorage.setItem('currentStatusFilter', 'all');
        document.querySelectorAll('.shiki-dock-btn').forEach(b => b.classList.remove('active'));
        const sel = document.getElementById('rates-filter-status');
        if (sel) sel.value = 'all';
        applyListFilters();
        return;
    }

    currentStatusFilter = status;
    ratesFilters.status = status;
    localStorage.setItem('currentStatusFilter', status);
    document.querySelectorAll('.shiki-dock-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const sel = document.getElementById('rates-filter-status');
    if (sel) sel.value = status;
    applyListFilters();
}

function onRatesFilterChange(field, val) {
    ratesFilters[field] = val;
    if (field === 'status') {
        currentStatusFilter = val;
        localStorage.setItem('currentStatusFilter', val);
        document.querySelectorAll('.shiki-dock-btn').forEach(b => b.classList.remove('active'));
        if (val !== 'all') {
            const btn = document.querySelector(`.shiki-dock-btn[title*="${val}"]`);
            if (btn) btn.classList.add('active');
        }
    }
    applyListFilters();
}
window.onRatesFilterChange = onRatesFilterChange;

function setRatesScorePreset(from, to) {
    ratesFilters.scoreFrom = from !== null ? String(from) : '';
    ratesFilters.scoreTo = to !== null ? String(to) : '';
    const fromInput = document.getElementById('rates-score-from');
    const toInput = document.getElementById('rates-score-to');
    if (fromInput) fromInput.value = ratesFilters.scoreFrom;
    if (toInput) toInput.value = ratesFilters.scoreTo;
    applyListFilters();
}
window.setRatesScorePreset = setRatesScorePreset;

function changeListSort(sortVal) {
    if (currentSortFilter === sortVal) {
        currentSortDirection = (currentSortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        currentSortFilter = sortVal;
        currentSortDirection = (sortVal === 'rate_score' || sortVal === 'score' || sortVal === 'episodes' || sortVal === 'updated_at' || sortVal === 'rate_updated') ? 'desc' : 'asc';
    }
    ratesFilters.order = sortVal;
    localStorage.setItem('currentSortFilter', currentSortFilter);
    localStorage.setItem('ratesSortDir', currentSortDirection);
    const sel = document.getElementById('rates-filter-order');
    if (sel) sel.value = sortVal;
    applyListFilters();
}

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('ratesViewMode', mode);
    document.querySelectorAll('.shiki-view-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.shiki-view-btn[data-view="${mode}"]`);
    if (btn) btn.classList.add('active');
    applyListFilters();
}

function toggleStatusSection(statusKey) {
    collapsedSections[statusKey] = !collapsedSections[statusKey];
    sessionStorage.setItem('ratesCollapsedSections', JSON.stringify(collapsedSections));
    applyListFilters();
}
window.toggleStatusSection = toggleStatusSection;

function onRatesSearchInput(val) {
    ratesSearchQuery = val.trim().toLowerCase();
    const input = document.getElementById('rates-local-search');
    if (input && input.value !== val) input.value = val;
    applyListFilters();
}
window.onRatesSearchInput = onRatesSearchInput;

function clearRatesSearch() {
    ratesSearchQuery = '';
    const input = document.getElementById('rates-local-search');
    if (input) input.value = '';
    applyListFilters();
}
window.clearRatesSearch = clearRatesSearch;

function getKindDisplayName(kind, isAnime, isEn) {
    if (!kind) return isAnime ? (isEn ? 'TV' : 'Сериал') : (isEn ? 'Manga' : 'Манга');
    const k = kind.toLowerCase();
    if (k === 'tv' || k === 'tv_13' || k === 'tv_24' || k === 'tv_48') return isEn ? 'TV' : 'Сериал';
    if (k === 'movie') return isEn ? 'Movie' : 'Фильм';
    if (k === 'ova') return 'OVA';
    if (k === 'ona') return 'ONA';
    if (k === 'special') return isEn ? 'Special' : 'Спешл';
    if (k === 'tv_special') return isEn ? 'TV Special' : 'TV Спешл';
    if (k === 'music') return isEn ? 'Music' : 'Клип';
    if (k === 'pv') return isEn ? 'Promo' : 'Проморолик';
    if (k === 'manga') return isEn ? 'Manga' : 'Манга';
    if (k === 'manhwa') return isEn ? 'Manhwa' : 'Манхва';
    if (k === 'manhua') return isEn ? 'Manhua' : 'Маньхуа';
    if (k === 'light_novel') return isEn ? 'Light Novel' : 'Ранобэ';
    if (k === 'novel') return isEn ? 'Novel' : 'Новелла';
    if (k === 'one_shot') return isEn ? 'One-shot' : 'Ваншот';
    if (k === 'doujin') return isEn ? 'Doujin' : 'Додзинси';
    return kind;
}

function renderRatesView() {
    const container = document.getElementById('rates');
    if (!container) return;
    if (!Array.isArray(ratesDataCache) || ratesDataCache.length === 0) {
        container.innerHTML = '<div style="margin: 40px auto; max-width: 400px; text-align: center; color: #888899;">' + (typeof i18n === 'function' ? i18n('rates.empty', 'Список пуст') : 'Список пуст') + '</div>';
        return;
    }

    const isAnime = currentTargetType === 'Anime';
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const byType = ratesDataCache.filter(r => r.target_type === currentTargetType);

    // Calculate status counts
    const counts = {
        all: byType.length,
        planned: byType.filter(r => r.status === 'planned').length,
        watching: byType.filter(r => r.status === 'watching').length,
        rewatching: byType.filter(r => r.status === 'rewatching').length,
        completed: byType.filter(r => r.status === 'completed').length,
        on_hold: byType.filter(r => r.status === 'on_hold').length,
        dropped: byType.filter(r => r.status === 'dropped').length
    };

    // Calculate Histograms Data for Right Sidebar
    const scoresStats = calculateScoresHistogram(byType);
    const typesStats = calculateTypesHistogram(byType, isAnime, isEn);
    const ratingsStats = calculateRatingsHistogram(byType, isAnime);
    const genresCloud = calculateGenresCloud(byType, isAnime, isEn);
    const studiosCloud = calculateStudiosCloud(byType, isAnime, isEn);

    // User Profile
    const { nickname, avatar } = getUserProfileInfo();
    const statusMap = getStatusMap();

    container.innerHTML = `
        <div class="shiki-page-root">
            <!-- 1. Top User Navigation Header (← Musanime / Профиль) -->
            <div class="shiki-top-nav" onclick="if(typeof openTab==='function') openTab('profile');">
                <div class="shiki-nav-user">
                    <i class="ti ti-arrow-left shiki-nav-arrow"></i>
                    <span class="shiki-nav-name">${nickname}</span>
                </div>
                <div class="shiki-nav-sub">
                    ${isEn ? 'Profile' : 'Профиль'}
                </div>
            </div>

            <!-- 2. Main Two Column Body -->
            <div class="shiki-body-columns">
                <!-- Left Main Column (List) -->
                <div class="shiki-main-col">
                    <!-- СПИСОК АНИМЕ + View Mode Icons -->
                    <div class="shiki-title-row">
                        <div class="shiki-title-text">${isAnime ? (isEn ? 'ANIME LIST' : 'СПИСОК АНИМЕ') : (isEn ? 'MANGA LIST' : 'СПИСОК МАНГИ')}</div>
                        <div class="shiki-view-buttons">
                            <button type="button" class="shiki-view-btn ${currentViewMode === 'table' ? 'active' : ''}" data-view="table" onclick="setViewMode('table')" title="${isEn ? 'Lines' : 'Строки'}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                            </button>
                            <button type="button" class="shiki-view-btn ${currentViewMode === 'cards' ? 'active' : ''}" data-view="cards" onclick="setViewMode('cards')" title="${isEn ? 'Grid' : 'Сетка'}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Search Input Box -->
                    <div class="shiki-search-row">
                        <input type="text" id="rates-local-search" class="shiki-search-input" placeholder="${isEn ? 'search' : 'поиск'}" oninput="onRatesSearchInput(this.value)" value="${ratesSearchQuery}">
                    </div>

                    <!-- Left Sticky Floating Status Dock -->
                    <div class="shiki-left-dock">
                        <button type="button" class="shiki-dock-btn ${currentStatusFilter === 'planned' ? 'active' : ''}" onclick="filterListStatus('planned', this)" title="${statusMap.planned.label}">
                            ${statusMap.planned.icon}
                            <span class="shiki-dock-counter">${counts.planned}</span>
                        </button>
                        <button type="button" class="shiki-dock-btn ${currentStatusFilter === 'watching' ? 'active' : ''}" onclick="filterListStatus('watching', this)" title="${statusMap.watching.label}">
                            ${statusMap.watching.icon}
                            <span class="shiki-dock-counter">${counts.watching}</span>
                        </button>
                        <button type="button" class="shiki-dock-btn ${currentStatusFilter === 'rewatching' ? 'active' : ''}" onclick="filterListStatus('rewatching', this)" title="${statusMap.rewatching.label}">
                            ${statusMap.rewatching.icon}
                            <span class="shiki-dock-counter">${counts.rewatching}</span>
                        </button>
                        <button type="button" class="shiki-dock-btn ${currentStatusFilter === 'completed' ? 'active' : ''}" onclick="filterListStatus('completed', this)" title="${statusMap.completed.label}">
                            ${statusMap.completed.icon}
                            <span class="shiki-dock-counter">${counts.completed}</span>
                        </button>
                        <button type="button" class="shiki-dock-btn ${currentStatusFilter === 'on_hold' ? 'active' : ''}" onclick="filterListStatus('on_hold', this)" title="${statusMap.on_hold.label}">
                            ${statusMap.on_hold.icon}
                            <span class="shiki-dock-counter">${counts.on_hold}</span>
                        </button>
                        <button type="button" class="shiki-dock-btn ${currentStatusFilter === 'dropped' ? 'active' : ''}" onclick="filterListStatus('dropped', this)" title="${statusMap.dropped.label}">
                            ${statusMap.dropped.icon}
                            <span class="shiki-dock-counter">${counts.dropped}</span>
                        </button>
                        ${currentStatusFilter !== 'all' ? `
                            <button type="button" class="shiki-dock-btn reset" onclick="filterListStatus('all', this)" title="${isEn ? 'All' : 'Все'}">
                                <span style="font-size: 11px; font-weight: bold;">ALL</span>
                                <span class="shiki-dock-counter all">${counts.all}</span>
                            </button>
                        ` : ''}
                    </div>

                    <!-- Status Sections and Tables -->
                    <div id="rates-grid-container" class="shiki-list-content"></div>
                </div>

                <!-- Right Sidebar Column (Avatar, Histograms, Genres, Studios, Filters) -->
                <div class="shiki-side-col">
                    <!-- Circular Avatar -->
                    <div class="shiki-side-avatar-box">
                        <img src="${avatar}" alt="${nickname}" class="shiki-side-avatar-img" onerror="this.src='https://shikimori.io/assets/globals/missing_avatar.png'">
                    </div>

                    <!-- ОЦЕНКИ -->
                    ${scoresStats.length ? `
                        <div class="shiki-chart-block">
                            <div class="shiki-chart-title">${isEn ? 'SCORES' : 'ОЦЕНКИ'}</div>
                            <div class="shiki-chart-body">
                                ${scoresStats.map(s => `
                                    <div class="shiki-chart-row">
                                        <div class="shiki-chart-bar-wrap">
                                            <div class="shiki-chart-bar score-fill" style="width: ${s.percent}%" title="${s.count}">
                                                ${s.count > 0 ? `<span class="shiki-chart-val">${s.count}</span>` : ''}
                                            </div>
                                        </div>
                                        <div class="shiki-chart-label">${s.score}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- ТИПЫ -->
                    ${typesStats.length ? `
                        <div class="shiki-chart-block">
                            <div class="shiki-chart-title">${isEn ? 'TYPES' : 'ТИПЫ'}</div>
                            <div class="shiki-chart-body">
                                ${typesStats.map(t => `
                                    <div class="shiki-chart-row">
                                        <div class="shiki-chart-bar-wrap">
                                            <div class="shiki-chart-bar type-fill" style="width: ${t.percent}%" title="${t.count}">
                                                ${t.count > 0 ? `<span class="shiki-chart-val">${t.count}</span>` : ''}
                                            </div>
                                        </div>
                                        <div class="shiki-chart-label type-text">${t.name}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- РЕЙТИНГИ (только для аниме) -->
                    ${isAnime && ratingsStats.length ? `
                        <div class="shiki-chart-block">
                            <div class="shiki-chart-title">${isEn ? 'RATINGS' : 'РЕЙТИНГИ'}</div>
                            <div class="shiki-chart-body">
                                ${ratingsStats.map(r => `
                                    <div class="shiki-chart-row">
                                        <div class="shiki-chart-bar-wrap">
                                            ${r.count > 0 ? `
                                                <div class="shiki-chart-bar rating-fill" style="width: ${r.percent}%" title="${r.count}">
                                                    <span class="shiki-chart-val">${r.count}</span>
                                                </div>
                                            ` : `
                                                <div class="shiki-chart-bar empty" style="width: 0;"></div>
                                            `}
                                        </div>
                                        <div class="shiki-chart-label rating-text">${r.name}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- ЖАНРЫ -->
                    ${genresCloud.length ? `
                        <div class="shiki-chart-block">
                            <div class="shiki-chart-title">${isEn ? 'GENRES' : 'ЖАНРЫ'}</div>
                            <div class="shiki-tag-cloud">
                                ${genresCloud.map(g => `
                                    <a href="javascript:void(0)" class="category ${g.tier}" onclick="onRatesSearchInput('${g.name.replace(/'/g, "\\'")}')" title="${g.name} (${g.count})">${g.name}</a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- СТУДИИ / ИЗДАТЕЛИ -->
                    ${studiosCloud.length ? `
                        <div class="shiki-chart-block">
                            <div class="shiki-chart-title">${isAnime ? (isEn ? 'STUDIOS' : 'СТУДИИ') : (isEn ? 'PUBLISHERS' : 'ИЗДАТЕЛИ')}</div>
                            <div class="shiki-tag-cloud">
                                ${studiosCloud.map(s => `
                                    <a href="javascript:void(0)" class="category ${s.tier}" onclick="onRatesSearchInput('${s.name.replace(/'/g, "\\'")}')" title="${s.name} (${s.count})">${s.name}</a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- ФИЛЬТРЫ -->
                    <div class="shiki-filters-block">
                        <div class="shiki-filters-head">${isEn ? 'FILTERS' : 'ФИЛЬТРЫ'}</div>
                        
                        <!-- Сортировка -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isEn ? 'Sort' : 'Сортировка'}</div>
                            <select id="rates-filter-order" class="c-filter-select" onchange="onRatesFilterChange('order', this.value)">
                                <option value="rate_updated" ${ratesFilters.order === 'rate_updated' ? 'selected' : ''}>${isEn ? 'by updated date' : 'по дате изменения'}</option>
                                <option value="rate_id" ${ratesFilters.order === 'rate_id' ? 'selected' : ''}>${isEn ? 'by created date' : 'по дате добавления'}</option>
                                <option value="name" ${ratesFilters.order === 'name' ? 'selected' : ''}>${isEn ? 'by title' : 'по алфавиту'}</option>
                                <option value="rate_score" ${ratesFilters.order === 'rate_score' ? 'selected' : ''}>${isEn ? 'by my score' : 'по моей оценке'}</option>
                                <option value="episodes" ${ratesFilters.order === 'episodes' ? 'selected' : ''}>${isAnime ? (isEn ? 'by episode count' : 'по числу серий') : (isEn ? 'by chapter count' : 'по числу глав')}</option>
                                <option value="kind" ${ratesFilters.order === 'kind' ? 'selected' : ''}>${isEn ? 'by type' : 'по типу'}</option>
                                <option value="status" ${ratesFilters.order === 'status' ? 'selected' : ''}>${isEn ? 'by status' : 'по статусу'}</option>
                            </select>
                        </div>

                        <!-- Статус -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isEn ? 'Status' : 'Статус'}</div>
                            <select id="rates-filter-status" class="c-filter-select" onchange="onRatesFilterChange('status', this.value)">
                                <option value="all" ${ratesFilters.status === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                <option value="planned" ${ratesFilters.status === 'planned' ? 'selected' : ''}>${statusMap.planned.label}</option>
                                <option value="watching" ${ratesFilters.status === 'watching' ? 'selected' : ''}>${statusMap.watching.label}</option>
                                <option value="rewatching" ${ratesFilters.status === 'rewatching' ? 'selected' : ''}>${statusMap.rewatching.label}</option>
                                <option value="completed" ${ratesFilters.status === 'completed' ? 'selected' : ''}>${statusMap.completed.label}</option>
                                <option value="on_hold" ${ratesFilters.status === 'on_hold' ? 'selected' : ''}>${statusMap.on_hold.label}</option>
                                <option value="dropped" ${ratesFilters.status === 'dropped' ? 'selected' : ''}>${statusMap.dropped.label}</option>
                            </select>
                        </div>

                        <!-- Тип -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isEn ? 'Type' : 'Тип'}</div>
                            <select id="rates-filter-kind" class="c-filter-select" onchange="onRatesFilterChange('kind', this.value)">
                                <option value="all" ${ratesFilters.kind === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                ${isAnime ? `
                                    <option value="tv" ${ratesFilters.kind === 'tv' ? 'selected' : ''}>${isEn ? 'TV' : 'Сериал'}</option>
                                    <option value="movie" ${ratesFilters.kind === 'movie' ? 'selected' : ''}>${isEn ? 'Movie' : 'Фильм'}</option>
                                    <option value="ova" ${ratesFilters.kind === 'ova' ? 'selected' : ''}>OVA</option>
                                    <option value="ona" ${ratesFilters.kind === 'ona' ? 'selected' : ''}>ONA</option>
                                    <option value="special" ${ratesFilters.kind === 'special' ? 'selected' : ''}>${isEn ? 'Special' : 'Спешл'}</option>
                                    <option value="tv_special" ${ratesFilters.kind === 'tv_special' ? 'selected' : ''}>${isEn ? 'TV Special' : 'TV Спешл'}</option>
                                    <option value="music" ${ratesFilters.kind === 'music' ? 'selected' : ''}>${isEn ? 'Music' : 'Клип'}</option>
                                    <option value="pv" ${ratesFilters.kind === 'pv' ? 'selected' : ''}>${isEn ? 'Promo' : 'Проморолик'}</option>
                                ` : `
                                    <option value="manga" ${ratesFilters.kind === 'manga' ? 'selected' : ''}>${isEn ? 'Manga' : 'Манга'}</option>
                                    <option value="manhwa" ${ratesFilters.kind === 'manhwa' ? 'selected' : ''}>${isEn ? 'Manhwa' : 'Манхва'}</option>
                                    <option value="manhua" ${ratesFilters.kind === 'manhua' ? 'selected' : ''}>${isEn ? 'Manhua' : 'Маньхуа'}</option>
                                    <option value="light_novel" ${ratesFilters.kind === 'light_novel' ? 'selected' : ''}>${isEn ? 'Light Novel' : 'Ранобэ'}</option>
                                    <option value="novel" ${ratesFilters.kind === 'novel' ? 'selected' : ''}>${isEn ? 'Novel' : 'Новелла'}</option>
                                    <option value="one_shot" ${ratesFilters.kind === 'one_shot' ? 'selected' : ''}>${isEn ? 'One-shot' : 'Ваншот'}</option>
                                    <option value="doujin" ${ratesFilters.kind === 'doujin' ? 'selected' : ''}>${isEn ? 'Doujinshi' : 'Додзинси'}</option>
                                `}
                            </select>
                        </div>

                        <!-- Жанры -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isEn ? 'Genres' : 'Жанры'}</div>
                            <select id="rates-filter-genre" class="c-filter-select" onchange="onRatesFilterChange('genre', this.value)">
                                <option value="all" ${ratesFilters.genre === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                ${genresCloud.map(g => `<option value="${g.name}" ${ratesFilters.genre === g.name ? 'selected' : ''}>${g.name}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Темы -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isEn ? 'Themes' : 'Темы'}</div>
                            <select id="rates-filter-topic" class="c-filter-select" onchange="onRatesFilterChange('topic', this.value)">
                                <option value="all" ${ratesFilters.topic === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                ${calculateThemesList(byType, isEn).map(t => `<option value="${t}" ${ratesFilters.topic === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Сезон и год / Год -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isAnime ? (isEn ? 'Season and year' : 'Сезон и год') : (isEn ? 'Year' : 'Год')}</div>
                            <select id="rates-filter-season" class="c-filter-select" onchange="onRatesFilterChange('season', this.value)">
                                <option value="all" ${ratesFilters.season === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                ${calculateSeasonsList(byType, isEn).map(s => `<option value="${s.val}" ${ratesFilters.season === s.val ? 'selected' : ''}>${s.label}</option>`).join('')}
                            </select>
                        </div>

                        ${isAnime ? `
                            <!-- Длительность серии -->
                            <div class="c-ms-field">
                                <div class="c-ms-title">${isEn ? 'Episode duration' : 'Длительность серии'}</div>
                                <select id="rates-filter-duration" class="c-filter-select" onchange="onRatesFilterChange('duration', this.value)">
                                    <option value="all" ${ratesFilters.duration === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                    <option value="s" ${ratesFilters.duration === 's' ? 'selected' : ''}>${isEn ? 'Under 10 mins (S)' : 'До 10 минут (S)'}</option>
                                    <option value="m" ${ratesFilters.duration === 'm' ? 'selected' : ''}>${isEn ? 'Under 30 mins (M)' : 'До 30 минут (M)'}</option>
                                    <option value="l" ${ratesFilters.duration === 'l' ? 'selected' : ''}>${isEn ? 'Over 30 mins (L)' : 'Более 30 минут (L)'}</option>
                                </select>
                            </div>

                            <!-- Возрастной рейтинг -->
                            <div class="c-ms-field">
                                <div class="c-ms-title">${isEn ? 'Age rating' : 'Возрастной рейтинг'}</div>
                                <select id="rates-filter-rating" class="c-filter-select" onchange="onRatesFilterChange('rating', this.value)">
                                    <option value="all" ${ratesFilters.rating === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                    <option value="pg" ${ratesFilters.rating === 'pg' ? 'selected' : ''}>PG</option>
                                    <option value="pg_13" ${ratesFilters.rating === 'pg_13' ? 'selected' : ''}>PG-13</option>
                                    <option value="r_17" ${ratesFilters.rating === 'r_17' ? 'selected' : ''}>R-17</option>
                                    <option value="r_plus" ${ratesFilters.rating === 'r_plus' ? 'selected' : ''}>R+</option>
                                </select>
                            </div>

                            <!-- Первоисточник -->
                            <div class="c-ms-field">
                                <div class="c-ms-title">${isEn ? 'Source' : 'Первоисточник'}</div>
                                <select id="rates-filter-source" class="c-filter-select" onchange="onRatesFilterChange('source', this.value)">
                                    <option value="all" ${ratesFilters.source === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                    <option value="manga" ${ratesFilters.source === 'manga' ? 'selected' : ''}>${isEn ? 'Manga' : 'Манга'}</option>
                                    <option value="light_novel" ${ratesFilters.source === 'light_novel' ? 'selected' : ''}>${isEn ? 'Light Novel' : 'Ранобэ'}</option>
                                    <option value="original" ${ratesFilters.source === 'original' ? 'selected' : ''}>${isEn ? 'Original' : 'Оригинал'}</option>
                                    <option value="visual_novel" ${ratesFilters.source === 'visual_novel' ? 'selected' : ''}>${isEn ? 'Visual Novel' : 'Визуальная новелла'}</option>
                                    <option value="game" ${ratesFilters.source === 'game' ? 'selected' : ''}>${isEn ? 'Game' : 'Игра'}</option>
                                    <option value="web_manga" ${ratesFilters.source === 'web_manga' ? 'selected' : ''}>${isEn ? 'Web Manga' : 'Веб-манга'}</option>
                                    <option value="novel" ${ratesFilters.source === 'novel' ? 'selected' : ''}>${isEn ? 'Novel' : 'Книга / Новелла'}</option>
                                    <option value="other" ${ratesFilters.source === 'other' ? 'selected' : ''}>${isEn ? 'Other' : 'Другое'}</option>
                                </select>
                            </div>
                        ` : ''}

                        <!-- Студия / Издатель -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isAnime ? (isEn ? 'Studio' : 'Студия') : (isEn ? 'Publisher' : 'Издатель')}</div>
                            <select id="rates-filter-studio" class="c-filter-select" onchange="onRatesFilterChange('studio', this.value)">
                                <option value="all" ${ratesFilters.studio === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                ${studiosCloud.map(s => `<option value="${s.name}" ${ratesFilters.studio === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Лицензия -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isEn ? 'License' : 'Лицензия'}</div>
                            <select id="rates-filter-license" class="c-filter-select" onchange="onRatesFilterChange('license', this.value)">
                                <option value="all" ${ratesFilters.license === 'all' ? 'selected' : ''}>${isEn ? 'any' : 'любой'}</option>
                                <option value="has_license" ${ratesFilters.license === 'has_license' ? 'selected' : ''}>${isEn ? 'Any licensed' : 'Любая лицензия'}</option>
                                <option value="Crunchyroll" ${ratesFilters.license === 'Crunchyroll' ? 'selected' : ''}>Crunchyroll</option>
                                <option value="Кинопоиск" ${ratesFilters.license === 'Кинопоиск' ? 'selected' : ''}>${isEn ? 'Kinopoisk' : 'Кинопоиск'}</option>
                                <option value="Wakanim" ${ratesFilters.license === 'Wakanim' ? 'selected' : ''}>Wakanim</option>
                                <option value="Netflix" ${ratesFilters.license === 'Netflix' ? 'selected' : ''}>Netflix</option>
                                <option value="Истари Комикс" ${ratesFilters.license === 'Истари Комикс' ? 'selected' : ''}>${isEn ? 'Istari Comics' : 'Истари Комикс'}</option>
                                <option value="Reanimedia" ${ratesFilters.license === 'Reanimedia' ? 'selected' : ''}>Reanimedia</option>
                                <option value="AniLibria" ${ratesFilters.license === 'AniLibria' ? 'selected' : ''}>AniLibria</option>
                                <option value="DEEP" ${ratesFilters.license === 'DEEP' ? 'selected' : ''}>DEEP</option>
                            </select>
                        </div>

                        <!-- Рейтинг (Оценка) -->
                        <div class="c-ms-field">
                            <div class="c-ms-title">${isEn ? 'Score' : 'Рейтинг'}</div>
                            <div class="c-score-inputs">
                                <input type="number" id="rates-score-from" class="c-score-input" placeholder="${isEn ? 'from' : 'от'}" min="0" max="10" value="${ratesFilters.scoreFrom}" oninput="onRatesFilterChange('scoreFrom', this.value)">
                                <input type="number" id="rates-score-to" class="c-score-input" placeholder="${isEn ? 'to' : 'до'}" min="0" max="10" value="${ratesFilters.scoreTo}" oninput="onRatesFilterChange('scoreTo', this.value)">
                            </div>
                            <div class="c-score-presets">
                                <button type="button" class="c-score-preset" onclick="setRatesScorePreset(8, 10)">${isEn ? 'Best' : 'Лучшее'}</button>
                                <button type="button" class="c-score-preset" onclick="setRatesScorePreset(6, 7)">${isEn ? 'Good' : 'Хорошее'}</button>
                                <button type="button" class="c-score-preset" onclick="setRatesScorePreset(4, 5)">${isEn ? 'Average' : 'Средние'}</button>
                                <button type="button" class="c-score-preset" onclick="setRatesScorePreset(1, 3)">${isEn ? 'Poor' : 'Слабые'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    applyListFilters();
}

function calculateScoresHistogram(rates) {
    const counts = {};
    for (let i = 10; i >= 1; i--) counts[i] = 0;
    rates.forEach(r => {
        const sc = parseInt(r.score, 10);
        if (sc >= 1 && sc <= 10) counts[sc] = (counts[sc] || 0) + 1;
    });

    const maxCount = Math.max(1, ...Object.values(counts));
    const result = [];
    for (let i = 10; i >= 1; i--) {
        result.push({
            score: i,
            count: counts[i],
            percent: ((counts[i] / maxCount) * 100).toFixed(1)
        });
    }
    return result;
}

function calculateTypesHistogram(rates, isAnime, isEn) {
    const counts = {};
    rates.forEach(r => {
        const target = r.target_data || r.anime || r.manga || {};
        const kindDisplay = getKindDisplayName(target.kind, isAnime, isEn);
        counts[kindDisplay] = (counts[kindDisplay] || 0) + 1;
    });

    const maxCount = Math.max(1, ...Object.values(counts));
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
            name: name,
            count: count,
            percent: ((count / maxCount) * 100).toFixed(1)
        }));
}

function calculateRatingsHistogram(rates, isAnime) {
    if (!isAnime) return [];
    const counts = { 'PG': 0, 'PG-13': 0, 'R-17': 0, 'R+': 0 };
    rates.forEach(r => {
        const target = r.target_data || r.anime || {};
        let rating = (target.rating || '').toLowerCase().replace('-', '_');
        if (rating === 'pg_13' || rating === 'pg13') counts['PG-13']++;
        else if (rating === 'r' || rating === 'r_17' || rating === 'r17') counts['R-17']++;
        else if (rating === 'r_plus' || rating === 'rplus' || rating === 'r+') counts['R+']++;
        else if (rating === 'pg') counts['PG']++;
    });

    const maxCount = Math.max(1, ...Object.values(counts));
    return ['PG', 'PG-13', 'R-17', 'R+'].map(name => ({
        name: name,
        count: counts[name] || 0,
        percent: (((counts[name] || 0) / maxCount) * 100).toFixed(1)
    }));
}

function calculateGenresCloud(rates, isAnime, isEn) {
    const counts = {};
    rates.forEach(r => {
        const target = r.target_data || r.anime || r.manga || {};
        const genres = target.genres || [];
        genres.forEach(g => {
            const name = typeof g === 'object' ? ((isEn && g.name) ? g.name : (g.russian || g.name)) : g;
            if (name) counts[name] = (counts[name] || 0) + 1;
        });
    });

    const entries = Object.entries(counts);
    if (!entries.length) return [];

    const maxCount = Math.max(1, ...entries.map(e => e[1]));
    const minCount = Math.min(...entries.map(e => e[1]));

    return entries
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => {
            let tier = 't0';
            const ratio = (count - minCount) / Math.max(1, (maxCount - minCount));
            if (ratio >= 0.75) tier = 't4';
            else if (ratio >= 0.5) tier = 't3';
            else if (ratio >= 0.25) tier = 't2';
            else if (ratio >= 0.1) tier = 't1';
            return { name, count, tier };
        });
}

function calculateStudiosCloud(rates, isAnime, isEn) {
    const counts = {};
    rates.forEach(r => {
        const target = r.target_data || r.anime || r.manga || {};
        const list = isAnime ? (target.studios || []) : (target.publishers || target.studios || []);
        list.forEach(s => {
            const name = typeof s === 'object' ? (s.filtered_name || s.name) : s;
            if (name) counts[name] = (counts[name] || 0) + 1;
        });
    });

    const entries = Object.entries(counts);
    if (!entries.length) return [];

    const maxCount = Math.max(1, ...entries.map(e => e[1]));
    const minCount = Math.min(...entries.map(e => e[1]));

    return entries
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => {
            let tier = 't0';
            const ratio = (count - minCount) / Math.max(1, (maxCount - minCount));
            if (ratio >= 0.75) tier = 't4';
            else if (ratio >= 0.5) tier = 't3';
            else if (ratio >= 0.25) tier = 't2';
            else if (ratio >= 0.1) tier = 't1';
            return { name, count, tier };
        });
}

function calculateThemesList(rates, isEn) {
    const defaultThemesRu = [
        'Школа', 'Военное', 'Исторический', 'Игры', 'Демоны', 'Вампиры', 'Гарем', 'Этти',
        'Самураи', 'Космос', 'Супер сила', 'Пародия', 'Безумие', 'Полиция', 'Боевые искусства',
        'Исекай', 'Гурман', 'Меха', 'Музыка', 'Психологическое', 'Сверхъестественное',
        'Путешествие во времени', 'Взрослые персонажи', 'Городское фэнтези', 'Жестокость',
        'Удостоено наград', 'Детектив', 'Магия'
    ];
    const defaultThemesEn = [
        'School', 'Military', 'Historical', 'Game', 'Demons', 'Vampires', 'Harem', 'Ecchi',
        'Samurai', 'Space', 'Super Power', 'Parody', 'Dementia', 'Police', 'Martial Arts',
        'Isekai', 'Gourmet', 'Mecha', 'Music', 'Psychological', 'Supernatural',
        'Time Travel', 'Adult Cast', 'Urban Fantasy', 'Gore', 'Award Winning', 'Detective', 'Magic'
    ];
    const list = isEn ? defaultThemesEn : defaultThemesRu;
    const found = new Set();
    rates.forEach(r => {
        const target = r.target_data || r.anime || r.manga || {};
        const genres = target.genres || [];
        genres.forEach(g => {
            const name = typeof g === 'object' ? ((isEn && g.name) ? g.name : (g.russian || g.name)) : g;
            if (name && list.includes(name)) found.add(name);
        });
    });
    if (found.size > 0) return Array.from(found).sort((a, b) => a.localeCompare(b, isEn ? 'en' : 'ru'));
    return list.slice(0, 15);
}

function calculateSeasonsList(rates, isEn) {
    const seasonsMap = {
        'winter': isEn ? 'Winter' : 'Зима',
        'spring': isEn ? 'Spring' : 'Весна',
        'summer': isEn ? 'Summer' : 'Лето',
        'fall': isEn ? 'Fall' : 'Осень'
    };
    const yearsSet = new Set();
    const seasonsSet = new Set();

    rates.forEach(r => {
        const target = r.target_data || r.anime || r.manga || {};
        const aired = target.aired_on || '';
        if (aired && aired.length >= 4) {
            const y = parseInt(aired.substring(0, 4), 10);
            if (!isNaN(y) && y > 1960 && y < 2030) yearsSet.add(y);
        }
        const s = target.season || '';
        if (s && s.includes('_')) {
            seasonsSet.add(s);
        }
    });

    const result = [];
    Array.from(seasonsSet).sort().reverse().forEach(s => {
        const [part, yr] = s.split('_');
        const pLabel = seasonsMap[part] || part;
        result.push({ val: s, label: `${pLabel} ${yr}` });
    });

    Array.from(yearsSet).sort((a, b) => b - a).forEach(y => {
        result.push({ val: String(y), label: String(y) });
    });

    if (result.length === 0) {
        ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2010-е', '2000-е', '1990-е'].forEach(y => {
            result.push({ val: y, label: y });
        });
    }

    return result;
}

function sortRatesList(rates, criterion, direction = 'desc') {
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const mult = direction === 'asc' ? 1 : -1;

    return [...rates].sort((a, b) => {
        const targetA = a.target_data || a.anime || a.manga || {};
        const targetB = b.target_data || b.anime || b.manga || {};
        switch (criterion) {
            case 'score':
            case 'rate_score': {
                const scA = parseInt(a.score || 0, 10);
                const scB = parseInt(b.score || 0, 10);
                if (scA === 0 && scB > 0) return 1;
                if (scB === 0 && scA > 0) return -1;
                if (scA === 0 && scB === 0) return 0;
                return mult * (scA - scB);
            }
            case 'name': {
                const nameA = (isEn && targetA.name) ? targetA.name : (targetA.russian || targetA.name || '');
                const nameB = (isEn && targetB.name) ? targetB.name : (targetB.russian || targetB.name || '');
                return mult * nameA.localeCompare(nameB, isEn ? 'en' : 'ru');
            }
            case 'episodes': {
                const curA = parseInt(a.episodes ?? a.chapters ?? 0, 10);
                const curB = parseInt(b.episodes ?? b.chapters ?? 0, 10);
                const totalA = parseInt(targetA.episodes ?? targetA.chapters ?? 0, 10);
                const totalB = parseInt(targetB.episodes ?? targetB.chapters ?? 0, 10);
                
                if (curA !== curB) {
                    return mult * (curA - curB);
                }
                return mult * (totalA - totalB);
            }
            case 'kind': {
                const kindA = targetA.kind || '';
                const kindB = targetB.kind || '';
                return mult * kindA.localeCompare(kindB);
            }
            case 'rate_id':
            case 'id':
            case 'default': {
                const idA = parseInt(a.id || a.target_id || 0, 10);
                const idB = parseInt(b.id || b.target_id || 0, 10);
                return mult * (idA - idB);
            }
            case 'status': {
                const stA = a.status || '';
                const stB = b.status || '';
                return mult * stA.localeCompare(stB);
            }
            case 'updated_at':
            case 'rate_updated':
            default: {
                const dateA = new Date(a.updated_at || 0).getTime();
                const dateB = new Date(b.updated_at || 0).getTime();
                return mult * (dateA - dateB);
            }
        }
    });
}

function filterRateItem(item) {
    const target = item.target_data || item.anime || item.manga || {};
    
    // Status filter
    const activeStatus = ratesFilters.status !== 'all' ? ratesFilters.status : currentStatusFilter;
    if (activeStatus !== 'all' && item.status !== activeStatus) {
        return false;
    }
    // Type filter
    if (ratesFilters.kind !== 'all') {
        const k = (target.kind || '').toLowerCase();
        if (ratesFilters.kind === 'tv' && !k.startsWith('tv')) return false;
        else if (ratesFilters.kind !== 'tv' && k !== ratesFilters.kind) return false;
    }
    // Genre filter
    if (ratesFilters.genre !== 'all') {
        const genres = target.genres || [];
        const matches = genres.some(g => {
            const name = typeof g === 'object' ? (g.name || g.russian) : g;
            return name === ratesFilters.genre || (g.russian && g.russian === ratesFilters.genre);
        });
        if (!matches) return false;
    }
    // Theme (Topic) filter
    if (ratesFilters.topic !== 'all') {
        const genres = target.genres || [];
        const matches = genres.some(g => {
            const name = typeof g === 'object' ? (g.name || g.russian) : g;
            return name === ratesFilters.topic || (g.russian && g.russian === ratesFilters.topic);
        });
        if (!matches) return false;
    }
    // Season and year filter
    if (ratesFilters.season !== 'all') {
        const selSeason = ratesFilters.season;
        const targetSeason = target.season || '';
        const targetAired = target.aired_on || '';
        if (selSeason.includes('_')) {
            if (targetSeason !== selSeason) return false;
        } else if (selSeason.endsWith('-е')) {
            const decade = parseInt(selSeason, 10);
            const yr = parseInt(targetAired.substring(0, 4), 10);
            if (isNaN(yr) || yr < decade || yr > decade + 9) return false;
        } else {
            if (!targetAired.startsWith(selSeason) && !targetSeason.includes(selSeason)) return false;
        }
    }
    // Duration filter
    if (ratesFilters.duration !== 'all') {
        const dur = parseInt(target.duration || 0, 10);
        if (ratesFilters.duration === 's' && (dur <= 0 || dur > 10)) return false;
        if (ratesFilters.duration === 'm' && (dur <= 10 || dur > 30)) return false;
        if (ratesFilters.duration === 'l' && dur <= 30) return false;
    }
    // Source filter
    if (ratesFilters.source !== 'all') {
        const origin = (target.origin || target.source || '').toLowerCase();
        if (origin && !origin.includes(ratesFilters.source)) return false;
    }
    // Studio filter
    if (ratesFilters.studio !== 'all') {
        const studios = target.studios || [];
        const matches = studios.some(s => {
            const name = typeof s === 'object' ? (s.name || s.filtered_name) : s;
            return name === ratesFilters.studio;
        });
        if (!matches) return false;
    }
    // License filter
    if (ratesFilters.license !== 'all') {
        const licensors = target.licensors || [];
        if (ratesFilters.license === 'has_license') {
            if (!licensors || licensors.length === 0) return false;
        } else {
            const matches = licensors.some(l => (typeof l === 'string' ? l : (l.name || '')).toLowerCase().includes(ratesFilters.license.toLowerCase()));
            if (!matches) return false;
        }
    }
    // Rating filter
    if (ratesFilters.rating !== 'all') {
        let r = (target.rating || '').toLowerCase().replace('-', '_');
        if (r === 'r_17') r = 'r';
        let targetRating = ratesFilters.rating.toLowerCase().replace('-', '_');
        if (targetRating === 'r_17') targetRating = 'r';
        if (r !== targetRating) return false;
    }
    // Score range
    const sc = parseInt(item.score || 0, 10);
    if (ratesFilters.scoreFrom !== '' && sc < parseInt(ratesFilters.scoreFrom, 10)) {
        return false;
    }
    if (ratesFilters.scoreTo !== '' && sc > parseInt(ratesFilters.scoreTo, 10)) {
        return false;
    }
    // Search query
    if (ratesSearchQuery) {
        const name = (target.name || '').toLowerCase();
        const russian = (target.russian || '').toLowerCase();
        if (!name.includes(ratesSearchQuery) && !russian.includes(ratesSearchQuery)) {
            return false;
        }
    }
    return true;
}

function applyListFilters() {
    const grid = document.getElementById('rates-grid-container');
    if (!grid) return;

    const byType = ratesDataCache.filter(r => r.target_type === currentTargetType);
    const isAnime = currentTargetType === 'Anime';
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const statusMap = getStatusMap();

    // Standard Shikimori status order
    const statusKeys = ['planned', 'watching', 'rewatching', 'completed', 'on_hold', 'dropped'];
    const activeStatus = ratesFilters.status !== 'all' ? ratesFilters.status : currentStatusFilter;
    const activeOrder = ratesFilters.order || currentSortFilter || 'rate_updated';

    let sectionsToRender = [];

    if (activeStatus === 'all') {
        statusKeys.forEach(stKey => {
            let items = byType.filter(r => r.status === stKey && filterRateItem(r));
            items = sortRatesList(items, activeOrder, currentSortDirection);
            if (items.length > 0) {
                sectionsToRender.push({
                    key: stKey,
                    info: statusMap[stKey],
                    items: items
                });
            }
        });
    } else {
        let items = byType.filter(r => r.status === activeStatus && filterRateItem(r));
        items = sortRatesList(items, activeOrder, currentSortDirection);
        if (statusMap[activeStatus]) {
            sectionsToRender.push({
                key: activeStatus,
                info: statusMap[activeStatus],
                items: items
            });
        }
    }

    if (sectionsToRender.length === 0) {
        grid.innerHTML = '<div style="padding: 40px 0; color: #777788; font-size: 13px;">' + (isEn ? 'No records found' : 'Записей не найдено') + '</div>';
        return;
    }

    if (currentViewMode === 'table') {
        grid.innerHTML = sectionsToRender.map(sec => renderShikimoriTableSection(sec, isAnime, isEn)).join('');
    } else {
        grid.innerHTML = sectionsToRender.map(sec => renderDesktopCardsSection(sec, isAnime, isEn)).join('');
    }
}

// 1. SHIKIMORI TABLE SECTION (b-table list-lines)
function getSortIndicator(col) {
    if (currentSortFilter === col) {
        return currentSortDirection === 'asc' ? ' <span class="shiki-sort-arrow asc">▲</span>' : ' <span class="shiki-sort-arrow desc">▼</span>';
    }
    return '';
}

function renderShikimoriTableSection(sec, isAnime, isEn) {
    const isCollapsed = !!collapsedSections[sec.key];
    const collapseText = isCollapsed ? (isEn ? `expand (${sec.items.length})` : `развернуть (${sec.items.length})`) : (isEn ? `collapse (${sec.items.length})` : `свернуть (${sec.items.length})`);

    return `
        <div class="shiki-section-block" data-status="${sec.key}">
            <div class="shiki-section-head">
                <span class="shiki-sec-title">${sec.info.name}</span>
                <button type="button" class="shiki-sec-collapse" onclick="toggleStatusSection('${sec.key}')">
                    ${collapseText}
                </button>
            </div>

            ${!isCollapsed ? `
                <table class="shiki-table-lines">
                    <thead>
                        <tr>
                            <th class="th-index ${currentSortFilter === 'default' ? 'active-sort' : ''}" onclick="changeListSort('default')" title="${isEn ? 'Sort by order' : 'Сортировка по порядку'}">#${getSortIndicator('default')}</th>
                            <th class="th-name ${currentSortFilter === 'name' ? 'active-sort' : ''}" onclick="changeListSort('name')" title="${isEn ? 'Sort by title' : 'Сортировка по названию'}">${isEn ? 'Title' : 'Название'}${getSortIndicator('name')}</th>
                            <th class="th-score ${currentSortFilter === 'rate_score' ? 'active-sort' : ''}" onclick="changeListSort('rate_score')" title="${isEn ? 'Sort by score' : 'Сортировка по оценке'}">${isEn ? 'Score' : 'Оценка'}${getSortIndicator('rate_score')}</th>
                            <th class="th-episodes ${currentSortFilter === 'episodes' ? 'active-sort' : ''}" onclick="changeListSort('episodes')" title="${isEn ? 'Sort by episodes' : 'Сортировка по эпизодам'}">${isAnime ? (isEn ? 'Episodes' : 'Эпизоды') : (isEn ? 'Chapters' : 'Главы')}${getSortIndicator('episodes')}</th>
                            <th class="th-type ${currentSortFilter === 'kind' ? 'active-sort' : ''}" onclick="changeListSort('kind')" title="${isEn ? 'Sort by type' : 'Сортировка по типу'}">${isEn ? 'Type' : 'Тип'}${getSortIndicator('kind')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sec.items.map((rate, idx) => renderShikimoriTableRow(rate, idx + 1, isAnime, isEn)).join('')}
                    </tbody>
                </table>
            ` : ''}
        </div>
    `;
}

function renderShikimoriTableRow(rate, index, isAnime, isEn) {
    const target = rate.target_data || rate.anime || rate.manga || {};
    const title = (isEn && target.name) ? target.name : (target.russian || target.name || `#${rate.target_id}`);
    const clickAction = isAnime ? `openAnimeModal(${rate.target_id})` : `openMangaModal(${rate.target_id})`;
    const totalCount = isAnime ? (target.episodes || 0) : (target.chapters || 0);
    const curCount = isAnime ? (rate.episodes ?? 0) : (rate.chapters ?? 0);
    const scoreVal = rate.score ? rate.score : '–';
    const kindStr = getKindDisplayName(target.kind, isAnime, isEn);

    // Status tag (e.g. Анонс / Онгоинг)
    let statusTagHTML = '';
    if (target.status === 'anons') {
        statusTagHTML = `<span class="tag-anons">${isEn ? 'Announced' : 'Анонс'}</span>`;
    } else if (target.status === 'ongoing') {
        statusTagHTML = `<span class="tag-ongoing">${isEn ? 'Ongoing' : 'Онгоинг'}</span>`;
    }

    return `
        <tr class="shiki-row">
            <td class="td-index">${index}</td>
            <td class="td-name">
                <a href="javascript:void(0)" onclick="${clickAction}" class="title-link" title="${title}">${title}</a>
                ${statusTagHTML}
            </td>
            <td class="td-score">${scoreVal}</td>
            <td class="td-episodes">${curCount} / ${totalCount > 0 ? totalCount : '?'}</td>
            <td class="td-type">${kindStr}</td>
        </tr>
    `;
}

// 2. CARDS / GRID VIEW SECTION
function renderDesktopCardsSection(sec, isAnime, isEn) {
    const isCollapsed = !!collapsedSections[sec.key];
    const collapseText = isCollapsed ? (isEn ? `expand (${sec.items.length})` : `развернуть (${sec.items.length})`) : (isEn ? `collapse (${sec.items.length})` : `свернуть (${sec.items.length})`);

    return `
        <div class="shiki-section-block" data-status="${sec.key}">
            <div class="shiki-section-head">
                <span class="shiki-sec-title">${sec.info.name}</span>
                <button type="button" class="shiki-sec-collapse" onclick="toggleStatusSection('${sec.key}')">
                    ${collapseText}
                </button>
            </div>

            ${!isCollapsed ? `
                <div class="shiki-grid-items">
                    ${sec.items.map(r => renderRateCardItem(r, isAnime, isEn)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function renderRateCardItem(rate, isAnime, isEn) {
    const targetObj = rate.target_data || rate.anime || rate.manga || {};
    const title = (isEn && targetObj.name) ? targetObj.name : (targetObj.russian || targetObj.name || `#${rate.target_id}`);
    const clickFn = isAnime ? `openAnimeModal(${rate.target_id})` : `openMangaModal(${rate.target_id})`;
    const imgUrl = targetObj.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(targetObj.image) : targetObj.image) : '';
    const totalCount = isAnime ? (targetObj.episodes || 0) : (targetObj.chapters || 0);
    const curCount = isAnime ? (rate.episodes ?? 0) : (rate.chapters ?? 0);
    const unit = isEn ? (isAnime ? 'eps' : 'ch.') : (isAnime ? 'эп.' : 'гл.');

    return `
        <div class="shiki-grid-card" onclick="${clickFn}">
            <div class="shiki-grid-poster-wrap">
                ${imgUrl ? `<img src="${imgUrl}" alt="${title}" class="shiki-grid-poster" loading="lazy" decoding="async">` : `<div class="shiki-grid-poster placeholder"><i class="ti ti-${isAnime ? 'movie' : 'book'}"></i></div>`}
                ${rate.score ? `<span class="shiki-grid-score">${rate.score}</span>` : ''}
            </div>
            <div class="shiki-grid-info">
                <div class="shiki-grid-title" title="${title}">${title}</div>
                <div class="shiki-grid-ep">${curCount} / ${totalCount > 0 ? totalCount : '?'} ${unit}</div>
            </div>
        </div>
    `;
}
;
/* --- js/explore.js --- */
let searchDebounceTimer = null;
let currentNewsPage = 1;
let isLoadingNews = false;
let hasMoreNews = true;
let newsObserver = null;
const loadedNewsIds = new Set();

function i18n(key) {
    if (typeof t === 'function') return t(key);
    const dict = TRANSLATIONS && TRANSLATIONS['ru'] ? TRANSLATIONS['ru'] : {};
    return dict[key] || key;
}

function toggleNavbarSearch() {
    const panel = document.getElementById('navbar-search-panel');
    const btn = document.getElementById('search-toggle-btn');
    if (!panel) return;

    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        if (btn) btn.classList.add('active');
        setTimeout(() => {
            const input = document.getElementById('explore-search-input');
            if (input) input.focus();
        }, 50);
    } else {
        panel.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    }
}

let searchAbortController = null;

function handleExploreSearch(val) {
    const query = val.trim();
    const clearBtn = document.getElementById('search-clear-btn');
    const resultsContainer = document.getElementById('explore-search-results');

    if (clearBtn) {
        if (query.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
    }

    if (query.length < 2) {
        clearTimeout(searchDebounceTimer);
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
        }
        return;
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
        if (resultsContainer) {
            resultsContainer.classList.remove('hidden');
            resultsContainer.innerHTML = `<div class="search-loading"><i class="ti ti-loader animate-spin"></i> ${i18n('explore.searching')}</div>`;
        }

        searchAbortController = new AbortController();
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                signal: searchAbortController.signal
            });
            const data = await res.json();
            renderSearchResults(data);
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="search-no-results" style="color: var(--danger);">${i18n('explore.search_error')}</div>`;
            }
        }
    }, 350);
}

let desktopSearchDebounceTimer = null;
let desktopSearchAbortController = null;

window.handleDesktopSearch = function(val) {
    const query = (val || '').trim();
    const clearBtn = document.getElementById('desktop-search-clear');
    const dropdown = document.getElementById('desktop-search-dropdown');
    const resultsList = document.getElementById('desktop-search-results-list');

    if (clearBtn) {
        if (query.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (desktopSearchAbortController) {
        desktopSearchAbortController.abort();
        desktopSearchAbortController = null;
    }

    if (query.length < 1) {
        clearTimeout(desktopSearchDebounceTimer);
        if (dropdown) dropdown.classList.add('hidden');
        if (resultsList) resultsList.innerHTML = '';
        return;
    }

    if (dropdown) dropdown.classList.remove('hidden');
    if (resultsList) {
        resultsList.innerHTML = `<div class="shiki-search-loading"><i class="ti ti-loader animate-spin"></i> ${typeof i18n === 'function' ? i18n('explore.searching') : 'Поиск...'}</div>`;
    }

    clearTimeout(desktopSearchDebounceTimer);
    desktopSearchDebounceTimer = setTimeout(async function() {
        desktopSearchAbortController = new AbortController();
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                signal: desktopSearchAbortController.signal
            });
            const data = await res.json();
            renderDesktopSearchResults(data);
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (resultsList) {
                resultsList.innerHTML = `<div class="shiki-search-no-results" style="color: var(--danger);">${typeof i18n === 'function' ? i18n('explore.search_error') : 'Ошибка поиска'}</div>`;
            }
        }
    }, 200);
};

window.handleDesktopSearchFocus = function() {
    const input = document.getElementById('desktop-search-input');
    const dropdown = document.getElementById('desktop-search-dropdown');
    const resultsList = document.getElementById('desktop-search-results-list');
    if (input && input.value.trim().length >= 1 && resultsList && resultsList.children.length > 0) {
        if (dropdown) dropdown.classList.remove('hidden');
    }
};

window.clearDesktopSearch = function() {
    const input = document.getElementById('desktop-search-input');
    const clearBtn = document.getElementById('desktop-search-clear');
    const dropdown = document.getElementById('desktop-search-dropdown');
    const resultsList = document.getElementById('desktop-search-results-list');
    if (input) {
        input.value = '';
        input.focus();
    }
    if (clearBtn) clearBtn.classList.add('hidden');
    if (dropdown) dropdown.classList.add('hidden');
    if (resultsList) resultsList.innerHTML = '';
};

window.closeDesktopSearch = function() {
    const dropdown = document.getElementById('desktop-search-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
};

window.renderDesktopSearchResults = function(items) {
    const container = document.getElementById('desktop-search-results-list');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = `<div class="shiki-search-no-results"><i class="ti ti-search-off"></i> ${typeof i18n === 'function' ? i18n('explore.no_results') : 'Ничего не найдено'}</div>`;
        return;
    }

    const statusMap = {
        'released': 'Вышло',
        'ongoing': 'Онгоинг',
        'anons': 'Анонс'
    };

    container.innerHTML = items.map(function(item) {
        const title = item.russian || item.name || '';
        const origTitle = (item.russian && item.name && item.name !== item.russian) ? item.name : '';
        const img = item.image || '';
        const statusStr = statusMap[item.status] || item.status || '';
        const isAnime = (item.content_type === 'anime') || (item.type === 'anime') || (item.url && item.url.indexOf('/animes/') !== -1);
        const safeTitle = title.replace(/"/g, '&quot;');
        const clickHandler = isAnime 
            ? `event.stopPropagation(); closeDesktopSearch(); openAnimeModal(${item.id});` 
            : `event.stopPropagation(); window.open('${item.url || ''}', '_blank');`;

        return `
            <div class="shiki-search-item" onclick="${clickHandler}">
                ${img ? `<img src="${img}" alt="${safeTitle}" class="shiki-search-thumb" loading="lazy">` : `<div class="shiki-search-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                <div class="shiki-search-info">
                    <div class="shiki-search-title">${title}</div>
                    ${origTitle ? `<div class="shiki-search-orig">${origTitle}</div>` : ''}
                    <div class="shiki-search-tags">
                        ${item.score ? `<span class="shiki-search-score"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                        ${item.kind ? `<span class="shiki-search-tag">${item.kind.toUpperCase()}</span>` : ''}
                        ${item.year ? `<span class="shiki-search-tag">${item.year}</span>` : ''}
                        ${statusStr ? `<span class="shiki-search-tag status">${statusStr}</span>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
};

function clearExploreSearch() {
    if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
    }
    const input = document.getElementById('explore-search-input');
    if (input) input.value = '';
    handleExploreSearch('');
}


function renderSearchResults(items) {
    const container = document.getElementById('explore-search-results');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = '<div class="search-no-results">' + i18n('explore.no_results') + '</div>';
        return;
    }

    const statusTranslation = {
        'released': i18n('explore.status.released'),
        'ongoing': i18n('explore.status.ongoing'),
        'anons': i18n('explore.status.anons')
    };

    container.innerHTML = items.map(item => {
        const title = item.russian || item.name;
        const origTitle = (item.russian && item.name !== item.russian) ? item.name : '';
        const img = item.image || '';
        const statusStr = statusTranslation[item.status] || item.status || '';
        const genresStr = (item.genres && item.genres.length) ? item.genres.join(', ') : '';

        return `
            <a href="${item.url}" target="_blank" class="search-result-item">
                ${img ? `<img src="${img}" alt="${title}" class="search-item-thumb" loading="lazy">` : `<div class="search-item-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                <div class="search-item-info">
                    <div class="search-item-title-row">
                        <span class="search-item-title">${title}</span>
                        ${origTitle ? `<span class="search-item-orig-title">/ ${origTitle}</span>` : ''}
                    </div>
                    <div class="search-item-tags">
                        ${item.kind ? `<span class="search-tag tag-kind">${i18n('explore.type')} ${item.kind}</span>` : ''}
                        ${item.year ? `<span class="search-tag tag-year">${item.year} ${i18n('explore.year')}</span>` : ''}
                        ${statusStr ? `<span class="search-tag tag-status">${statusStr}</span>` : ''}
                    </div>
                    ${genresStr ? `<div class="search-item-genres"><span class="label">${i18n('explore.genres')}</span> ${genresStr}</div>` : ''}
                </div>
            </a>`;
    }).join('');
}

function buildNewsItemCard(item) {
    return `
        <a href="${item.url}" target="_blank" class="news-item-card">
            ${item.image ? `<div class="news-thumb"><img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async"></div>` : `<div class="news-thumb placeholder"><i class="ti ti-news"></i></div>`}
            <div class="news-item-body">
                <h4 class="news-item-title">${item.title}</h4>
                ${(item.tags && item.tags.length) ? `<div class="news-tags">${item.tags.map(t => `<span class="news-tag">${t}</span>`).join('')}</div>` : ''}
                <div class="news-item-meta">
                    ${item.author ? `<span class="news-author"><i class="ti ti-user"></i> ${item.author}</span>` : ''}
                    ${item.date ? `<span class="news-date"><i class="ti ti-calendar"></i> ${item.date}</span>` : ''}
                </div>
            </div>
        </a>`;
}

function setupNewsInfiniteScroll() {
    if (newsObserver) newsObserver.disconnect();

    const sentinel = document.getElementById('news-infinite-sentinel');
    if (!sentinel) return;

    newsObserver = new IntersectionObserver((entries) => {
        const profileTab = document.getElementById('profile');
        const isProfileActive = profileTab && profileTab.classList.contains('active');
        if (entries[0].isIntersecting && !isLoadingNews && hasMoreNews && isProfileActive) {
            loadNextNewsPage();
        }
    }, { rootMargin: '200px' });

    newsObserver.observe(sentinel);
}


async function loadNextNewsPage() {
    if (isLoadingNews || !hasMoreNews) return;
    isLoadingNews = true;

    const loader = document.getElementById('news-infinite-loader');
    if (loader) loader.classList.remove('hidden');

    currentNewsPage++;

    try {
        const res = await fetch(`/api/news?page=${currentNewsPage}&limit=10`);
        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) {
            hasMoreNews = false;
            if (loader) loader.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">' + i18n('explore.no_more_news') + '</span>';
        } else {
            // Filter duplicates
            const uniqueItems = items.filter(item => {
                const key = item.id || item.url;
                if (loadedNewsIds.has(key)) return false;
                loadedNewsIds.add(key);
                return true;
            });

            if (uniqueItems.length > 0) {
                const listContainer = document.getElementById('other-news-list');
                if (listContainer) {
                    const newHTML = uniqueItems.map(buildNewsItemCard).join('');
                    listContainer.insertAdjacentHTML('beforeend', newHTML);
                }
            }

            if (items.length < 10) {
                hasMoreNews = false;
                if (loader) loader.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">' + i18n('explore.no_more_news') + '</span>';
            } else if (loader) {
                loader.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error(i18n('explore.load_more_error'), err);
        hasMoreNews = false;
    } finally {
        isLoadingNews = false;
    }
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        if (isNaN(diffMs)) return dateStr;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

        if (diffMins < 1) return typeof i18n === 'function' ? i18n('time.just_now') : 'только что';
        if (diffMins < 60) return `${diffMins} ${typeof i18n === 'function' ? i18n('time.min_ago') : 'мин. назад'}`;
        if (diffHours < 24) return `${diffHours} ${typeof i18n === 'function' ? i18n('time.hours_ago') : 'ч. назад'}`;
        if (diffDays === 1) return typeof i18n === 'function' ? i18n('time.day_ago') : 'день назад';
        if (diffDays < 7) return `${diffDays} ${typeof i18n === 'function' ? i18n('time.days_ago') : 'дн. назад'}`;
        return date.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' });
    } catch(e) {
        return dateStr;
    }
}

window.quickFilterCatalog = function(filterType, value) {
    if (typeof openCatalogModal === 'function') {
        openCatalogModal();
    } else {
        const catContainer = document.getElementById('catalog-section-container');
        if (catContainer) {
            catContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }
    const sel = document.getElementById(`cat-filter-${filterType}`);
    if (sel) {
        sel.value = value;
        if (typeof onCatalogFilterChange === 'function') onCatalogFilterChange();
    }
};

let currentPortalCategory = 'anime';
let currentMyListSubTab = 'anime';

function getPortalCategoryTags() {
    const fn = (typeof i18n === 'function') ? i18n : (k => k);
    return {
        anime: [
            { label: fn('explore.pill.fall_2026'), action: "quickFilterCatalog('season', 'fall_2026')" },
            { label: fn('explore.pill.summer_2026'), action: "quickFilterCatalog('season', 'summer_2026')" },
            { label: fn('explore.pill.anime_2026'), action: "quickFilterCatalog('season', '2026')" },
            { label: fn('explore.pill.anime_2025'), action: "quickFilterCatalog('season', '2025')" },
            { label: fn('explore.pill.ongoing'), action: "quickFilterCatalog('status', 'ongoing')" },
            { label: fn('explore.pill.favourites'), action: "openTab('favourites')" },
            { label: fn('explore.pill.recommendations'), action: "openTab('recommendations')" },
            { label: fn('explore.pill.manga'), action: "openTab('catalog-manga')" },
            { label: fn('explore.pill.manhwa'), action: "quickFilterCatalog('kind', 'manhwa')" },
            { label: fn('explore.pill.manhua'), action: "quickFilterCatalog('kind', 'manhua')" },
            { label: fn('explore.pill.one_shot'), action: "quickFilterCatalog('kind', 'one_shot')" },
            { label: fn('explore.pill.doujin'), action: "quickFilterCatalog('kind', 'doujin')" }
        ],
        manga: [
            { label: fn('explore.pill.manga'), action: "openTab('catalog-manga')" },
            { label: fn('explore.pill.manhwa'), action: "quickFilterCatalog('kind', 'manhwa')" },
            { label: fn('explore.pill.manhua'), action: "quickFilterCatalog('kind', 'manhua')" },
            { label: fn('explore.pill.one_shot'), action: "quickFilterCatalog('kind', 'one_shot')" },
            { label: fn('explore.pill.doujin'), action: "quickFilterCatalog('kind', 'doujin')" },
            { label: fn('explore.pill.ongoing'), action: "quickFilterCatalog('status', 'ongoing')" },
            { label: fn('explore.pill.favourites'), action: "openTab('favourites')" },
            { label: fn('explore.pill.top_manga'), action: "openTab('top100')" },
            { label: fn('explore.pill.recommendations'), action: "openTab('recommendations')" }
        ],
        ranobe: [
            { label: fn('explore.pill.ranobe'), action: "openTab('catalog-ranobe')" },
            { label: fn('explore.pill.novels'), action: "openTab('catalog-ranobe')" },
            { label: fn('explore.pill.ongoing'), action: "quickFilterCatalog('status', 'ongoing')" },
            { label: fn('explore.pill.favourites'), action: "openTab('favourites')" },
            { label: fn('explore.pill.top_ranobe'), action: "openTab('top100')" },
            { label: fn('explore.pill.recommendations'), action: "openTab('recommendations')" }
        ]
    };
}

window.switchPortalCategory = function(cat) {
    currentPortalCategory = cat;
    document.querySelectorAll('.shiki-cat-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.cat === cat);
    });
    const container = document.getElementById('shiki-filter-tags-grid');
    if (!container) return;
    const catTags = getPortalCategoryTags();
    const tags = catTags[cat] || catTags['anime'];
    container.innerHTML = tags.map(t => `<button type="button" class="shiki-filter-pill" onclick="${t.action}">${t.label}</button>`).join('');
};

window.switchMyListSubTab = function(type) {
    currentMyListSubTab = type;
    document.querySelectorAll('.shiki-my-list-links a').forEach(el => {
        el.classList.toggle('active', el.dataset.type === type);
    });
    updateMyRecentWatchedCard(type);
};

window.openCatalogCategory = function(cat) {
    switchPortalCategory(cat);
};

function formatNewsTag(tag) {
    if (!tag) return typeof i18n === 'function' ? i18n('news.tag.news') : 'Новость';
    const tLower = tag.toLowerCase();
    if (tLower === 'новость' || tLower === 'news') return typeof i18n === 'function' ? i18n('news.tag.news') : tag;
    if (tLower === 'трейлер' || tLower === 'trailer') return typeof i18n === 'function' ? i18n('news.tag.trailer') : tag;
    if (tLower === 'постер' || tLower === 'poster') return typeof i18n === 'function' ? i18n('news.tag.poster') : tag;
    if (tLower === 'премьера' || tLower === 'premiere') return typeof i18n === 'function' ? i18n('news.tag.premiere') : tag;
    if (tLower === 'аниме' || tLower === 'anime') return typeof i18n === 'function' ? i18n('news.tag.anime') : tag;
    return tag;
}

function formatContentTag(tag) {
    if (!tag) return typeof i18n === 'function' ? i18n('explore.collection') : 'Коллекция';
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (!isEn) return tag;
    const tLower = tag.toLowerCase();
    if (tLower.includes('коллекц') || tLower.includes('collection')) return 'Collection';
    if (tLower.includes('реценз') || tLower.includes('review') || tLower.includes('critique')) return 'Review';
    if (tLower.includes('стать') || tLower.includes('article')) return 'Article';
    return tag;
}

function formatTopicTag(tag) {
    if (!tag) return typeof i18n === 'function' ? i18n('news.tag.news') : 'Новость';
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (!isEn) return tag;
    const tLower = tag.toLowerCase();
    if (tLower.includes('обсуждение аниме') || tLower.includes('anime discussion')) return 'Anime Discussion';
    if (tLower.includes('обсуждение манги') || tLower.includes('manga discussion')) return 'Manga Discussion';
    if (tLower.includes('обсуждение') || tLower.includes('discussion')) return 'Discussion';
    if (tLower.includes('новость') || tLower.includes('новости') || tLower.includes('news')) return 'News';
    if (tLower.includes('коллекц') || tLower.includes('collection')) return 'Collection';
    if (tLower.includes('реценз') || tLower.includes('review') || tLower.includes('critique')) return 'Review';
    if (tLower.includes('стать') || tLower.includes('article')) return 'Article';
    if (tLower.includes('офтопик') || tLower.includes('offtopic')) return 'Off-topic';
    return tag;
}

function formatGenresText(genresStr) {
    if (!genresStr) return '';
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (!isEn) return genresStr;
    const list = genresStr.split(',').map(g => g.trim());
    return list.map(g => (typeof t === 'function' ? t(g) : g)).join(', ');
}

function buildNewsItemCard(item, idx) {
    const isAboveFold = (typeof idx === 'number' && idx < 2);
    const imgAttrs = isAboveFold 
        ? 'fetchpriority="high" decoding="async"' 
        : 'loading="lazy" decoding="async"';

    return `
        <a href="${item.url}" target="_blank" class="shiki-featured-news-card">
            <div class="shiki-news-thumb-wrap">
                ${item.image ? `<img src="${item.image}" alt="${(item.title || '').replace(/"/g, '&quot;')}" class="shiki-news-thumb" ${imgAttrs}>` : `<div class="shiki-news-thumb placeholder"><i class="ti ti-news"></i></div>`}
                ${item.is_youtube ? `<span class="shiki-youtube-badge"><i class="ti ti-brand-youtube-filled"></i> youtube</span>` : ''}
            </div>
            <div class="shiki-news-card-body">
                <div class="shiki-news-card-title">${item.title}</div>
                <div class="shiki-news-card-tags">
                    ${(item.tags && item.tags.length) ? item.tags.map(t => `<span class="shiki-news-tag">${formatNewsTag(t)}</span>`).join('') : `<span class="shiki-news-tag">${formatNewsTag('Новость')}</span>`}
                </div>
                <div class="shiki-news-card-meta">
                    <span>${formatTimeAgo(item.date)}</span>
                    <span><i class="ti ti-message-circle"></i> ${item.comments_count || 0}</span>
                </div>
            </div>
        </a>`;
}

function renderExplore(data) {
    const container = document.getElementById('explore-news-container');
    if (!container) return;

    currentNewsPage = 1;
    isLoadingNews = false;
    hasMoreNews = true;
    loadedNewsIds.clear();

    if (data.error) {
        container.innerHTML = `<div class="card"><p style="color: var(--danger);">${i18n('error')}: ${data.error}</p></div>`;
        return;
    }

    const onScreens = data.on_screens || [];
    const animeUpdates = data.anime_updates || [];
    const contentList = data.content || [];
    const hotList = data.hot || [];
    
    // Filter main news and save their IDs
    const latest = (data.latest || []).filter(item => {
        const key = item.id || item.url;
        if (loadedNewsIds.has(key)) return false;
        loadedNewsIds.add(key);
        return true;
    });

    // Filter remaining news
    const other = (data.other || []).filter(item => {
        const key = item.id || item.url;
        if (loadedNewsIds.has(key)) return false;
        loadedNewsIds.add(key);
        return true;
    });

    const getTagClass = (tag) => {
        const tLower = (tag || '').toLowerCase();
        if (tLower.includes('коллекц') || tLower.includes('collection')) return 'shiki-tag-collection';
        if (tLower.includes('реценз') || tLower.includes('critique') || tLower.includes('review')) return 'shiki-tag-critique';
        if (tLower.includes('стать') || tLower.includes('article')) return 'shiki-tag-article';
        return 'shiki-tag-collection';
    };

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const catTags = getPortalCategoryTags();

    let html = `
        <div class="shiki-portal-container">
            <!-- 1. СЕЙЧАС НА ЭКРАНАХ -->
            ${onScreens.length ? `
                <div class="shiki-portal-section" data-section="explore-on-screens">
                    <div class="shiki-section-heading-purple">${i18n('explore.on_screens')}</div>
                    <div class="shiki-on-screens-grid">
                        ${onScreens.slice(0, 8).map((anime, idx) => {
                            const title = (isEn && anime.name) ? anime.name : (anime.russian || anime.name);
                            const imgAttrs = idx < 4 
                                ? 'fetchpriority="high" decoding="async"' 
                                : 'loading="lazy" decoding="async"';
                            return `
                            <div class="shiki-on-screen-card" onclick="openAnimeModal(${anime.id})">
                                <div class="shiki-poster-wrap">
                                    <img src="${anime.image}" alt="${(title || '').replace(/"/g, '&quot;')}" class="shiki-on-screen-poster" ${imgAttrs}>
                                </div>
                                <div class="shiki-on-screen-title" title="${title}">${title}</div>
                                <div class="shiki-on-screen-studio" title="${anime.studios || ''}">${anime.studios || ''}</div>
                            </div>
                        `;}).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 2. МОЙ СПИСОК & НАВИГАЦИЯ -->
            <div class="shiki-my-list-nav-row" data-section="explore-my-list">
                <!-- Левая колонка: Мой список -->
                <div class="shiki-my-list-block">
                    <div class="shiki-my-list-header">
                        <span class="shiki-my-list-title">${i18n('explore.my_list')}</span>
                        <div class="shiki-my-list-links">
                            <a href="javascript:void(0)" data-type="anime" class="active" onclick="switchMyListSubTab('anime')">${i18n('explore.subtab.anime')}</a> /
                            <a href="javascript:void(0)" data-type="manga" onclick="switchMyListSubTab('manga')">${i18n('explore.subtab.manga')}</a> /
                            <a href="javascript:void(0)" data-type="history" onclick="switchMyListSubTab('history')">${i18n('explore.subtab.history')}</a>
                        </div>
                    </div>
                    <div id="shiki-my-recent-card-container">
                        <div class="loader" style="padding: 20px;"><i class="ti ti-loader animate-spin"></i></div>
                    </div>
                </div>

                <!-- Правая колонка: Категории и быстрые фильтры -->
                <div class="shiki-category-tags-block">
                    <div class="shiki-category-tabs">
                        <span class="shiki-cat-tab active" data-cat="anime" onclick="switchPortalCategory('anime')">${i18n('explore.cat.anime')}</span>
                        <span class="shiki-cat-tab" data-cat="manga" onclick="switchPortalCategory('manga')">${i18n('explore.cat.manga')}</span>
                        <span class="shiki-cat-tab" data-cat="ranobe" onclick="switchPortalCategory('ranobe')">${i18n('explore.cat.ranobe')}</span>
                    </div>
                    <div class="shiki-filter-tags-grid" id="shiki-filter-tags-grid">
                        ${catTags.anime.map(t => `<button type="button" class="shiki-filter-pill" onclick="${t.action}">${t.label}</button>`).join('')}
                    </div>
                    <div class="shiki-forum-row">
                        <button type="button" class="shiki-forum-btn" onclick="openTab('forum')">
                            <span>${i18n('explore.forum_btn')}</span> <i class="ti ti-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 3. НОВОСТИ -->
            ${latest.length ? `
                <div class="shiki-portal-section" data-section="explore-news">
                    <div class="shiki-section-header-row">
                        <h2 class="shiki-section-title-white">${i18n('explore.news')}</h2>
                    </div>
                    <div class="shiki-featured-news-grid">
                        ${latest.map(buildNewsItemCard).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 4. КОНТЕНТ & ТЕМЫ ДНЯ -->
            <div class="shiki-content-topics-row">
                <!-- Левая колонка: Контент -->
                <div class="shiki-content-col" data-section="explore-content">
                    <div class="shiki-content-header-row">
                        <h2 class="shiki-section-title-white">${i18n('explore.content')}</h2>
                        <div class="shiki-content-filter-links">
                            <a href="javascript:void(0)" onclick="openTab('collections')">${i18n('explore.collections')}</a> /
                            <a href="javascript:void(0)" onclick="openTab('critiques')">${i18n('explore.reviews')}</a> /
                            <a href="javascript:void(0)" onclick="openTab('articles')">${i18n('explore.articles')}</a>
                        </div>
                    </div>
                    <div class="shiki-content-cards-grid">
                        ${contentList.slice(0, 10).map(item => `
                            <a href="${item.url}" target="_blank" class="shiki-content-item-card">
                                <div class="shiki-content-item-title">${item.title}</div>
                                <div class="shiki-content-item-footer">
                                    <span class="shiki-content-tag ${getTagClass(item.tag)}">${formatContentTag(item.tag)}</span>
                                    <span class="shiki-content-comments"><i class="ti ti-message-circle"></i> ${item.comments_count || 0}</span>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>

                <!-- Правая колонка: Темы дня -->
                <div class="shiki-topics-col" data-section="explore-hot">
                    <div class="shiki-topics-header-row">
                        <h2 class="shiki-section-title-white">${i18n('explore.hot_topics')}</h2>
                    </div>
                    <div class="shiki-topics-stack">
                        ${hotList.slice(0, 5).map(item => `
                            <a href="${item.url}" target="_blank" class="shiki-topic-item-card">
                                <div class="shiki-topic-item-title">${item.title}</div>
                                <div class="shiki-topic-item-footer">
                                    <div class="shiki-topic-author-row">
                                        <span class="shiki-topic-tag">${formatTopicTag(item.tag || 'Новость')}</span>
                                        <span class="shiki-topic-meta-text">${formatTimeAgo(item.date)} ${item.author ? (isEn ? `by 👤 ${item.author}` : `от 👤 ${item.author}`) : ''}</span>
                                    </div>
                                    <span class="shiki-topic-comments"><i class="ti ti-message-circle"></i> ${item.comments_count || 0}</span>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- 5. ОБНОВЛЕНИЯ АНИМЕ -->
            ${animeUpdates.length ? `
                <div class="shiki-portal-section" data-section="explore-anime-updates">
                    <div class="shiki-section-heading-purple">${i18n('explore.anime_updates')}</div>
                    <div class="shiki-anime-updates-grid">
                        ${animeUpdates.slice(0, 8).map(anime => {
                            const title = (isEn && anime.name) ? anime.name : (anime.russian || anime.name);
                            const statusText = anime.status === 'released' ? i18n('explore.status.released') : (anime.status === 'anons' ? i18n('explore.status.anons') : i18n('explore.status.ongoing'));
                            const statusClass = anime.status === 'released' ? 'status-released' : 'status-anons';
                            const kindText = anime.kind === 'MOVIE' ? (isEn ? 'Movie' : 'Фильм') : (anime.kind === 'TV' ? (isEn ? 'TV Series' : 'Сериал') : (anime.kind === 'CLIP' ? (isEn ? 'Clip' : 'Клип') : anime.kind));
                            return `
                                <div class="shiki-anime-update-card" onclick="openAnimeModal(${anime.id})">
                                    <img src="${anime.image}" alt="${(title || '').replace(/"/g, '&quot;')}" class="shiki-update-poster" loading="lazy">
                                    <div class="shiki-update-info">
                                        <div class="shiki-update-title" title="${title}">${title}</div>
                                        <div class="shiki-update-row-1">
                                            <span class="shiki-update-badge ${statusClass}">${statusText}</span>
                                            <span class="shiki-update-time">${formatTimeAgo(anime.updated_at)}</span>
                                        </div>
                                        <div class="shiki-update-row-2">
                                            ${kindText ? `<span class="shiki-kind-badge">${kindText}</span>` : ''}
                                            ${anime.rating ? `<span class="shiki-kind-badge">${anime.rating}</span>` : ''}
                                            ${anime.genres ? `<span class="shiki-genres-text">${formatGenresText(anime.genres)}</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 6. ЕЩЁ НОВОСТИ -->
            ${other.length ? `
                <div class="shiki-portal-section" data-section="explore-more-news">
                    <div class="shiki-section-header-row">
                        <h2 class="shiki-section-title-white">${i18n('explore.more_news')}</h2>
                    </div>
                    <div id="other-news-list" class="shiki-more-news-grid">
                        ${other.map(buildNewsItemCard).join('')}
                    </div>
                    <div id="news-infinite-sentinel" style="height: 20px; margin-top: 10px;"></div>
                    <div id="news-infinite-loader" class="news-infinite-loader hidden">
                        <i class="ti ti-loader animate-spin"></i> ${i18n('explore.loading_more')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = html;
    setupNewsInfiniteScroll();
    if (typeof updateMyRecentWatchedCard === 'function') {
        updateMyRecentWatchedCard('anime');
    }
    if (typeof applySectionVisibility === 'function') {
        applySectionVisibility();
    }
}

// ==================== CONTINUE WATCHING ====================

function renderContinueWatching() {
    const container = document.getElementById('continue-watching-container');
    if (!container) return;

    let items = [];
    try {
        items = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
    } catch (e) {
        items = [];
    }

    if (!items || items.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="card continue-watching-card" data-section="continue-watching">
            <div class="card-header">
                <h3><i class="ti ti-player-play"></i> <span>${i18n('player.continue_watching')}</span></h3>
                <span class="badge badge-watching" style="font-size: 11px;">${items.length}</span>
            </div>
            <div class="continue-watching-carousel">
                ${items.map(item => {
                    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
                    const total = item.total_episodes || 0;
                    const percent = total > 0 ? Math.min(100, Math.round((item.episode / total) * 100)) : 0;
                    const epText = `${i18n('player.ep_short')} ${item.episode}${total ? ` / ${total}` : ''}`;
                    const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
                    const title = (isEn && item.name) ? item.name : (item.russian || item.title || 'Anime');

                    return `
                        <div class="continue-watching-item" onclick="openAnimeModal(${item.id})">
                            <div class="continue-thumb-wrap">
                                ${imgUrl ? `<img src="${imgUrl}" alt="${title}" class="continue-thumb" loading="lazy" decoding="async">` : `<div class="continue-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                                <div class="continue-play-overlay"><i class="ti ti-player-play"></i></div>
                                <span class="continue-ep-badge">${epText}</span>

                                <button type="button" class="continue-remove-btn" onclick="removeContinueWatching(${item.id}, event)" title="${i18n('close')}"><i class="ti ti-x"></i></button>
                            </div>

                            <div class="continue-info">
                                <div class="continue-title" title="${title}">${title}</div>
                                ${percent > 0 ? `
                                    <div class="continue-progress-bar">
                                        <div class="continue-progress-fill" style="width: ${percent}%;"></div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}
window.renderContinueWatching = renderContinueWatching;

async function syncContinueWatchingWithDB() {
    try {
        const res = await fetch('/api/continue_watching');
        if (!res.ok) return;
        const dbList = await res.json();
        if (!Array.isArray(dbList)) return;

        let localList = [];
        try {
            localList = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
        } catch (e) { localList = []; }

        if (dbList.length === 0 && localList.length === 0) return;

        const map = new Map();
        [...dbList, ...localList].forEach(item => {
            if (!item || !item.id) return;
            const existing = map.get(item.id);
            if (!existing || new Date(item.updated_at || 0) > new Date(existing.updated_at || 0)) {
                map.set(item.id, item);
            }
        });

        const merged = Array.from(map.values())
            .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
            .slice(0, 30);

        localStorage.setItem('shikimx_continue_watching', JSON.stringify(merged));
        renderContinueWatching();
    } catch (err) {
        console.warn('Failed to sync continue watching:', err);
    }
}
window.syncContinueWatchingWithDB = syncContinueWatchingWithDB;

// Автоматическая синхронизация с БД при старте
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncContinueWatchingWithDB);
} else {
    syncContinueWatchingWithDB();
}

function removeContinueWatching(animeId, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    try {
        let list = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
        list = list.filter(item => item.id != animeId);
        localStorage.setItem('shikimx_continue_watching', JSON.stringify(list));
        renderContinueWatching();

        // Удаление из БД на сервере
        fetch(`/api/continue_watching/${animeId}`, { method: 'DELETE' })
            .catch(err => console.warn('DB delete continue watching error:', err));
    } catch (err) {}
}
window.removeContinueWatching = removeContinueWatching;


// ==================== AIRING SCHEDULE / CALENDAR ====================

let calendarDataCache = null;
let currentCalendarDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Monday..6=Sunday

async function loadAiringCalendar() {
    const container = document.getElementById('calendar-section-container');
    if (!container) return;

    if (!calendarDataCache) {
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('loading') + '</div>';
        try {
            const res = await fetch('/api/calendar');
            const data = await res.json();
            calendarDataCache = Array.isArray(data) ? data : [];
        } catch (err) {
            container.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`;
            return;
        }
    }
    renderAiringCalendarUI(currentCalendarDay);
}
window.loadAiringCalendar = loadAiringCalendar;

function setCalendarDay(dayIndex) {
    currentCalendarDay = dayIndex;
    renderAiringCalendarUI(dayIndex);
}
window.setCalendarDay = setCalendarDay;

function renderAiringCalendarUI(activeDay) {
    const container = document.getElementById('calendar-section-container');
    if (!container || !calendarDataCache) return;

    const daysShort = [
        i18n('calendar.mon'),
        i18n('calendar.tue'),
        i18n('calendar.wed'),
        i18n('calendar.thu'),
        i18n('calendar.fri'),
        i18n('calendar.sat'),
        i18n('calendar.sun')
    ];
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;


    const filtered = calendarDataCache.filter(item => item.day_of_week === activeDay);

    container.innerHTML = `
        <div class="card calendar-card" data-section="explore-calendar">
            <div class="card-header calendar-card-header">
                <h3><i class="ti ti-calendar-event"></i> <span>${i18n('calendar.title')}</span></h3>
                <div class="calendar-days-tabs">
                    ${daysShort.map((day, idx) => `
                        <button type="button" class="cal-day-btn ${idx === activeDay ? 'active' : ''} ${idx === todayIndex ? 'today' : ''}" onclick="setCalendarDay(${idx})">
                            <span>${day}</span>
                            ${idx === todayIndex ? `<span class="cal-today-dot"></span>` : ''}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="calendar-items-grid">
                ${filtered.length > 0 ? filtered.map(item => {
                    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
                    const title = (isEn && item.name) ? item.name : (item.russian || item.name);
                    const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
                    const time = item.time_str ? `${item.time_str}` : '';
                    const nextEp = item.next_episode ? `${item.next_episode} ${i18n('calendar.ep_next')}` : '';

                    return `
                        <div class="calendar-item-card" onclick="openAnimeModal(${item.id})">
                            <div class="cal-thumb-wrap">
                                ${imgUrl ? `<img src="${imgUrl}" alt="${title}" class="cal-thumb" loading="lazy" decoding="async">` : `<div class="cal-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                                ${time ? `<span class="cal-time-badge"><i class="ti ti-clock"></i> ${time}</span>` : ''}
                                ${item.score ? `<span class="cal-score-badge"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                            </div>

                            <div class="cal-item-info">
                                <div class="cal-item-title" title="${title}">${title}</div>
                                <div class="cal-item-meta">
                                    <span class="cal-next-ep">${nextEp}</span>
                                    <span class="badge badge-watching" style="font-size: 10px;">${item.kind}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : `<p style="color: var(--text-muted); padding: 16px 0;">${i18n('calendar.empty_day')}</p>`}
            </div>
        </div>
    `;
}

function formatRateStatusLabel(st, isManga = false) {
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (isEn) {
        const mapEn = {
            'completed': isManga ? 'Read' : 'Completed',
            'watching': 'Watching',
            'reading': 'Reading',
            'planned': 'Planned',
            'on_hold': 'On Hold',
            'dropped': 'Dropped',
            'rewatching': 'Rewatching',
            'rereading': 'Rereading'
        };
        return mapEn[st] || st || (isManga ? 'Read' : 'Completed');
    }
    const map = {
        'completed': isManga ? 'Прочитано' : 'Просмотрено',
        'watching': 'Смотрю',
        'reading': 'Читаю',
        'planned': 'В планах',
        'on_hold': 'Отложено',
        'dropped': 'Брошено',
        'rewatching': 'Пересматриваю',
        'rereading': 'Перечитываю'
    };
    return map[st] || st || (isManga ? 'Прочитано' : 'Просмотрено');
}

function formatChaptersCountText(num) {
    const n = Math.abs(Number(num) || 1);
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (isEn) return `${n} ${typeof i18n === 'function' ? i18n('explore.chapter') : 'ch.'}`;
    if (n % 10 === 1 && n % 100 !== 11) return `${n} ${typeof i18n === 'function' ? i18n('explore.chapter') : 'глава'}`;
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return `${n} ${typeof i18n === 'function' ? i18n('explore.chapters_few') : 'главы'}`;
    return `${n} ${typeof i18n === 'function' ? i18n('explore.chapters_many') : 'глав'}`;
}

async function updateMyRecentWatchedCard(type = 'anime') {
    const container = document.getElementById('shiki-my-recent-card-container');
    if (!container) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    let recentItem = null;

    if (type === 'manga') {
        try {
            const res = await fetch('/api/tab/rates?type=manga');
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.user_rates || []);
                if (list.length > 0) {
                    const first = list[0];
                    const target = first.manga || first.target || first;
                    const chCount = first.chapters || first.volumes || target.chapters || target.volumes || 1;
                    recentItem = {
                        id: target.id,
                        title: (isEn && target.name) ? target.name : (target.russian || target.name || (isEn ? 'Manga' : 'Манга')),
                        image: target.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(target.image) : target.image) : '',
                        status: formatRateStatusLabel(first.status, true),
                        score: first.score || 8,
                        time: typeof formatTimeAgo === 'function' ? formatTimeAgo(first.updated_at) : (typeof i18n === 'function' ? i18n('explore.recently') : 'недавно'),
                        episodes: formatChaptersCountText(chCount),
                        isManga: true
                    };
                }
            }
        } catch(e) {}
    }

    if (!recentItem && type === 'anime') {
        if (typeof cachedHistoryData !== 'undefined' && Array.isArray(cachedHistoryData) && cachedHistoryData.length > 0) {
            const animeHistory = cachedHistoryData.find(h => h.target && (h.target_type === 'Anime' || h.target.kind));
            if (animeHistory && animeHistory.target) {
                recentItem = {
                    id: animeHistory.target.id,
                    title: (isEn && animeHistory.target.name) ? animeHistory.target.name : (animeHistory.target.russian || animeHistory.target.name),
                    image: animeHistory.target.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(animeHistory.target.image) : animeHistory.target.image) : '',
                    status: formatRateStatusLabel(animeHistory.description || 'completed', false),
                    score: animeHistory.target.score || 9,
                    time: typeof formatTimeAgo === 'function' ? formatTimeAgo(animeHistory.created_at) : (typeof i18n === 'function' ? i18n('explore.recently') : 'недавно'),
                    episodes: (animeHistory.target.episodes ? `${animeHistory.target.episodes} / ${animeHistory.target.episodes}` : '28 / 28')
                };
            }
        }
    }

    if (!recentItem) {
        try {
            const res = await fetch('/api/tab/history');
            if (res.ok) {
                const historyData = await res.json();
                if (Array.isArray(historyData) && historyData.length > 0) {
                    const targetItem = (type === 'manga')
                        ? historyData.find(h => h.target && (h.target_type === 'Manga' || !h.target.kind))
                        : historyData.find(h => h.target && (h.target_type === 'Anime' || h.target.kind));
                    
                    const item = targetItem || historyData[0];
                    if (item && item.target) {
                        const isMangaItem = (item.target_type === 'Manga' || type === 'manga');
                        recentItem = {
                            id: item.target.id,
                            title: (isEn && item.target.name) ? item.target.name : (item.target.russian || item.target.name),
                            image: item.target.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.target.image) : item.target.image) : '',
                            status: formatRateStatusLabel(item.description || 'completed', isMangaItem),
                            score: item.target.score || 9,
                            time: typeof formatTimeAgo === 'function' ? formatTimeAgo(item.created_at) : (typeof i18n === 'function' ? i18n('explore.recently') : 'недавно'),
                            episodes: isMangaItem ? formatChaptersCountText(item.target.chapters || 1) : (item.target.episodes ? `${item.target.episodes} / ${item.target.episodes}` : '28 / 28'),
                            isManga: isMangaItem
                        };
                    }
                }
            }
        } catch(e) {}
    }

    if (recentItem) {
        const starCount = Math.round(Math.min(5, Math.max(1, (recentItem.score || 8) / 2)));
        const starsHtml = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
        const clickHandler = recentItem.isManga ? `openMangaModal(${recentItem.id})` : `openAnimeModal(${recentItem.id})`;
        const thumbPlaceholder = recentItem.isManga ? '<i class="ti ti-book-2"></i>' : '<i class="ti ti-movie"></i>';
        container.innerHTML = `
            <div class="shiki-my-list-card" onclick="${clickHandler}">
                ${recentItem.image ? `<img src="${recentItem.image}" alt="${(recentItem.title || '').replace(/"/g, '&quot;')}" class="shiki-my-list-thumb" loading="lazy">` : `<div class="shiki-my-list-thumb placeholder">${thumbPlaceholder}</div>`}
                <div class="shiki-my-list-info">
                    <div class="shiki-my-list-item-title" title="${recentItem.title}">${recentItem.title}</div>
                    <div class="shiki-my-list-status-row">
                        <span class="shiki-status-badge-green">${recentItem.status}</span>
                        <span>${recentItem.episodes}</span>
                    </div>
                    <div class="shiki-my-list-stars">${starsHtml}</div>
                    <div class="shiki-my-list-time">${recentItem.time || (typeof i18n === 'function' ? i18n('explore.recently') : 'недавно')}</div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="shiki-my-list-card" onclick="openTab('rates')">
                <div class="shiki-my-list-thumb placeholder"><i class="${type === 'manga' ? 'ti ti-book-2' : 'ti ti-list-check'}"></i></div>
                <div class="shiki-my-list-info">
                    <div class="shiki-my-list-item-title">${type === 'manga' ? (typeof i18n === 'function' ? i18n('explore.my_manga_lists') : 'Мои списки манги') : (typeof i18n === 'function' ? i18n('explore.my_anime_lists') : 'Мои списки аниме')}</div>
                    <div class="shiki-my-list-status-row">
                        <span class="shiki-status-badge-green">${typeof i18n === 'function' ? i18n('explore.open') : 'Открыть'}</span>
                        <span>${typeof i18n === 'function' ? i18n('explore.go_to_lists') : 'Перейти к спискам'}</span>
                    </div>
                    <div class="shiki-my-list-time">${typeof i18n === 'function' ? i18n('explore.click_to_view') : 'Нажмите для просмотра'}</div>
                </div>
            </div>
        `;
    }
}
window.updateMyRecentWatchedCard = updateMyRecentWatchedCard;



// ==================== CATALOG WITH RICH FILTERS ====================

let catalogPage = 1;
let catalogItemsCache = [];
let catalogGenresCache = [];
let isLoadingCatalog = false;

async function loadGenres() {
    if (catalogGenresCache.length > 0) return catalogGenresCache;
    try {
        const res = await fetch('/api/genres');
        catalogGenresCache = await res.json();
    } catch (e) {
        catalogGenresCache = [];
    }
    return catalogGenresCache;
}

async function loadCatalog(page = 1, append = false) {
    const container = document.getElementById('catalog-grid-container');
    if (!container) return;

    if (isLoadingCatalog) return;
    isLoadingCatalog = true;

    if (!append) {
        catalogPage = 1;
        container.innerHTML = '<div class="loader" style="grid-column: 1 / -1;"><i class="ti ti-loader animate-spin"></i> ' + i18n('loading') + '</div>';
    }

    const genre = document.getElementById('cat-filter-genre')?.value || '';
    const season = document.getElementById('cat-filter-season')?.value || '';
    const kind = document.getElementById('cat-filter-kind')?.value || '';
    const status = document.getElementById('cat-filter-status')?.value || '';
    const score = document.getElementById('cat-filter-score')?.value || '';
    const order = document.getElementById('cat-filter-sort')?.value || 'ranked';

    const params = new URLSearchParams({
        page: page,
        limit: 24,
        order: order
    });
    if (genre) params.append('genre', genre);
    if (season) params.append('season', season);
    if (kind) params.append('kind', kind);
    if (status) params.append('status', status);
    if (score) params.append('score', score);

    try {
        const res = await fetch(`/api/catalog?${params.toString()}`);
        const items = await res.json();

        if (!append) {
            catalogItemsCache = items;
        } else {
            catalogItemsCache = catalogItemsCache.concat(items);
        }

        renderCatalogGrid(catalogItemsCache, items.length >= 24);
    } catch (err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger); grid-column: 1 / -1;">${err.message}</p>`;
    } finally {
        isLoadingCatalog = false;
    }
}
window.loadCatalog = loadCatalog;

function onCatalogFilterChange() {
    catalogPage = 1;
    loadCatalog(1, false);
}
window.onCatalogFilterChange = onCatalogFilterChange;

function loadMoreCatalog() {
    catalogPage++;
    loadCatalog(catalogPage, true);
}
window.loadMoreCatalog = loadMoreCatalog;

function renderCatalogGrid(items, hasMore = false) {
    const container = document.getElementById('catalog-grid-container');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; padding: 24px; text-align: center;">${i18n('catalog.empty')}</p>`;
        return;
    }

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    container.innerHTML = items.map(item => {
        const title = (isEn && item.name) ? item.name : (item.russian || item.name);
        const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
        const genres = (item.genres || []).slice(0, 2).join(', ');

        return `
            <div class="catalog-anime-card" onclick="openAnimeModal(${item.id})">
                <div class="catalog-poster-wrap">
                    ${imgUrl ? `<img src="${imgUrl}" alt="${title}" class="catalog-poster-img" loading="lazy" decoding="async">` : `<div class="catalog-poster-placeholder"><i class="ti ti-movie"></i></div>`}
                    ${item.score ? `<span class="catalog-score-badge"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                    ${item.kind ? `<span class="catalog-kind-badge">${item.kind}</span>` : ''}
                </div>

                <div class="catalog-card-body">
                    <div class="catalog-card-title" title="${title}">${title}</div>
                    <div class="catalog-card-meta">
                        <span class="catalog-meta-year">${item.year || ''}</span>
                        ${genres ? `<span class="catalog-meta-genres" title="${genres}">${genres}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');


    const loadMoreContainer = document.getElementById('catalog-load-more-wrap');
    if (loadMoreContainer) {
        loadMoreContainer.innerHTML = hasMore ? `
            <button type="button" class="btn btn-load-more-catalog" onclick="loadMoreCatalog()">
                <i class="ti ti-reload"></i> ${i18n('catalog.load_more')}
            </button>
        ` : '';
    }
}


// ==================== RANDOMIZER & RECOMMENDATIONS ====================

async function pickRandomAnime() {
    const btn = document.getElementById('btn-random-anime');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="ti ti-loader animate-spin"></i> <span>${i18n('random.finding')}</span>`;
    }

    showToast(i18n('random.finding') + ' 🎲', 'info', 2000);

    try {
        const res = await fetch('/api/random');
        const data = await res.json();
        if (res.ok && data.id) {
            openAnimeModal(data.id);
        } else {
            showToast(i18n('random.error'), 'error');
        }

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-sparkles"></i> <span>${i18n('random.btn')}</span>`;
        }
    }
}
window.pickRandomAnime = pickRandomAnime;

async function initExploreExtraSections() {
    // 1. Продолжить просмотр - локальные данные из localStorage (мгновенно)
    renderContinueWatching();

    // 2. Расписание онгоингов - загрузка только при приближении к блоку
    if (typeof setupSectionLazyLoader === 'function') {
        setupSectionLazyLoader('calendar-section-container', () => {
            loadAiringCalendar();
        }, '300px');

        // 3. Каталог и жанры - загрузка только при приближении к блоку
        setupSectionLazyLoader('catalog-section-container', async () => {
            const genreSelect = document.getElementById('cat-filter-genre');
            if (genreSelect) {
                const genres = await loadGenres();
                genreSelect.innerHTML = `<option value="">${i18n('catalog.filter.all_genres')}</option>` +
                    genres.map(g => `<option value="${g.id}">${g.russian || g.name}</option>`).join('');
            }
            loadCatalog(1, false);
        }, '300px');
    } else {
        loadAiringCalendar();
        loadCatalog(1, false);
    }
}
window.initExploreExtraSections = initExploreExtraSections;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initExploreExtraSections, 100);
});

;
/* --- js/portal_modules.js --- */
/**
 * Shikimori MX - Модули разделов сайта (Портальные страницы)
 * Аниме, Топ 100, Манга, Ранобэ, Форум, Клубы, Коллекции, Рецензии, Статьи, Пользователи, Рекомендации, Календарь
 */

const DEFAULT_NO_POSTER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="225" height="320" viewBox="0 0 225 320"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231a102f"/><stop offset="100%" stop-color="%230d0818"/></linearGradient></defs><rect width="225" height="320" rx="8" fill="url(%23g)"/><circle cx="112.5" cy="135" r="36" fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.3)" stroke-width="2"/><path d="M98 148 L112.5 120 L127 148 Z" fill="rgba(168,85,247,0.4)"/><circle cx="112.5" cy="115" r="5" fill="%23a855f7"/><text x="112.5" y="195" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle">SHIKI MX</text><text x="112.5" y="215" fill="rgba(255,255,255,0.35)" font-family="sans-serif" font-size="10" text-anchor="middle">Нет постера</text></svg>`;

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ДЕБАУНС ПОИСКА
// ==========================================

window.debounce = function(fn, delay = 350) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
};

window.handleAnimeSearchInput = window.debounce(() => window.loadCatalogAnimeTab(1), 350);
window.handleMangaSearchInput = window.debounce(() => window.loadCatalogMangaTab(1), 350);
window.handleRanobeSearchInput = window.debounce(() => window.loadCatalogRanobeTab(1), 350);
window.handleClubsSearchInput = window.debounce(() => window.loadClubsTab(1), 350);
window.handleUsersSearchInput = window.debounce(() => window.loadUsersTab(1), 350);

function updateTabSentinel(container, tabId, hasMore, isLoading) {
    if (!container) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    let parent = container.parentElement || container;
    let sentinel = parent.querySelector(`.portal-infinite-sentinel[data-tab="${tabId}"]`);
    
    if (hasMore) {
        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.className = 'portal-infinite-sentinel';
            sentinel.dataset.tab = tabId;
            parent.appendChild(sentinel);
        }
        sentinel.innerHTML = `<div class="portal-infinite-spinner ${isLoading ? '' : 'hidden'}"><i class="ti ti-loader animate-spin"></i> <span>${isEn ? 'Loading more...' : 'Загрузка...'}</span></div>`;
        if (typeof globalSentinelObserver !== 'undefined' && globalSentinelObserver) {
            globalSentinelObserver.observe(sentinel);
        }
    } else {
        if (sentinel) sentinel.remove();
    }
}

// ==========================================
// 1. БАЗА ДАННЫХ: АНИМЕ КАТАЛОГ
// ==========================================

let animeCatalogPage = 1;
let isAnimeCatalogLoading = false;
let hasMoreAnimeCatalog = true;
let animeGenresLoaded = false;

window.loadCatalogAnimeTab = async function(page = 1, append = false) {
    const container = document.getElementById('catalog-anime-list');
    if (!container) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!animeGenresLoaded) {
        const genreSelect = document.getElementById('anime-cat-genre');
        if (genreSelect && genreSelect.options.length <= 1) {
            try {
                const gRes = await fetch('/api/genres');
                const genres = await gRes.json();
                if (Array.isArray(genres)) {
                    genres.forEach(g => {
                        const opt = document.createElement('option');
                        opt.value = g.id;
                        opt.textContent = isEn ? (g.english || g.name) : (g.russian || g.name);
                        genreSelect.appendChild(opt);
                    });
                    animeGenresLoaded = true;
                }
            } catch(e) {}
        }
    }

    if (isAnimeCatalogLoading) return;
    isAnimeCatalogLoading = true;

    if (!append) {
        animeCatalogPage = 1;
        hasMoreAnimeCatalog = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading anime...' : 'Загрузка аниме...'}</div>`;
    } else {
        animeCatalogPage = page;
    }

    updateTabSentinel(container, 'catalog-anime', hasMoreAnimeCatalog, true);

    const genre = document.getElementById('anime-cat-genre')?.value || '';
    const season = document.getElementById('anime-cat-season')?.value || '';
    const kind = document.getElementById('anime-cat-kind')?.value || '';
    const status = document.getElementById('anime-cat-status')?.value || '';
    const score = document.getElementById('anime-cat-score')?.value || '';
    const order = document.getElementById('anime-cat-order')?.value || 'ranked';
    const search = document.getElementById('anime-cat-search')?.value || '';

    const params = new URLSearchParams({
        page: animeCatalogPage,
        limit: 24,
        order: order
    });
    if (genre) params.append('genre', genre);
    if (season) params.append('season', season);
    if (kind) params.append('kind', kind);
    if (status) params.append('status', status);
    if (score) params.append('score', score);
    if (search) params.append('search', search);

    try {
        const res = await fetch(`/api/catalog?${params.toString()}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];

        if (!append) {
            container.innerHTML = '';
        }

        if (items.length === 0) {
            hasMoreAnimeCatalog = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-movie-off"></i><p>${isEn ? 'No anime found' : 'Ничего не найдено по заданным фильтрам'}</p></div>`;
            }
            updateTabSentinel(container, 'catalog-anime', false, false);
            return;
        }

        if (items.length < 5) {
            hasMoreAnimeCatalog = false;
        }

        const cardsHtml = items.map(anime => {
            const genresText = anime.genres ? (typeof formatGenresText === 'function' ? formatGenresText(anime.genres.slice(0, 2).join(', ')) : anime.genres.slice(0, 2).join(', ')) : '';
            const posterUrl = anime.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(anime.image) : anime.image) : DEFAULT_NO_POSTER;
            const title = (isEn && anime.name) ? anime.name : (anime.russian || anime.name);
            return `
                <div class="portal-media-card" onclick="openAnimeModal(${anime.id})">
                    <div class="portal-media-poster-wrap">
                        <img src="${posterUrl}" alt="${(title || '').replace(/"/g, '&quot;')}" class="portal-media-poster" loading="lazy">
                        ${anime.score ? `<span class="portal-score-badge"><i class="ti ti-star-filled"></i> ${anime.score}</span>` : ''}
                        ${anime.kind ? `<span class="portal-kind-badge">${anime.kind}</span>` : ''}
                    </div>
                    <div class="portal-media-info">
                        <div class="portal-media-title" title="${(title || '').replace(/"/g, '&quot;')}">${title}</div>
                        <div class="portal-media-meta">
                            <span>${anime.year || ''}</span>
                            <span class="portal-media-genres">${genresText}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'catalog-anime', hasMoreAnimeCatalog, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isAnimeCatalogLoading = false;
    }
};

window.loadMoreCatalogAnime = function() {
    if (isAnimeCatalogLoading || !hasMoreAnimeCatalog) return;
    animeCatalogPage++;
    loadCatalogAnimeTab(animeCatalogPage, true);
};

// ==========================================
// 2. БАЗА ДАННЫХ: ТОП 100
// ==========================================

window.loadTop100Tab = async function(type = 'anime') {
    const container = document.getElementById('top100-list');
    if (!container) return;

    document.querySelectorAll('.top100-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading Top 100...' : 'Загрузка Топ 100...'}</div>`;

    try {
        const res = await fetch(`/api/top100?type=${type}&limit=100`);
        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-trophy"></i><p>${isEn ? 'List is empty' : 'Список пуст'}</p></div>`;
            return;
        }

        const isManga = (type === 'manga');
        const clickHandler = isManga ? 'openMangaModal' : 'openAnimeModal';

        container.innerHTML = `
            <div class="top100-table">
                ${items.map((item, idx) => {
                    const rank = idx + 1;
                    let medalBadge = `<span class="top100-rank-num">#${rank}</span>`;
                    if (rank === 1) medalBadge = '<span class="top100-medal gold">🥇 1</span>';
                    else if (rank === 2) medalBadge = '<span class="top100-medal silver">🥈 2</span>';
                    else if (rank === 3) medalBadge = '<span class="top100-medal bronze">🥉 3</span>';

                    let episodesOrChapters = '';
                    if (isManga) {
                        if (item.chapters) episodesOrChapters = `${item.chapters} ${isEn ? 'ch.' : 'гл.'}`;
                        else if (item.volumes) episodesOrChapters = `${item.volumes} ${isEn ? 'vol.' : 'том.'}`;
                        else episodesOrChapters = isEn ? 'Manga' : 'Манга';
                    } else {
                        if (item.episodes) episodesOrChapters = `${item.episodes} ${isEn ? 'eps' : 'эп.'}`;
                        else if (item.kind === 'MOVIE') episodesOrChapters = isEn ? 'Movie' : 'Фильм';
                        else episodesOrChapters = isEn ? 'Series' : 'Сериал';
                    }

                    let kindLabel = item.kind || '';
                    if (isEn) {
                        if (kindLabel === 'TV') kindLabel = 'TV Series';
                        else if (kindLabel === 'MOVIE') kindLabel = 'Movie';
                        else if (kindLabel === 'OVA') kindLabel = 'OVA';
                        else if (kindLabel === 'ONA') kindLabel = 'ONA';
                        else if (kindLabel === 'SPECIAL') kindLabel = 'Special';
                        else if (kindLabel === 'MANGA') kindLabel = 'Manga';
                        else if (kindLabel === 'MANHWA') kindLabel = 'Manhwa';
                        else if (kindLabel === 'MANHUA') kindLabel = 'Manhua';
                        else if (kindLabel === 'LIGHT NOVEL' || kindLabel === 'NOVEL') kindLabel = 'Novel';
                    }

                    const genresList = (item.genres && item.genres.length) 
                        ? (typeof formatGenresText === 'function' ? formatGenresText(item.genres.slice(0, 2).join(', ')) : item.genres.slice(0, 2).join(', ')) 
                        : '';
                    const posterUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : DEFAULT_NO_POSTER;
                    const title = (isEn && item.name) ? item.name : (item.russian || item.name);

                    return `
                        <div class="top100-row-card top100-row" onclick="${clickHandler}(${item.id})">
                            <div class="top100-rank-col">${medalBadge}</div>
                            <div class="top100-poster-col">
                                <img src="${posterUrl}" alt="${(title || '').replace(/"/g, '&quot;')}" class="top100-poster" loading="lazy">
                            </div>
                            <div class="top100-info-col">
                                <div class="top100-item-title top100-title" title="${(title || '').replace(/"/g, '&quot;')}">${title}</div>
                                <div class="top100-item-meta top100-meta-tags">
                                    ${kindLabel ? `<span class="top100-kind-tag top100-kind-badge">${kindLabel}</span>` : ''}
                                    <span>${episodesOrChapters}</span>
                                    ${item.year ? `<span>${item.year}</span>` : ''}
                                    ${genresList ? `<span class="top100-genres">${genresList}</span>` : ''}
                                </div>
                            </div>
                            <div class="top100-score-col">
                                <span class="top100-score-val"><i class="ti ti-star-filled"></i> ${item.score || '—'}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch(err) {
        container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    }
};

// ==========================================
// 3. БАЗА ДАННЫХ: МАНГА КАТАЛОГ
// ==========================================

let mangaCatalogPage = 1;
let isMangaCatalogLoading = false;
let hasMoreMangaCatalog = true;

window.loadCatalogMangaTab = async function(page = 1, append = false) {
    const container = document.getElementById('catalog-manga-list');
    if (!container) return;

    if (isMangaCatalogLoading) return;
    isMangaCatalogLoading = true;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!append) {
        mangaCatalogPage = 1;
        hasMoreMangaCatalog = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading manga...' : 'Загрузка манги...'}</div>`;
    } else {
        mangaCatalogPage = page;
    }

    updateTabSentinel(container, 'catalog-manga', hasMoreMangaCatalog, true);

    const kind = document.getElementById('manga-cat-kind')?.value || '';
    const status = document.getElementById('manga-cat-status')?.value || '';
    const order = document.getElementById('manga-cat-order')?.value || 'ranked';
    const search = document.getElementById('manga-cat-search')?.value || '';

    const params = new URLSearchParams({
        page: mangaCatalogPage,
        limit: 24,
        order: order
    });
    if (kind) params.append('kind', kind);
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    try {
        const res = await fetch(`/api/manga/catalog?${params.toString()}`);
        const items = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(items) || items.length === 0) {
            hasMoreMangaCatalog = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-book-off"></i><p>${isEn ? 'No manga found' : 'Манга не найдена'}</p></div>`;
            }
            updateTabSentinel(container, 'catalog-manga', false, false);
            return;
        }

        if (items.length < 5) {
            hasMoreMangaCatalog = false;
        }

        const cardsHtml = items.map(manga => {
            const posterUrl = manga.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(manga.image) : manga.image) : DEFAULT_NO_POSTER;
            const title = (isEn && manga.name) ? manga.name : (manga.russian || manga.name);
            const chaptersText = manga.chapters ? `${manga.chapters} ${isEn ? 'ch.' : 'гл.'}` : (isEn ? 'Manga' : 'Манга');
            const genresText = (manga.genres && manga.genres.length) ? (typeof formatGenresText === 'function' ? formatGenresText(manga.genres.slice(0, 2).join(', ')) : manga.genres.slice(0, 2).join(', ')) : '';

            return `
                <div class="portal-media-card" onclick="openMangaModal(${manga.id})">
                    <div class="portal-media-poster-wrap">
                        <img src="${posterUrl}" alt="${(title || '').replace(/"/g, '&quot;')}" class="portal-media-poster" loading="lazy">
                        ${manga.score ? `<span class="portal-score-badge"><i class="ti ti-star-filled"></i> ${manga.score}</span>` : ''}
                        ${manga.kind ? `<span class="portal-kind-badge">${manga.kind}</span>` : ''}
                    </div>
                    <div class="portal-media-info">
                        <div class="portal-media-title" title="${(title || '').replace(/"/g, '&quot;')}">${title}</div>
                        <div class="portal-media-meta">
                            <span>${chaptersText}</span>
                            <span class="portal-media-genres">${genresText}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'catalog-manga', hasMoreMangaCatalog, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isMangaCatalogLoading = false;
    }
};

window.loadMoreCatalogManga = function() {
    if (isMangaCatalogLoading || !hasMoreMangaCatalog) return;
    mangaCatalogPage++;
    loadCatalogMangaTab(mangaCatalogPage, true);
};

// ==========================================
// 4. БАЗА ДАННЫХ: РАНОБЭ КАТАЛОГ
// ==========================================

let ranobeCatalogPage = 1;
let isRanobeCatalogLoading = false;
let hasMoreRanobeCatalog = true;

window.loadCatalogRanobeTab = async function(page = 1, append = false) {
    const container = document.getElementById('catalog-ranobe-list');
    if (!container) return;

    if (isRanobeCatalogLoading) return;
    isRanobeCatalogLoading = true;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!append) {
        ranobeCatalogPage = 1;
        hasMoreRanobeCatalog = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading light novels...' : 'Загрузка ранобэ...'}</div>`;
    } else {
        ranobeCatalogPage = page;
    }

    updateTabSentinel(container, 'catalog-ranobe', hasMoreRanobeCatalog, true);

    const status = document.getElementById('ranobe-cat-status')?.value || '';
    const order = document.getElementById('ranobe-cat-order')?.value || 'ranked';
    const search = document.getElementById('ranobe-cat-search')?.value || '';

    const params = new URLSearchParams({
        page: ranobeCatalogPage,
        limit: 24,
        order: order
    });
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    try {
        const res = await fetch(`/api/ranobe/catalog?${params.toString()}`);
        const items = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(items) || items.length === 0) {
            hasMoreRanobeCatalog = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-notebook"></i><p>${isEn ? 'No light novels found' : 'Ранобэ не найдены'}</p></div>`;
            }
            updateTabSentinel(container, 'catalog-ranobe', false, false);
            return;
        }

        if (items.length < 5) {
            hasMoreRanobeCatalog = false;
        }

        const cardsHtml = items.map(ranobe => {
            const posterUrl = ranobe.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(ranobe.image) : ranobe.image) : DEFAULT_NO_POSTER;
            const title = (isEn && ranobe.name) ? ranobe.name : (ranobe.russian || ranobe.name);
            const volumesText = ranobe.volumes ? `${ranobe.volumes} ${isEn ? 'vol.' : 'том.'}` : (isEn ? 'Novel' : 'Новелла');
            const genresText = (ranobe.genres && ranobe.genres.length) ? (typeof formatGenresText === 'function' ? formatGenresText(ranobe.genres.slice(0, 2).join(', ')) : ranobe.genres.slice(0, 2).join(', ')) : '';

            return `
                <div class="portal-media-card" onclick="openMangaModal(${ranobe.id})">
                    <div class="portal-media-poster-wrap">
                        <img src="${posterUrl}" alt="${(title || '').replace(/"/g, '&quot;')}" class="portal-media-poster" loading="lazy">
                        ${ranobe.score ? `<span class="portal-score-badge"><i class="ti ti-star-filled"></i> ${ranobe.score}</span>` : ''}
                        <span class="portal-kind-badge">${isEn ? 'NOVEL' : 'РАНОБЭ'}</span>
                    </div>
                    <div class="portal-media-info">
                        <div class="portal-media-title" title="${(title || '').replace(/"/g, '&quot;')}">${title}</div>
                        <div class="portal-media-meta">
                            <span>${volumesText}</span>
                            <span class="portal-media-genres">${genresText}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'catalog-ranobe', hasMoreRanobeCatalog, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isRanobeCatalogLoading = false;
    }
};

window.loadMoreCatalogRanobe = function() {
    if (isRanobeCatalogLoading || !hasMoreRanobeCatalog) return;
    ranobeCatalogPage++;
    loadCatalogRanobeTab(ranobeCatalogPage, true);
};

// ==========================================
// 5. СООБЩЕСТВО: ФОРУМ
// ==========================================

let currentForumCategory = 'all';
let forumPage = 1;
let isForumLoading = false;
let hasMoreForum = true;

function formatForumCategoryName(name) {
    if (!name) return '';
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (!isEn) return name;
    const n = name.toLowerCase();
    if (n.includes('аниме и манга') || n.includes('animanga')) return 'Anime & Manga';
    if (n.includes('новост') || n.includes('news')) return 'News';
    if (n.includes('реценз') || n.includes('critique') || n.includes('review')) return 'Reviews';
    if (n.includes('коллекц') || n.includes('collection')) return 'Collections';
    if (n.includes('стать') || n.includes('article')) return 'Articles';
    if (n.includes('офтопик') || n.includes('offtopic')) return 'Off-topic';
    if (n.includes('клуб') || n.includes('club')) return 'Clubs';
    if (n.includes('сайт') || n.includes('site')) return 'Site';
    return name;
}

window.loadForumTab = async function(category = 'all', page = 1, append = false) {
    if (category !== currentForumCategory && !append) {
        currentForumCategory = category;
        forumPage = 1;
        hasMoreForum = true;
    }
    
    const container = document.getElementById('forum-topics-list');
    if (!container) return;

    document.querySelectorAll('.forum-cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.forum === currentForumCategory);
    });

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (isForumLoading) return;
    isForumLoading = true;

    if (!append) {
        forumPage = 1;
        hasMoreForum = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading forum topics...' : 'Загрузка тем форума...'}</div>`;
    } else {
        forumPage = page;
    }

    updateTabSentinel(container, 'forum', hasMoreForum, true);

    try {
        const res = await fetch(`/api/forum/topics?forum=${currentForumCategory}&page=${forumPage}&limit=25`);
        const topics = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(topics) || topics.length === 0) {
            hasMoreForum = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-messages-off"></i><p>${isEn ? 'No topics found' : 'Темы не найдены'}</p></div>`;
            }
            updateTabSentinel(container, 'forum', false, false);
            return;
        }

        if (topics.length < 5) {
            hasMoreForum = false;
        }

        let stackEl = container.querySelector('.forum-topics-stack');
        if (!stackEl) {
            stackEl = document.createElement('div');
            stackEl.className = 'forum-topics-stack';
            container.appendChild(stackEl);
        }

        const cardsHtml = topics.map(t => {
            const catName = formatForumCategoryName(t.forum_name || (isEn ? 'Anime & Manga' : 'Аниме и Манга'));
            return `
                <div class="forum-topic-card">
                    <div class="forum-topic-main">
                        <div class="forum-topic-meta-top">
                            <span class="forum-topic-badge">${catName}</span>
                            <span class="forum-topic-author">${isEn ? 'by' : 'от'} ${t.author || 'Пользователь'}</span>
                            <span class="forum-topic-time">${formatTimeAgo ? formatTimeAgo(t.created_at) : t.created_at}</span>
                        </div>
                        <a href="${t.url}" target="_blank" class="forum-topic-title">${t.title}</a>
                    </div>
                    <div class="forum-topic-stats">
                        <span class="forum-comments-badge"><i class="ti ti-message-circle"></i> ${t.comments_count}</span>
                    </div>
                </div>
            `;
        }).join('');

        stackEl.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'forum', hasMoreForum, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isForumLoading = false;
    }
};

window.loadMoreForum = function() {
    if (isForumLoading || !hasMoreForum) return;
    forumPage++;
    loadForumTab(currentForumCategory, forumPage, true);
};

// ==========================================
// 6. СООБЩЕСТВО: КЛУБЫ
// ==========================================

let clubsPage = 1;
let isClubsLoading = false;
let hasMoreClubs = true;

window.loadClubsTab = async function(page = 1, append = false) {
    const container = document.getElementById('clubs-grid-list');
    if (!container) return;

    if (isClubsLoading) return;
    isClubsLoading = true;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!append) {
        clubsPage = 1;
        hasMoreClubs = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading clubs...' : 'Загрузка клубов...'}</div>`;
    } else {
        clubsPage = page;
    }

    updateTabSentinel(container, 'clubs', hasMoreClubs, true);

    const search = document.getElementById('clubs-search-input')?.value || '';

    try {
        const res = await fetch(`/api/clubs/popular?page=${clubsPage}&limit=24&search=${encodeURIComponent(search)}`);
        const clubs = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(clubs) || clubs.length === 0) {
            hasMoreClubs = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-circles-relation"></i><p>${isEn ? 'No clubs found' : 'Клубы не найдены'}</p></div>`;
            }
            updateTabSentinel(container, 'clubs', false, false);
            return;
        }

        if (clubs.length < 5) {
            hasMoreClubs = false;
        }

        let gridEl = container.querySelector('.portal-clubs-grid');
        if (!gridEl) {
            gridEl = document.createElement('div');
            gridEl.className = 'portal-clubs-grid';
            container.appendChild(gridEl);
        }

        const cardsHtml = clubs.map(c => {
            const logoUrl = c.logo ? (typeof buildImgUrl === 'function' ? buildImgUrl(c.logo) : c.logo) : '';
            const isPublic = c.join_policy === 'free' || c.members_label === 'Открытый клуб';
            const policyText = isEn 
                ? (isPublic ? 'Public club' : 'By application')
                : (c.members_label || (isPublic ? 'Открытый клуб' : 'По заявкам'));
            return `
                <a href="${c.url}" target="_blank" class="portal-club-card">
                    <div class="portal-club-logo-wrap">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${c.name}" class="portal-club-logo" loading="lazy">` : `<div class="portal-club-logo placeholder"><i class="ti ti-users"></i></div>`}
                    </div>
                    <div class="portal-club-body">
                        <div class="portal-club-name" title="${c.name}">${c.name}</div>
                        <div class="portal-club-meta">
                            <span><i class="ti ti-users"></i> ${policyText}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        gridEl.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'clubs', hasMoreClubs, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isClubsLoading = false;
    }
};

window.loadMoreClubs = function() {
    if (isClubsLoading || !hasMoreClubs) return;
    clubsPage++;
    loadClubsTab(clubsPage, true);
};

// ==========================================
// 7. СООБЩЕСТВО: КОЛЛЕКЦИИ
// ==========================================

let collectionsPage = 1;
let isCollectionsLoading = false;
let hasMoreCollections = true;

window.loadCollectionsTab = async function(page = 1, append = false) {
    const container = document.getElementById('collections-grid-list');
    if (!container) return;

    if (isCollectionsLoading) return;
    isCollectionsLoading = true;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!append) {
        collectionsPage = 1;
        hasMoreCollections = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading collections...' : 'Загрузка коллекций...'}</div>`;
    } else {
        collectionsPage = page;
    }

    updateTabSentinel(container, 'collections', hasMoreCollections, true);

    try {
        const res = await fetch(`/api/collections/catalog?page=${collectionsPage}&limit=24`);
        const collections = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(collections) || collections.length === 0) {
            hasMoreCollections = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-layout-grid"></i><p>${isEn ? 'No collections found' : 'Коллекции не найдены'}</p></div>`;
            }
            updateTabSentinel(container, 'collections', false, false);
            return;
        }

        if (collections.length < 5) {
            hasMoreCollections = false;
        }

        let gridEl = container.querySelector('.portal-collections-grid');
        if (!gridEl) {
            gridEl = document.createElement('div');
            gridEl.className = 'portal-collections-grid';
            container.appendChild(gridEl);
        }

        const cardsHtml = collections.map(c => {
            const imgUrl = c.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(c.image) : c.image) : '';
            return `
                <a href="${c.url}" target="_blank" class="portal-collection-card">
                    <div class="portal-collection-thumb-wrap">
                        ${imgUrl ? `<img src="${imgUrl}" alt="${c.title}" class="portal-collection-thumb" loading="lazy">` : `<div class="portal-collection-thumb placeholder"><i class="ti ti-layout-grid"></i></div>`}
                    </div>
                    <div class="portal-collection-body">
                        <div class="portal-collection-title">${c.title}</div>
                        <div class="portal-collection-meta">
                            <span>👤 ${c.author || (isEn ? 'Author' : 'Автор')}</span>
                            <span><i class="ti ti-message-circle"></i> ${c.comments_count}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        gridEl.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'collections', hasMoreCollections, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isCollectionsLoading = false;
    }
};

window.loadMoreCollections = function() {
    if (isCollectionsLoading || !hasMoreCollections) return;
    collectionsPage++;
    loadCollectionsTab(collectionsPage, true);
};

// ==========================================
// 8. СООБЩЕСТВО: РЕЦЕНЗИИ
// ==========================================

let critiquesPage = 1;
let isCritiquesLoading = false;
let hasMoreCritiques = true;

window.loadCritiquesTab = async function(page = 1, append = false) {
    const container = document.getElementById('critiques-list-container');
    if (!container) return;

    if (isCritiquesLoading) return;
    isCritiquesLoading = true;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!append) {
        critiquesPage = 1;
        hasMoreCritiques = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading reviews...' : 'Загрузка рецензий...'}</div>`;
    } else {
        critiquesPage = page;
    }

    updateTabSentinel(container, 'critiques', hasMoreCritiques, true);

    try {
        const res = await fetch(`/api/critiques/catalog?page=${critiquesPage}&limit=24`);
        const critiques = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(critiques) || critiques.length === 0) {
            hasMoreCritiques = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-pencil"></i><p>${isEn ? 'No reviews found' : 'Рецензии не найдены'}</p></div>`;
            }
            updateTabSentinel(container, 'critiques', false, false);
            return;
        }

        if (critiques.length < 5) {
            hasMoreCritiques = false;
        }

        let stackEl = container.querySelector('.critiques-stack');
        if (!stackEl) {
            stackEl = document.createElement('div');
            stackEl.className = 'critiques-stack';
            container.appendChild(stackEl);
        }

        const cardsHtml = critiques.map(c => `
            <div class="critique-card">
                <div class="critique-header">
                    <div class="critique-author-row">
                        <span class="critique-badge"><i class="ti ti-pencil"></i> ${isEn ? 'Review' : 'Рецензия'}</span>
                        <span class="critique-author">👤 ${c.author}</span>
                        <span class="critique-date">${formatTimeAgo ? formatTimeAgo(c.date) : c.date}</span>
                    </div>
                    <a href="${c.url}" target="_blank" class="critique-title">${c.title}</a>
                </div>
                ${c.snippet ? `<div class="critique-snippet">${c.snippet}...</div>` : ''}
                <div class="critique-footer">
                    <a href="${c.url}" target="_blank" class="critique-read-more">${isEn ? 'Read full review' : 'Читать полностью'} <i class="ti ti-arrow-right"></i></a>
                    <span class="critique-comments"><i class="ti ti-message-circle"></i> ${c.comments_count}</span>
                </div>
            </div>
        `).join('');

        stackEl.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'critiques', hasMoreCritiques, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isCritiquesLoading = false;
    }
};

window.loadMoreCritiques = function() {
    if (isCritiquesLoading || !hasMoreCritiques) return;
    critiquesPage++;
    loadCritiquesTab(critiquesPage, true);
};

// ==========================================
// 9. СООБЩЕСТВО: СТАТЬИ
// ==========================================

let articlesPage = 1;
let isArticlesLoading = false;
let hasMoreArticles = true;

window.loadArticlesTab = async function(page = 1, append = false) {
    const container = document.getElementById('articles-list-container');
    if (!container) return;

    if (isArticlesLoading) return;
    isArticlesLoading = true;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!append) {
        articlesPage = 1;
        hasMoreArticles = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading articles...' : 'Загрузка статей...'}</div>`;
    } else {
        articlesPage = page;
    }

    updateTabSentinel(container, 'articles', hasMoreArticles, true);

    try {
        const res = await fetch(`/api/articles/catalog?page=${articlesPage}&limit=24`);
        const articles = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(articles) || articles.length === 0) {
            hasMoreArticles = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-file-text"></i><p>${isEn ? 'No articles found' : 'Статьи не найдены'}</p></div>`;
            }
            updateTabSentinel(container, 'articles', false, false);
            return;
        }

        if (articles.length < 5) {
            hasMoreArticles = false;
        }

        let gridEl = container.querySelector('.articles-grid');
        if (!gridEl) {
            gridEl = document.createElement('div');
            gridEl.className = 'articles-grid';
            container.appendChild(gridEl);
        }

        const cardsHtml = articles.map(a => {
            const imgUrl = a.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(a.image) : a.image) : '';
            return `
                <a href="${a.url}" target="_blank" class="article-card">
                    ${imgUrl ? `<img src="${imgUrl}" alt="${a.title}" class="article-thumb" loading="lazy">` : `<div class="article-thumb placeholder"><i class="ti ti-file-text"></i></div>`}
                    <div class="article-body">
                        <div class="article-tag">${isEn ? 'Article' : 'Статья'}</div>
                        <div class="article-title">${a.title}</div>
                        ${a.snippet ? `<div class="article-snippet">${a.snippet}...</div>` : ''}
                        <div class="article-footer">
                            <span>👤 ${a.author}</span>
                            <span><i class="ti ti-message-circle"></i> ${a.comments_count}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        gridEl.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'articles', hasMoreArticles, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isArticlesLoading = false;
    }
};

window.loadMoreArticles = function() {
    if (isArticlesLoading || !hasMoreArticles) return;
    articlesPage++;
    loadArticlesTab(articlesPage, true);
};

// ==========================================
// 10. СООБЩЕСТВО: ПОЛЬЗОВАТЕЛИ
// ==========================================

let usersPage = 1;
let isUsersLoading = false;
let hasMoreUsers = true;

window.loadUsersTab = async function(page = 1, append = false) {
    const container = document.getElementById('users-grid-container');
    if (!container) return;

    if (isUsersLoading) return;
    isUsersLoading = true;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!append) {
        usersPage = 1;
        hasMoreUsers = true;
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading users...' : 'Загрузка пользователей...'}</div>`;
    } else {
        usersPage = page;
    }

    updateTabSentinel(container, 'users', hasMoreUsers, true);

    const search = document.getElementById('users-search-input')?.value || '';

    try {
        const res = await fetch(`/api/users/search?page=${usersPage}&limit=36&search=${encodeURIComponent(search)}`);
        const users = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(users) || users.length === 0) {
            hasMoreUsers = false;
            if (!append) {
                container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-user-off"></i><p>${isEn ? 'No users found' : 'Пользователи не найдены'}</p></div>`;
            }
            updateTabSentinel(container, 'users', false, false);
            return;
        }

        if (users.length < 5) {
            hasMoreUsers = false;
        }

        let gridEl = container.querySelector('.users-cards-grid');
        if (!gridEl) {
            gridEl = document.createElement('div');
            gridEl.className = 'users-cards-grid';
            container.appendChild(gridEl);
        }

        const cardsHtml = users.map(u => {
            const avatarUrl = u.avatar ? (typeof buildImgUrl === 'function' ? buildImgUrl(u.avatar) : u.avatar) : '';
            return `
                <a href="${u.url}" target="_blank" class="user-portal-card">
                    ${avatarUrl ? `<img src="${avatarUrl}" alt="${u.nickname}" class="user-portal-avatar" loading="lazy">` : `<div class="user-portal-avatar placeholder"><i class="ti ti-user"></i></div>`}
                    <div class="user-portal-info">
                        <div class="user-portal-nick" title="${u.nickname}">${u.nickname}</div>
                        <div class="user-portal-status">
                            ${u.last_online_at ? `<span class="online-indicator"></span> ${formatTimeAgo ? formatTimeAgo(u.last_online_at) : (isEn ? 'online' : 'онлайн')}` : (isEn ? 'Member' : 'Участник')}
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        gridEl.insertAdjacentHTML('beforeend', cardsHtml);
        updateTabSentinel(container, 'users', hasMoreUsers, false);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    } finally {
        isUsersLoading = false;
    }
};

window.loadMoreUsers = function() {
    if (isUsersLoading || !hasMoreUsers) return;
    usersPage++;
    loadUsersTab(usersPage, true);
};

// ==========================================
// 11. РАЗНОЕ: РЕКОМЕНДАЦИИ
// ==========================================

window.loadRecommendationsTab = async function() {
    const container = document.getElementById('recommendations-grid-container');
    if (!container) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading recommendations...' : 'Подбор рекомендаций...'}</div>`;

    try {
        const res = await fetch('/api/recommendations');
        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = `<div class="portal-empty-state"><i class="ti ti-thumb-up"></i><p>${isEn ? 'No recommendations found' : 'Не удалось составить рекомендации'}</p></div>`;
            return;
        }

        container.innerHTML = `
            <div class="portal-media-grid">
                ${items.map(anime => {
                    const posterUrl = anime.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(anime.image) : anime.image) : DEFAULT_NO_POSTER;
                    const title = (isEn && anime.name) ? anime.name : (anime.russian || anime.name);
                    return `
                        <div class="portal-media-card" onclick="openAnimeModal(${anime.id})">
                            <div class="portal-media-poster-wrap">
                                <img src="${posterUrl}" alt="${(title || '').replace(/"/g, '&quot;')}" class="portal-media-poster" loading="lazy">
                                <span class="portal-score-badge"><i class="ti ti-star-filled"></i> ${anime.score || '7.5+'}</span>
                                <span class="portal-kind-badge">${anime.kind || 'TV'}</span>
                            </div>
                            <div class="portal-media-info">
                                <div class="portal-media-title" title="${(title || '').replace(/"/g, '&quot;')}">${title}</div>
                                <div class="portal-media-meta">
                                    <span>${anime.year || ''}</span>
                                    <span class="badge-rec-match">${isEn ? 'Recommended' : 'Рекомендовано'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch(err) {
        container.innerHTML = `<p style="color: var(--danger);">${typeof i18n === 'function' ? i18n('error') : 'Ошибка'}: ${err.message}</p>`;
    }
};

// ==========================================
// 12. РАЗНОЕ: КАЛЕНДАРЬ ОНГОИНГОВ
// ==========================================

let fullCalendarCache = null;
let currentFullCalendarDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

window.loadFullCalendarTab = async function() {
    const container = document.getElementById('full-calendar-container');
    if (!container) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    if (!fullCalendarCache) {
        container.innerHTML = `<div class="loader"><i class="ti ti-loader animate-spin"></i> ${isEn ? 'Loading ongoing schedule...' : 'Загрузка расписания онгоингов...'}</div>`;
        try {
            const res = await fetch('/api/calendar');
            fullCalendarCache = await res.json();
        } catch(err) {
            container.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`;
            return;
        }
    }
    renderFullCalendarUI(currentFullCalendarDay);
};

window.setFullCalendarDay = function(dayIndex) {
    currentFullCalendarDay = dayIndex;
    renderFullCalendarUI(dayIndex);
};

function renderFullCalendarUI(activeDay) {
    const container = document.getElementById('full-calendar-container');
    if (!container || !fullCalendarCache) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;

    const days = isEn ? [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ] : [
        'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'
    ];
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    const filtered = (Array.isArray(fullCalendarCache) ? fullCalendarCache : []).filter(item => item.day_of_week === activeDay);

    container.innerHTML = `
        <div class="full-calendar-view">
            <div class="calendar-days-nav">
                ${days.map((day, idx) => `
                    <button type="button" class="cal-nav-btn ${idx === activeDay ? 'active' : ''} ${idx === todayIndex ? 'today' : ''}" onclick="setFullCalendarDay(${idx})">
                        <span>${day}</span>
                        ${idx === todayIndex ? `<span class="cal-today-tag">${isEn ? 'Today' : 'Сегодня'}</span>` : ''}
                    </button>
                `).join('')}
            </div>

            <div class="calendar-cards-grid">
                ${filtered.length > 0 ? filtered.map(item => {
                    const title = (isEn && item.name) ? item.name : (item.russian || item.name);
                    const posterUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : DEFAULT_NO_POSTER;
                    const nextEpText = item.next_episode 
                        ? (isEn ? `Ep ${item.next_episode}` : `${item.next_episode} эп.`) 
                        : (isEn ? 'New episode' : 'Новая серия');
                    return `
                        <div class="calendar-grid-card" onclick="openAnimeModal(${item.id})">
                            <div class="cal-card-poster-wrap">
                                <img src="${posterUrl}" alt="${(title || '').replace(/"/g, '&quot;')}" class="cal-card-poster" loading="lazy">
                                ${item.time_str ? `<span class="cal-time-tag"><i class="ti ti-clock"></i> ${item.time_str}</span>` : ''}
                                ${item.score ? `<span class="cal-score-tag"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                            </div>
                            <div class="cal-card-body">
                                <div class="cal-card-title" title="${(title || '').replace(/"/g, '&quot;')}">${title}</div>
                                <div class="cal-card-meta">
                                    <span class="cal-next-badge">${nextEpText}</span>
                                    <span class="cal-kind-tag">${item.kind || 'TV'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : `<div class="portal-empty-state"><i class="ti ti-calendar-off"></i><p>${isEn ? 'No releases on this day' : 'В этот день нет релизов'}</p></div>`}
            </div>
        </div>
    `;
}

// ==========================================
// 13. ГЛОБАЛЬНЫЙ БЕСКОНЕЧНЫЙ СКРОЛЛ (SENTINEL + SCROLL LISTENER)
// ==========================================

let globalSentinelObserver = null;

function triggerInfiniteScroll(targetTab) {
    if (!targetTab) {
        const activeTabEl = document.querySelector('.tab-content.active');
        targetTab = activeTabEl ? activeTabEl.id : (localStorage.getItem('activeTab') || 'profile');
    }

    if (targetTab === 'catalog-anime') {
        if (!isAnimeCatalogLoading && hasMoreAnimeCatalog) loadMoreCatalogAnime();
    } else if (targetTab === 'catalog-manga') {
        if (!isMangaCatalogLoading && hasMoreMangaCatalog) loadMoreCatalogManga();
    } else if (targetTab === 'catalog-ranobe') {
        if (!isRanobeCatalogLoading && hasMoreRanobeCatalog) loadMoreCatalogRanobe();
    } else if (targetTab === 'forum') {
        if (!isForumLoading && hasMoreForum) loadMoreForum();
    } else if (targetTab === 'clubs') {
        if (!isClubsLoading && hasMoreClubs) loadMoreClubs();
    } else if (targetTab === 'collections') {
        if (!isCollectionsLoading && hasMoreCollections) loadMoreCollections();
    } else if (targetTab === 'critiques') {
        if (!isCritiquesLoading && hasMoreCritiques) loadMoreCritiques();
    } else if (targetTab === 'articles') {
        if (!isArticlesLoading && hasMoreArticles) loadMoreArticles();
    } else if (targetTab === 'users') {
        if (!isUsersLoading && hasMoreUsers) loadMoreUsers();
    }
}

function initGlobalInfiniteScroll() {
    if ('IntersectionObserver' in window) {
        if (globalSentinelObserver) globalSentinelObserver.disconnect();
        globalSentinelObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const tabId = entry.target.dataset.tab;
                    triggerInfiniteScroll(tabId);
                }
            });
        }, {
            root: null,
            rootMargin: '600px',
            threshold: 0.01
        });

        document.querySelectorAll('.portal-infinite-sentinel').forEach(el => {
            globalSentinelObserver.observe(el);
        });
    }
}

let infiniteScrollThrottleTimer = null;

function handleGlobalInfiniteScroll() {
    if (infiniteScrollThrottleTimer) return;
    infiniteScrollThrottleTimer = setTimeout(() => {
        infiniteScrollThrottleTimer = null;
        
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const innerHeight = window.innerHeight || document.documentElement.clientHeight;
        const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);

        if (scrollY + innerHeight >= scrollHeight - 800) {
            triggerInfiniteScroll();
        }
    }, 120);
}

window.addEventListener('scroll', handleGlobalInfiniteScroll, { passive: true });
window.addEventListener('resize', handleGlobalInfiniteScroll, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
    initGlobalInfiniteScroll();
});

;
/* --- js/settings.js --- */
/* Настройки сайта: фон (цвет или фото), видимость разделов и вид навигации */

const BG_SETTINGS_KEY = 'app_bg_settings';
const SECTION_VISIBILITY_KEY = 'app_section_visibility';
const NAVBAR_VIEW_KEY = 'app_navbar_view';
const DEFAULT_NAVBAR_VIEW = 'full';
let currentBgMode = 'color';
let uploadedImageDataUrl = '';
let isAuthenticated = false;

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
            const data = await res.json();
            isAuthenticated = data.authenticated || false;
        }
    } catch (err) {
        console.error('Ошибка проверки авторизации:', err);
        isAuthenticated = false;
    }
    return isAuthenticated;
}

async function loadSettingsFromServer() {
    if (!isAuthenticated) return null;
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Ошибка загрузки настроек с сервера:', err);
    }
    return null;
}

async function saveSettingsToServer(settings) {
    if (!isAuthenticated) return false;
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        return res.ok;
    } catch (err) {
        console.error('Ошибка сохранения настроек на сервере:', err);
        return false;
    }
}

function getSavedBgSettings() {
    try {
        const raw = localStorage.getItem(BG_SETTINGS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error('Ошибка чтения настроек фона:', err);
        return null;
    }
}

function saveBgSettings(settings) {
    try {
        localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
        console.error('Ошибка сохранения настроек фона:', err);
    }
    // Also save to server if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ background: settings });
    }
}

function applyBgToPage(settings) {
    if (!settings || settings.mode === 'theme') {
        document.body.style.removeProperty('background-image');
        document.body.style.removeProperty('background-color');
        document.body.style.removeProperty('background-size');
        document.body.style.removeProperty('background-attachment');
        document.body.style.removeProperty('background-position');
        return;
    }

    document.body.style.setProperty('background-size', 'cover', 'important');
    document.body.style.setProperty('background-attachment', 'fixed', 'important');
    document.body.style.setProperty('background-position', 'center', 'important');

    if (settings.mode === 'image' && settings.image) {
        document.body.style.removeProperty('background-color');
        document.body.style.setProperty('background-image', `url("${settings.image}")`, 'important');
    } else if (settings.mode === 'color' && settings.color) {
        document.body.style.removeProperty('background-image');
        document.body.style.setProperty('background-color', settings.color, 'important');
    }
}

async function syncAndApplySettings() {
    await checkAuthStatus();

    let bgSettings = null;
    let navbarView = null;
    let sectionVis = null;

    if (isAuthenticated) {
        const serverSettings = await loadSettingsFromServer();
        if (serverSettings) {
            if (serverSettings.background) {
                bgSettings = serverSettings.background;
                try { localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(bgSettings)); } catch (e) {}
            }
            if (serverSettings.navbar_view) {
                navbarView = serverSettings.navbar_view;
                try { localStorage.setItem(NAVBAR_VIEW_KEY, navbarView); } catch (e) {}
            }
            if (serverSettings.section_visibility) {
                sectionVis = serverSettings.section_visibility;
                try { localStorage.setItem(SECTION_VISIBILITY_KEY, JSON.stringify(sectionVis)); } catch (e) {}
            }
        }
    }

    if (!bgSettings) bgSettings = getSavedBgSettings();
    if (!navbarView) navbarView = getSavedNavbarView();
    if (!sectionVis) sectionVis = getSectionVisibility();

    applyBgToPage(bgSettings);
    applyNavbarView(navbarView);
    applySectionVisibility();
}

async function applySavedBg() {
    let bgSettings = getSavedBgSettings();
    applyBgToPage(bgSettings);
}

function setBgMode(mode) {
    currentBgMode = mode;
    const colorPanel = document.getElementById('bg-color-panel');
    const imagePanel = document.getElementById('bg-image-panel');
    const colorBtn = document.getElementById('bg-mode-color-btn');
    const imageBtn = document.getElementById('bg-mode-image-btn');

    if (colorPanel) colorPanel.classList.toggle('hidden', mode !== 'color');
    if (imagePanel) imagePanel.classList.toggle('hidden', mode !== 'image');
    if (colorBtn) colorBtn.classList.toggle('active', mode === 'color');
    if (imageBtn) imageBtn.classList.toggle('active', mode === 'image');
}

function onBgColorChange(value) {
    const valueEl = document.getElementById('bg-color-value');
    if (valueEl) valueEl.innerText = value || '#2b133d';
    const settings = { mode: 'color', color: value, image: '' };
    saveBgSettings(settings);
    applyBgToPage(settings);
}

function onBgImageUrlChange(value) {
    const url = value.trim();
    if (!url) return;
    uploadedImageDataUrl = '';
    const settings = { mode: 'image', color: '', image: url };
    saveBgSettings(settings);
    applyBgToPage(settings);
}

function onBgImageFileChange(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedImageDataUrl = e.target.result;
        const urlInput = document.getElementById('bg-image-url');
        if (urlInput) urlInput.value = '';
        const settings = { mode: 'image', color: '', image: uploadedImageDataUrl };
        saveBgSettings(settings);
        applyBgToPage(settings);
    };
    reader.readAsDataURL(file);
}

function resetBackgroundSettings() {
    uploadedImageDataUrl = '';
    localStorage.removeItem(BG_SETTINGS_KEY);

    const colorInput = document.getElementById('bg-color-input');
    if (colorInput) {
        colorInput.value = colorInput.dataset.default || '#2b133d';
        const valueEl = document.getElementById('bg-color-value');
        if (valueEl) valueEl.innerText = colorInput.value;
    }
    const urlInput = document.getElementById('bg-image-url');
    if (urlInput) urlInput.value = '';
    const fileInput = document.getElementById('bg-image-file');
    if (fileInput) fileInput.value = '';

    // Reset on server too if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ background: { mode: 'theme', color: '', image: '' } });
    }

    applyBgToPage(null);
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    if (typeof updateMobileProfileBadges === 'function') {
        updateMobileProfileBadges();
    }

    const colorInput = document.getElementById('bg-color-input');
    if (colorInput && !colorInput.dataset.default) {
        colorInput.dataset.default = colorInput.value;
    }

    const saved = getSavedBgSettings();
    if (saved && saved.mode === 'image' && saved.image) {
        setBgMode('image');
        if (saved.image.startsWith('data:')) {
            uploadedImageDataUrl = saved.image;
        } else {
            const urlInput = document.getElementById('bg-image-url');
            if (urlInput) urlInput.value = saved.image;
        }
    } else if (saved && saved.mode === 'color' && saved.color) {
        if (colorInput) colorInput.value = saved.color;
        const valueEl = document.getElementById('bg-color-value');
        if (valueEl) valueEl.innerText = saved.color;
        setBgMode('color');
    } else {
        setBgMode('color');
    }

    loadSectionVisibilityToggles();
    applyNavbarView(getSavedNavbarView());
}

function closeSettingsModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close-btn') && !event.target.parentElement.classList.contains('modal-close-btn')) return;
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
}

/* ---- Видимость разделов ---- */

function getSectionVisibility() {
    try {
        const raw = localStorage.getItem(SECTION_VISIBILITY_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.error('Ошибка чтения настроек видимости разделов:', err);
        return {};
    }
}

function saveSectionVisibility(visibility) {
    try {
        localStorage.setItem(SECTION_VISIBILITY_KEY, JSON.stringify(visibility));
    } catch (err) {
        console.error('Ошибка сохранения настроек видимости разделов:', err);
    }
    // Also save to server if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ section_visibility: visibility });
    }
}

function onSectionToggle(checkbox) {
    const section = checkbox.dataset.section;
    if (!section) return;

    const visibility = getSectionVisibility();
    visibility[section] = checkbox.checked;
    saveSectionVisibility(visibility);
    applySectionVisibility();
}

function applySectionVisibility() {
    const visibility = getSectionVisibility();
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(el => {
        const section = el.dataset.section;
        if (section && visibility.hasOwnProperty(section)) {
            el.classList.toggle('section-hidden', !visibility[section]);
        }
    });
}

function loadSectionVisibilityToggles() {
    const visibility = getSectionVisibility();
    const toggles = document.querySelectorAll('.settings-toggle input[type="checkbox"][data-section]');
    toggles.forEach(toggle => {
        const section = toggle.dataset.section;
        if (section && visibility.hasOwnProperty(section)) {
            toggle.checked = visibility[section];
        }
    });
}

/* ---- Вид навигации ---- */

function getSavedNavbarView() {
    try {
        const raw = localStorage.getItem(NAVBAR_VIEW_KEY);
        return raw ? raw : DEFAULT_NAVBAR_VIEW;
    } catch (err) {
        console.error('Ошибка чтения настроек вида навигации:', err);
        return DEFAULT_NAVBAR_VIEW;
    }
}

function saveNavbarView(view) {
    try {
        localStorage.setItem(NAVBAR_VIEW_KEY, view);
    } catch (err) {
        console.error('Ошибка сохранения настроек вида навигации:', err);
    }
    if (isAuthenticated) {
        saveSettingsToServer({ navbar_view: view });
    }
}

function applyNavbarView(view) {
    const header = document.querySelector('.app-header');
    if (!header) return;

    header.classList.remove('navbar-view-full', 'navbar-view-icons', 'navbar-view-titles');
    if (view && view !== DEFAULT_NAVBAR_VIEW) {
        header.classList.add(`navbar-view-${view}`);
    }

    const options = document.querySelectorAll('.navbar-view-option');
    options.forEach(opt => {
        const optView = opt.dataset.navbarView;
        opt.classList.toggle('active', optView === view);
    });
}

function setNavbarView(view) {
    if (!view) return;
    saveNavbarView(view);
    applyNavbarView(view);
}

document.addEventListener('DOMContentLoaded', () => {
    // Immediate local apply to prevent layout shifts
    applyBgToPage(getSavedBgSettings());
    applyNavbarView(getSavedNavbarView());
    applySectionVisibility();

    // Async server sync
    syncAndApplySettings();
});

;
