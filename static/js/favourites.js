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
