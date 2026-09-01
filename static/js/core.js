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
                    activeContent.innerHTML = `
                        <div class="card" style="text-align: center; padding: 40px 20px; max-width: 440px; margin: 30px auto; border-radius: 20px; border: 1px solid var(--card-border); background: var(--card-bg);">
                            <i class="ti ti-lock" style="font-size: 48px; color: var(--accent); margin-bottom: 12px; display: inline-block;"></i>
                            <h2 style="font-size: 20px; margin: 0 0 10px 0; color: var(--text-main);">${i18n('auth.required') || 'Требуется авторизация'}</h2>
                            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Войдите через Shikimori, чтобы просматривать свои списки.</p>
                            <a href="/login" class="btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="ti ti-brand-shikimori"></i> <span>${i18n('login.via_shikimori') || 'Войти через Shikimori'}</span>
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
    if (title) title.textContent = 'Разделы';
    if (icon) icon.className = 'ti ti-layout-grid mobile-sections-logo-icon';
};

window.openSectionDetail = async function(sectionKey) {
    const mainView = document.getElementById('sections-main-view');
    const detailView = document.getElementById('sections-detail-view');
    const detailContent = document.getElementById('sections-detail-content');
    const backBtn = document.getElementById('mobile-sections-back-btn');
    const title = document.getElementById('mobile-sections-header-title');
    const icon = document.getElementById('mobile-sections-header-icon');

    if (!detailView || !detailContent) return;

    if (mainView) mainView.classList.add('hidden');
    detailView.classList.remove('hidden');
    if (backBtn) {
        backBtn.classList.remove('hidden');
        backBtn.style.setProperty('display', 'inline-flex', 'important');
    }

    if (typeof pushNavState === 'function') pushNavState();

    detailContent.innerHTML = '<div class="loader" style="padding: 40px; text-align: center;"><i class="ti ti-loader animate-spin" style="font-size: 32px; color: var(--primary);"></i><p style="color: var(--text-muted); margin-top: 12px;">Загрузка...</p></div>';

    if (sectionKey === 'calendar') {
        if (title) title.textContent = 'Расписание онгоингов';
        if (icon) icon.className = 'ti ti-calendar-event mobile-sections-logo-icon';
        await renderModalCalendar(modalCalendarDay);
    } else if (sectionKey === 'content') {
        if (title) title.textContent = 'Контент';
        if (icon) icon.className = 'ti ti-grid-dots mobile-sections-logo-icon';
        await renderModalContent();
    } else if (sectionKey === 'hot') {
        if (title) title.textContent = 'Темы дня';
        if (icon) icon.className = 'ti ti-flame mobile-sections-logo-icon';
        await renderModalHot();
    } else if (sectionKey === 'news') {
        if (title) title.textContent = 'Новости';
        if (icon) icon.className = 'ti ti-news mobile-sections-logo-icon';
        modalNewsPage = 1;
        await renderModalNews(1);
    }
};

async function renderModalCalendar(activeDay) {
    modalCalendarDay = activeDay;
    const detailContent = document.getElementById('sections-detail-content');
    if (!detailContent) return;

    if (!window.calendarDataCache) {
        try {
            const res = await fetch('/api/calendar');
            window.calendarDataCache = await res.json();
        } catch(e) {
            detailContent.innerHTML = '<p style="color: var(--danger); padding: 20px;">Ошибка загрузки календаря</p>';
            return;
        }
    }

    const data = Array.isArray(window.calendarDataCache) ? window.calendarDataCache : [];
    const daysShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
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
                const title = item.russian || item.name || '';
                const safeTitle = title.replace(/"/g, '&quot;');
                const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
                const time = item.time_str ? item.time_str : '';
                const nextEp = item.next_episode ? `${item.next_episode} эп.` : '';

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
            }).join('') : '<p style="color: var(--text-muted); padding: 30px; text-align: center; grid-column: 1 / -1;">В этот день нет запланированных серий</p>'}
        </div>
    `;
}
window.renderModalCalendar = renderModalCalendar;

