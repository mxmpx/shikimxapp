/* --- js/mobile.js --- */
/* ==========================================================================
   SHIKI MX APP — MOBILE JS
   Загружается только в мобильном режиме
   ========================================================================== */

(function initMobileTabRename() {
    function setMobileTabLabel() {
        if (typeof TRANSLATIONS !== 'undefined') {
            if (TRANSLATIONS.ru) TRANSLATIONS.ru['tab.profile'] = 'Обзор';
            if (TRANSLATIONS.en) TRANSLATIONS.en['tab.profile'] = 'Explore';
        }
        const profileTab = document.querySelector('.tab-btn[onclick*="profile"] .tab-label');
        if (profileTab) {
            const lang = (typeof getSavedLanguage === 'function') ? getSavedLanguage() : (localStorage.getItem('shiki_lang') || 'ru');
            profileTab.textContent = lang === 'en' ? 'Explore' : 'Обзор';
        }
    }

    setMobileTabLabel();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setMobileTabLabel);
    }
})();

/* Открытие/закрытие меню профиля на мобильном */
window.openMobileProfileMenu = function() {
    const modal = document.getElementById('mobile-profile-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    updateMobileProfileBadges();
};

window.closeMobileProfileMenu = function(event) {
    if (event && event.target !== event.currentTarget && !event.target.closest('.modal-close-btn')) return;
    const modal = document.getElementById('mobile-profile-modal');
    if (modal) modal.classList.add('hidden');
};

/* Обновление меток темы и языка внутри меню профиля и настроек */
function updateMobileProfileBadges() {
    const theme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark';
    const themeVal = document.getElementById('mobile-profile-theme-val');
    const themeIcon = document.getElementById('mobile-profile-theme-icon');
    if (themeVal) themeVal.textContent = (theme === 'dark') ? 'Тёмная' : 'Светлая';
    if (themeIcon) themeIcon.className = (theme === 'dark') ? 'ti ti-sun action-icon' : 'ti ti-moon action-icon';

    const settingsThemeVal = document.getElementById('mobile-settings-theme-val');
    const settingsThemeIcon = document.getElementById('mobile-settings-theme-icon');
    if (settingsThemeVal) settingsThemeVal.textContent = (theme === 'dark') ? 'Тёмная' : 'Светлая';
    if (settingsThemeIcon) settingsThemeIcon.className = (theme === 'dark') ? 'ti ti-sun action-icon' : 'ti ti-moon action-icon';

    const lang = (typeof getSavedLanguage === 'function') ? getSavedLanguage() : (localStorage.getItem('app_language') || 'ru');
    const langVal = document.getElementById('mobile-profile-lang-val');
    if (langVal) langVal.textContent = (lang === 'en') ? 'EN' : 'RU';

    const settingsLangVal = document.getElementById('mobile-settings-lang-val');
    if (settingsLangVal) settingsLangVal.textContent = (lang === 'en') ? 'EN' : 'RU';
}

window.updateMobileProfileBadges = updateMobileProfileBadges;

window.handleMobileToggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
        localStorage.setItem('theme', next);
    } catch(e) {}

    // Снимаем инлайн-цвет фона, если он мешает смене темы
    if (document.body && document.body.style.backgroundColor) {
        document.body.style.removeProperty('background-color');
    }

    if (typeof updateThemeIcon === 'function') {
        updateThemeIcon(next);
    }
    updateMobileProfileBadges();
};

window.handleMobileToggleLanguage = function() {
    const current = (typeof getSavedLanguage === 'function') ? getSavedLanguage() : (localStorage.getItem('app_language') || 'ru');
    const next = current === 'ru' ? 'en' : 'ru';
    if (typeof saveLanguage === 'function') {
        saveLanguage(next);
    } else {
        try { localStorage.setItem('app_language', next); } catch(e) {}
    }
    if (typeof currentLanguage !== 'undefined') {
        currentLanguage = next;
    }
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }
    if (typeof updateLanguageButton === 'function') {
        updateLanguageButton();
    }
    updateMobileProfileBadges();
};

window.handleMobileFriendsClick = function() {
    if (typeof closeMobileProfileMenu === 'function') {
        closeMobileProfileMenu();
    }
    if (typeof openMobileFriendsModal === 'function') {
        openMobileFriendsModal();
    }
};

