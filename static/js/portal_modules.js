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