async function renderModalContent() {
    const detailContent = document.getElementById('sections-detail-content');
    if (!detailContent) return;

    let exploreData = window._exploreDataCache;
    if (!exploreData) {
        try {
            const res = await fetch('/api/tab/explore');
            exploreData = await res.json();
            window._exploreDataCache = exploreData;
        } catch(e) {
            detailContent.innerHTML = '<p style="color: var(--danger); padding: 20px;">Ошибка загрузки контента</p>';
            return;
        }
    }

    const contentList = exploreData.content || [];
    const badgeMap = {
        'collection': 'Коллекция',
        'critique': 'Отзыв',
        'article': 'Статья',
        'news': 'Новость',
        '': 'Тема'
    };

    detailContent.innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;">
            <a href="https://shikimori.io/collections" target="_blank" class="btn-secondary" style="padding: 6px 12px; font-size: 12.5px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="ti ti-folder"></i> Коллекции</a>
            <a href="https://shikimori.io/forum/critiques" target="_blank" class="btn-secondary" style="padding: 6px 12px; font-size: 12.5px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="ti ti-message-2"></i> Отзывы</a>
            <a href="https://shikimori.io/articles" target="_blank" class="btn-secondary" style="padding: 6px 12px; font-size: 12.5px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="ti ti-article"></i> Статьи</a>
        </div>
        <div class="topics-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${contentList.length ? contentList.map(item => `
                <a href="${item.url}" target="_blank" class="topic-row-item" title="${(item.title || '').replace(/"/g, '&quot;')}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 16px; background: var(--card-bg); border: 1px solid var(--card-border); text-decoration: none; color: var(--text-main);">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; padding-right: 10px;">
                        <span style="font-size: 14px; font-weight: 500; line-height: 1.3;">${item.title}</span>
                        <span class="topic-badge badge-${(item.tag || '').toLowerCase()}" style="font-size: 11px; padding: 2px 6px; border-radius: 6px; align-self: flex-start; background: var(--primary-container); color: var(--on-primary-container);">${badgeMap[(item.tag || '').toLowerCase()] || 'Тема'}</span>
                    </div>
                    <span style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; flex-shrink: 0;"><i class="ti ti-message-circle"></i> ${item.comments_count || 0}</span>
                </a>
            `).join('') : '<p style="color: var(--text-muted); padding: 20px; text-align: center;">Нет данных</p>'}
        </div>
    `;
}

async function renderModalHot() {
    const detailContent = document.getElementById('sections-detail-content');
    if (!detailContent) return;

    let exploreData = window._exploreDataCache;
    if (!exploreData) {
        try {
            const res = await fetch('/api/tab/explore');
            exploreData = await res.json();
            window._exploreDataCache = exploreData;
        } catch(e) {
            detailContent.innerHTML = '<p style="color: var(--danger); padding: 20px;">Ошибка загрузки тем дня</p>';
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
            `).join('') : '<p style="color: var(--text-muted); padding: 20px; text-align: center;">Нет горячих тем на сегодня</p>'}
        </div>
    `;
}

async function renderModalNews(page = 1) {
    const detailContent = document.getElementById('sections-detail-content');
    if (!detailContent) return;

    if (page === 1) {
        detailContent.innerHTML = `
            <div id="modal-news-cards-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
            <div style="text-align: center; margin: 16px 0 24px 0;">
                <button type="button" id="modal-load-more-news-btn" class="btn-secondary" style="padding: 10px 20px; border-radius: 14px; font-size: 13px; font-weight: 600;" onclick="loadMoreModalNews()">
                    <i class="ti ti-refresh"></i> Загрузить ещё новости
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
    if (themeBadge) themeBadge.textContent = (theme === 'dark') ? 'Тёмная' : 'Светлая';
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