window.openMobileFriendsModal = async function() {
    const modal = document.getElementById('mobile-friends-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const body = document.getElementById('mobile-friends-body');
    if (!body) return;

    if (!body.dataset.loaded) {
        body.innerHTML = '<div class="loader" style="padding: 40px; text-align: center;"><i class="ti ti-loader animate-spin" style="font-size: 32px; color: var(--primary);"></i><p style="color: var(--text-muted); margin-top: 12px;">' + (typeof t === 'function' ? t('friends.loading') : 'Загрузка друзей и клубов...') + '</p></div>';
        try {
            const res = await fetch('/api/tab/friends');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            renderMobileFriendsAndClubs(data);
            body.dataset.loaded = 'true';
        } catch(err) {
            console.error('Ошибка загрузки друзей:', err);
            body.innerHTML = '<p style="color: var(--danger); padding: 20px; text-align: center;">Не удалось загрузить друзей и клубы</p>';
        }
    }
};

window.closeMobileFriendsModal = function(event) {
    if (event && event.target !== event.currentTarget && !event.target.closest('.modal-close-btn')) return;
    const modal = document.getElementById('mobile-friends-modal');
    if (modal) modal.classList.add('hidden');
};

function renderMobileFriendsAndClubs(data) {
    const body = document.getElementById('mobile-friends-body');
    if (!body) return;
    const friends = data.friends || [];
    const clubs = data.clubs || [];

    let friendsHtml = '<div class="mobile-profile-section">' +
        '<div class="mobile-section-title"><i class="ti ti-users"></i> <span>' + (typeof t === 'function' ? t('friends.friends') : 'Друзья') + ' (' + friends.length + ')</span></div>';
    if (friends.length > 0) {
        friendsHtml += '<div class="mobile-friends-grid">' + friends.map(function(f) {
            const name = f.nickname || f.name || '';
            const img = (typeof buildImgUrl === 'function') ? buildImgUrl(f.avatar || f.image) : (f.avatar || f.image || '');
            return '<div class="mobile-friend-card" onclick="if(typeof openFriendModal===\'function\'){openFriendModal(\'' + name + '\');}">' +
                '<img src="' + img + '" alt="' + name + '" class="mobile-friend-avatar" loading="lazy">' +
                '<span class="mobile-friend-name">' + name + '</span>' +
            '</div>';
        }).join('') + '</div>';
    } else {
        friendsHtml += '<p style="color: var(--text-muted); font-size: 13px; margin: 0;">' + (typeof t === 'function' ? t('friends.empty') : 'Список пуст') + '</p>';
    }
    friendsHtml += '</div>';

    let clubsHtml = '<div class="mobile-profile-section">' +
        '<div class="mobile-section-title"><i class="ti ti-building-community"></i> <span>' + (typeof t === 'function' ? t('friends.clubs') : 'Клубы') + ' (' + clubs.length + ')</span></div>';
    if (clubs.length > 0) {
        clubsHtml += '<div class="mobile-friends-grid">' + clubs.map(function(c) {
            const name = c.name || '';
            const img = (typeof buildImgUrl === 'function') ? buildImgUrl(c.logo || c.image) : (c.logo || c.image || '');
            const onclickAttr = (typeof openClubModal === 'function') ? 'onclick="openClubModal(' + c.id + ');"' : 'onclick="window.open(\'https://shikimori.io/clubs/' + c.id + '\', \'_blank\');"';
            return '<div class="mobile-friend-card" ' + onclickAttr + '>' +
                '<img src="' + img + '" alt="' + name + '" class="mobile-friend-avatar club" loading="lazy">' +
                '<span class="mobile-friend-name">' + name + '</span>' +
            '</div>';
        }).join('') + '</div>';
    } else {
        clubsHtml += '<p style="color: var(--text-muted); font-size: 13px; margin: 0;">' + (typeof t === 'function' ? t('friends.empty') : 'Список пуст') + '</p>';
    }
    clubsHtml += '</div>';

    body.innerHTML = friendsHtml + clubsHtml;
}

window.renderMobileFriendsAndClubs = renderMobileFriendsAndClubs;

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

window.handleMobileAboutClick = function() {
    window._openedFromSettings = true;
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) settingsModal.classList.add('hidden');
    if (typeof openAboutModal === 'function') {
        openAboutModal();
    } else {
        const aboutModal = document.getElementById('about-modal');
        if (aboutModal) aboutModal.classList.remove('hidden');
    }
};

