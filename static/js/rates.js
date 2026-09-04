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