/* Инициализация каталога для мобильного вида */
function initMobileCatalog() {
    const container = document.getElementById('catalog-section-container');
    if (!container) return;

    if (typeof loadGenres === 'function') {
        const genreSelect = document.getElementById('cat-filter-genre');
        if (genreSelect && genreSelect.options.length <= 1) {
            loadGenres().then(genres => {
                if (genres && genres.length) {
                    const currentVal = genreSelect.value;
                    const allText = (typeof i18n === 'function') ? i18n('catalog.filter.all_genres') : 'Все жанры';
                    genreSelect.innerHTML = `<option value="">${allText}</option>` +
                        genres.map(g => `<option value="${g.id}">${g.russian || g.name}</option>`).join('');
                    genreSelect.value = currentVal;
                }
            }).catch(e => console.error('Ошибка загрузки жанров:', e));
        }
    }

    if (typeof loadCatalog === 'function') {
        const grid = document.getElementById('catalog-grid-container');
        if (grid && (!grid.children.length || grid.querySelector('.loader'))) {
            loadCatalog(1, false);
        }
    }
}

window.initMobileCatalog = initMobileCatalog;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initMobileCatalog, 150));
} else {
    setTimeout(initMobileCatalog, 150);
}

/* Мобильный поиск */
let mobileSearchAbortController = null;
let mobileSearchDebounceTimer = null;

window.openMobileSearch = function() {
    const main = document.getElementById('mobile-header-main');
    const search = document.getElementById('mobile-header-search');
    const input = document.getElementById('mobile-search-input');
    if (main) main.classList.add('hidden');
    if (search) search.classList.remove('hidden');
    if (input) {
        input.focus();
        if (input.value.trim().length >= 2) {
            window.handleMobileSearch(input.value);
        }
    }
};

window.closeMobileSearch = function() {
    const main = document.getElementById('mobile-header-main');
    const search = document.getElementById('mobile-header-search');
    const overlay = document.getElementById('mobile-search-overlay');
    if (search) search.classList.add('hidden');
    if (main) main.classList.remove('hidden');
    if (overlay) overlay.classList.add('hidden');
};

window.closeMobileSearchOverlay = function(e) {
    if (e.target === e.currentTarget) {
        window.closeMobileSearch();
    }
};

window.clearMobileSearch = function() {
    const input = document.getElementById('mobile-search-input');
    const clearBtn = document.getElementById('mobile-search-clear');
    const overlay = document.getElementById('mobile-search-overlay');
    const results = document.getElementById('mobile-search-results');
    if (input) input.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    if (results) results.innerHTML = '';
    if (input) input.focus();
};

window.handleMobileSearch = function(val) {
    const query = (val || '').trim();
    const clearBtn = document.getElementById('mobile-search-clear');
    const overlay = document.getElementById('mobile-search-overlay');
    const resultsContainer = document.getElementById('mobile-search-results');

    if (clearBtn) {
        if (query.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (mobileSearchAbortController) {
        mobileSearchAbortController.abort();
        mobileSearchAbortController = null;
    }

    if (query.length < 1) {
        clearTimeout(mobileSearchDebounceTimer);
        if (overlay) overlay.classList.add('hidden');
        if (resultsContainer) resultsContainer.innerHTML = '';
        return;
    }

    if (overlay) overlay.classList.remove('hidden');
    if (resultsContainer) {
        resultsContainer.innerHTML = `<div class="mobile-search-loading"><i class="ti ti-loader animate-spin"></i> Поиск...</div>`;
    }

    clearTimeout(mobileSearchDebounceTimer);
    mobileSearchDebounceTimer = setTimeout(async () => {
        mobileSearchAbortController = new AbortController();
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                signal: mobileSearchAbortController.signal
            });
            const data = await res.json();
            window.renderMobileSearchResults(data);
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="mobile-search-no-results" style="color: var(--danger);">Ошибка при поиске</div>`;
            }
        }
    }, 180);
};

window.renderMobileSearchResults = function(items) {
    const container = document.getElementById('mobile-search-results');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = '<div class="mobile-search-no-results"><i class="ti ti-search-off" style="font-size: 20px;"></i> Ничего не найдено</div>';
        return;
    }

    const statusMap = {
        'released': 'Вышло',
        'ongoing': 'Онгоинг',
        'anons': 'Анонс'
    };

    container.innerHTML = items.map(item => {
        const title = item.russian || item.name || '';
        const origTitle = (item.russian && item.name && item.name !== item.russian) ? item.name : '';
        const img = item.image || '';
        const statusStr = statusMap[item.status] || item.status || '';
        const isAnime = (item.content_type === 'anime') || (item.type === 'anime') || (item.url && item.url.includes('/animes/'));
        const safeTitle = title.replace(/"/g, '&quot;');
        const clickHandler = isAnime 
            ? `event.stopPropagation(); closeMobileSearch(); openAnimeModal(${item.id});` 
            : `event.stopPropagation(); window.open('${item.url || ''}', '_blank');`;

        return `
            <div class="mobile-search-item" onclick="${clickHandler}">
                ${img ? `<img src="${img}" alt="${safeTitle}" class="mobile-search-thumb" loading="lazy">` : `<div class="mobile-search-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                <div class="mobile-search-info">
                    <div class="mobile-search-title">${title}</div>
                    ${origTitle ? `<div class="mobile-search-orig">${origTitle}</div>` : ''}
                    <div class="mobile-search-tags">
                        ${item.score ? `<span class="mobile-search-score"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                        ${item.kind ? `<span class="mobile-search-tag">${item.kind.toUpperCase()}</span>` : ''}
                        ${item.year ? `<span class="mobile-search-tag">${item.year}</span>` : ''}
                        ${statusStr ? `<span class="mobile-search-tag status">${statusStr}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

/* ==========================================================================
   Быстрая навигация по разделам (Расписание, Контент, Темы дня, Новости)
   Каждый раздел открывается внутри полноэкранного модального окна (как профиль/настройки)
   ========================================================================== */

let modalNewsPage = 1;
let modalCalendarDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

window.openMobileSectionsMenu = function() {
    const modal = document.getElementById('mobile-sections-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    handleSectionsBack(); // Сбрасываем к списку 4 разделов
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

// 1. РАСПИСАНИЕ ОНГОИНГОВ В МОДАЛКЕ
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

// 2. КОНТЕНТ В МОДАЛКЕ
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

// 3. ТЕМЫ ДНЯ В МОДАЛКЕ
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

// 4. НОВОСТИ В МОДАЛКЕ
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
        // 1. Полноэкранный мобильный видеоплеер (Шаги 4 -> 3/2 -> 1 -> закрыть)
        const playerModal = document.getElementById('mobile-watch-player-modal');
        if (playerModal && !playerModal.classList.contains('hidden')) {
            if (typeof handleMobilePlayerBack === 'function') {
                handleMobilePlayerBack();
                return true;
            }
        }

        // 2. Модалка разделов: если открыт детальный вид раздела -> возврат в меню 4 разделов; иначе закрыть
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

        // 3. Модалка друзей -> возврат в профиль
        const friendsModal = document.getElementById('mobile-friends-modal');
        if (friendsModal && !friendsModal.classList.contains('hidden')) {
            handleFriendsBack();
            return true;
        }

        // 4. Модалка статистики -> возврат в профиль
        const statsModal = document.getElementById('mobile-stats-modal');
        if (statsModal && !statsModal.classList.contains('hidden')) {
            handleStatsBack();
            return true;
        }

        // 5. Модалка "О сайте" -> возврат в настройки, если была открыта из настроек
        const aboutModal = document.getElementById('about-modal');
        if (aboutModal && !aboutModal.classList.contains('hidden')) {
            handleAboutBack();
            return true;
        }

        // 6. Модалка аниме -> возврат по стеку истории или в разделы
        const animeModal = document.getElementById('anime-modal');
        if (animeModal && !animeModal.classList.contains('hidden')) {
            if (typeof popModalState === 'function' && window.modalStack && window.modalStack.length > 0) {
                popModalState();
                return true;
            }
            closeAnimeModal({ target: animeModal });
            return true;
        }

        // 7. Модалка профиля -> закрыть
        const profileModal = document.getElementById('mobile-profile-modal');
        if (profileModal && !profileModal.classList.contains('hidden')) {
            closeMobileProfileMenu();
            return true;
        }

        // 8. Модалка настроек -> закрыть
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            if (typeof closeSettingsModal === 'function') closeSettingsModal();
            else settingsModal.classList.add('hidden');
            return true;
        }

        // 9. Мобильный поиск -> закрыть
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

// Перехват клавиши Escape для умного возврата
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        window.AppNav.back();
    }
});

// Перехват системного свайпа/кнопки "Назад" браузера (popstate)
window.addEventListener('popstate', function(e) {
    const handled = window.AppNav.back();
    if (handled) {
        try {
            history.pushState({ appNav: true }, '');
        } catch(err) {}
    }
});




;
