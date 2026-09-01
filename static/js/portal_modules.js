/**
 * Shikimori MX - Standalone Portal Modules
 * Interactive modules with Infinite Scroll and Shikimori API integrations.
 */

const DEFAULT_NO_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='150' viewBox='0 0 100 150'%3E%3Crect width='100' height='150' fill='%231a1a24'/%3E%3Ctext x='50%25' y='50%25' fill='%23555' font-family='sans-serif' font-size='12' text-anchor='middle' dominant-baseline='middle'%3ENo Poster%3C/text%3E%3C/svg%3E";

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
                        opt.textContent = g.name || g.russian || g.english;
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
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка аниме...</div>';
    }

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

        if (items.length === 0 && !append) {
            container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-movie-off"></i><p>Ничего не найдено по заданным фильтрам</p></div>';
            hasMoreAnimeCatalog = false;
            return;
        }

        if (items.length < 24) {
            hasMoreAnimeCatalog = false;
        }

        const cardsHtml = items.map(anime => {
            const genresText = anime.genres ? anime.genres.slice(0, 2).join(', ') : '';
            return `
                <div class="portal-media-card" onclick="openAnimeModal(${anime.id})">
                    <div class="portal-media-poster-wrap">
                        <img src="${anime.image || DEFAULT_NO_POSTER}" alt="${(anime.russian || anime.name || '').replace(/"/g, '&quot;')}" class="portal-media-poster" loading="lazy">
                        ${anime.score ? `<span class="portal-score-badge"><i class="ti ti-star-filled"></i> ${anime.score}</span>` : ''}
                        ${anime.kind ? `<span class="portal-kind-badge">${anime.kind}</span>` : ''}
                    </div>
                    <div class="portal-media-info">
                        <div class="portal-media-title" title="${anime.russian || anime.name}">${anime.russian || anime.name}</div>
                        <div class="portal-media-meta">
                            <span>${anime.year || ''}</span>
                            <span class="portal-media-genres">${genresText}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.insertAdjacentHTML('beforeend', cardsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки: ${err.message}</p>`;
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

let currentTop100Type = 'anime';

window.loadTop100Tab = async function(type = 'anime') {
    currentTop100Type = type;
    const container = document.getElementById('top100-list');
    if (!container) return;

    document.querySelectorAll('.top100-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка Топ 100...</div>';

    try {
        const res = await fetch(`/api/top100?type=${type}&limit=100`);
        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-trophy"></i><p>Список пуст</p></div>';
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

                    const episodesOrChapters = isManga 
                        ? (item.chapters ? `${item.chapters} гл.` : (item.volumes ? `${item.volumes} том.` : 'Манга'))
                        : (item.episodes ? `${item.episodes} эп.` : (item.kind === 'MOVIE' ? 'Фильм' : 'Сериал'));

                    return `
                        <div class="top100-row" onclick="${clickHandler}(${item.id})">
                            <div class="top100-rank-col">${medalBadge}</div>
                            <div class="top100-poster-col">
                                <img src="${item.image || DEFAULT_NO_POSTER}" alt="${item.russian || item.name}" class="top100-poster" loading="lazy">
                            </div>
                            <div class="top100-info-col">
                                <div class="top100-title">${item.russian || item.name}</div>
                                <div class="top100-meta-tags">
                                    <span class="top100-kind-badge">${item.kind || ''}</span>
                                    <span>${episodesOrChapters}</span>
                                    <span>${item.year || ''}</span>
                                    ${(item.genres && item.genres.length) ? `<span class="top100-genres">${item.genres.slice(0, 2).join(', ')}</span>` : ''}
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
        container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки топа: ${err.message}</p>`;
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

    if (!append) {
        mangaCatalogPage = 1;
        hasMoreMangaCatalog = true;
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка манги...</div>';
    }

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
            if (!append) container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-book-off"></i><p>Манга не найдена</p></div>';
            hasMoreMangaCatalog = false;
            return;
        }

        if (items.length < 24) {
            hasMoreMangaCatalog = false;
        }

        const cardsHtml = items.map(manga => `
            <div class="portal-media-card" onclick="openMangaModal(${manga.id})">
                <div class="portal-media-poster-wrap">
                    <img src="${manga.image || DEFAULT_NO_POSTER}" alt="${(manga.russian || manga.name || '').replace(/"/g, '&quot;')}" class="portal-media-poster" loading="lazy">
                    ${manga.score ? `<span class="portal-score-badge"><i class="ti ti-star-filled"></i> ${manga.score}</span>` : ''}
                    ${manga.kind ? `<span class="portal-kind-badge">${manga.kind}</span>` : ''}
                </div>
                <div class="portal-media-info">
                    <div class="portal-media-title" title="${manga.russian || manga.name}">${manga.russian || manga.name}</div>
                    <div class="portal-media-meta">
                        <span>${manga.chapters ? manga.chapters + ' гл.' : 'Манга'}</span>
                        <span class="portal-media-genres">${(manga.genres || []).slice(0, 2).join(', ')}</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.insertAdjacentHTML('beforeend', cardsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки: ${err.message}</p>`;
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

    if (!append) {
        ranobeCatalogPage = 1;
        hasMoreRanobeCatalog = true;
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка ранобэ...</div>';
    }

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
            if (!append) container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-notebook"></i><p>Ранобэ не найдены</p></div>';
            hasMoreRanobeCatalog = false;
            return;
        }

        if (items.length < 24) {
            hasMoreRanobeCatalog = false;
        }

        const cardsHtml = items.map(ranobe => `
            <div class="portal-media-card" onclick="openMangaModal(${ranobe.id})">
                <div class="portal-media-poster-wrap">
                    <img src="${ranobe.image || DEFAULT_NO_POSTER}" alt="${(ranobe.russian || ranobe.name || '').replace(/"/g, '&quot;')}" class="portal-media-poster" loading="lazy">
                    ${ranobe.score ? `<span class="portal-score-badge"><i class="ti ti-star-filled"></i> ${ranobe.score}</span>` : ''}
                    <span class="portal-kind-badge">РАНОБЭ</span>
                </div>
                <div class="portal-media-info">
                    <div class="portal-media-title" title="${ranobe.russian || ranobe.name}">${ranobe.russian || ranobe.name}</div>
                    <div class="portal-media-meta">
                        <span>${ranobe.volumes ? ranobe.volumes + ' том.' : 'Новелла'}</span>
                        <span class="portal-media-genres">${(ranobe.genres || []).slice(0, 2).join(', ')}</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.insertAdjacentHTML('beforeend', cardsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки: ${err.message}</p>`;
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

    if (isForumLoading) return;
    isForumLoading = true;

    if (!append) {
        forumPage = 1;
        hasMoreForum = true;
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка тем форума...</div>';
    }

    try {
        const res = await fetch(`/api/forum/topics?forum=${currentForumCategory}&page=${forumPage}&limit=25`);
        const topics = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(topics) || topics.length === 0) {
            if (!append) container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-messages-off"></i><p>Темы не найдены</p></div>';
            hasMoreForum = false;
            return;
        }

        if (topics.length < 25) {
            hasMoreForum = false;
        }

        let tableEl = container.querySelector('.forum-topics-table');
        if (!tableEl) {
            tableEl = document.createElement('div');
            tableEl.className = 'forum-topics-table';
            container.appendChild(tableEl);
        }

        const rowsHtml = topics.map(t => `
            <a href="${t.url}" target="_blank" class="forum-topic-row">
                <div class="forum-topic-user">
                    ${t.author_avatar ? `<img src="${t.author_avatar}" alt="${t.author}" class="forum-user-avatar">` : `<div class="forum-user-avatar placeholder"><i class="ti ti-user"></i></div>`}
                </div>
                <div class="forum-topic-main">
                    <div class="forum-topic-title">${t.title}</div>
                    <div class="forum-topic-sub">
                        <span class="forum-badge">${t.forum_name}</span>
                        <span>от <strong>${t.author}</strong></span>
                        <span>${formatTimeAgo ? formatTimeAgo(t.created_at) : (t.created_at || '').slice(0, 10)}</span>
                    </div>
                </div>
                <div class="forum-topic-comments">
                    <i class="ti ti-message-circle"></i> ${t.comments_count}
                </div>
            </a>
        `).join('');

        tableEl.insertAdjacentHTML('beforeend', rowsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки форума: ${err.message}</p>`;
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

    if (!append) {
        clubsPage = 1;
        hasMoreClubs = true;
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка клубов...</div>';
    }

    const search = document.getElementById('clubs-search-input')?.value || '';

    try {
        const res = await fetch(`/api/clubs/popular?page=${clubsPage}&limit=24&search=${encodeURIComponent(search)}`);
        const clubs = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(clubs) || clubs.length === 0) {
            if (!append) container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-circles-relation"></i><p>Клубы не найдены</p></div>';
            hasMoreClubs = false;
            return;
        }

        if (clubs.length < 24) {
            hasMoreClubs = false;
        }

        let gridEl = container.querySelector('.portal-clubs-grid');
        if (!gridEl) {
            gridEl = document.createElement('div');
            gridEl.className = 'portal-clubs-grid';
            container.appendChild(gridEl);
        }

        const cardsHtml = clubs.map(c => `
            <a href="${c.url}" target="_blank" class="portal-club-card">
                <div class="portal-club-logo-wrap">
                    ${c.logo ? `<img src="${c.logo}" alt="${c.name}" class="portal-club-logo" loading="lazy">` : `<div class="portal-club-logo placeholder"><i class="ti ti-users"></i></div>`}
                </div>
                <div class="portal-club-body">
                    <div class="portal-club-name" title="${c.name}">${c.name}</div>
                    <div class="portal-club-meta">
                        <span><i class="ti ti-users"></i> ${c.members_label || 'Открытый клуб'}</span>
                    </div>
                </div>
            </a>
        `).join('');

        gridEl.insertAdjacentHTML('beforeend', cardsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки клубов: ${err.message}</p>`;
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

    if (!append) {
        collectionsPage = 1;
        hasMoreCollections = true;
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка коллекций...</div>';
    }

    try {
        const res = await fetch(`/api/collections/catalog?page=${collectionsPage}&limit=24`);
        const collections = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(collections) || collections.length === 0) {
            if (!append) container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-layout-grid"></i><p>Коллекции не найдены</p></div>';
            hasMoreCollections = false;
            return;
        }

        if (collections.length < 24) {
            hasMoreCollections = false;
        }

        let gridEl = container.querySelector('.portal-collections-grid');
        if (!gridEl) {
            gridEl = document.createElement('div');
            gridEl.className = 'portal-collections-grid';
            container.appendChild(gridEl);
        }

        const cardsHtml = collections.map(c => `
            <a href="${c.url}" target="_blank" class="portal-collection-card">
                <div class="portal-collection-thumb-wrap">
                    ${c.image ? `<img src="${c.image}" alt="${c.title}" class="portal-collection-thumb" loading="lazy">` : `<div class="portal-collection-thumb placeholder"><i class="ti ti-layout-grid"></i></div>`}
                </div>
                <div class="portal-collection-body">
                    <div class="portal-collection-title">${c.title}</div>
                    <div class="portal-collection-meta">
                        <span>👤 ${c.author || 'Автор'}</span>
                        <span><i class="ti ti-message-circle"></i> ${c.comments_count}</span>
                    </div>
                </div>
            </a>
        `).join('');

        gridEl.insertAdjacentHTML('beforeend', cardsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки коллекций: ${err.message}</p>`;
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

    if (!append) {
        critiquesPage = 1;
        hasMoreCritiques = true;
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка рецензий...</div>';
    }

    try {
        const res = await fetch(`/api/critiques/catalog?page=${critiquesPage}&limit=24`);
        const critiques = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(critiques) || critiques.length === 0) {
            if (!append) container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-pencil"></i><p>Рецензии не найдены</p></div>';
            hasMoreCritiques = false;
            return;
        }

        if (critiques.length < 24) {
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
                        <span class="critique-badge"><i class="ti ti-pencil"></i> Рецензия</span>
                        <span class="critique-author">👤 ${c.author}</span>
                        <span class="critique-date">${formatTimeAgo ? formatTimeAgo(c.date) : c.date}</span>
                    </div>
                    <a href="${c.url}" target="_blank" class="critique-title">${c.title}</a>
                </div>
                ${c.snippet ? `<div class="critique-snippet">${c.snippet}...</div>` : ''}
                <div class="critique-footer">
                    <a href="${c.url}" target="_blank" class="critique-read-more">Читать полностью <i class="ti ti-arrow-right"></i></a>
                    <span class="critique-comments"><i class="ti ti-message-circle"></i> ${c.comments_count}</span>
                </div>
            </div>
        `).join('');

        stackEl.insertAdjacentHTML('beforeend', cardsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки рецензий: ${err.message}</p>`;
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

    if (!append) {
        articlesPage = 1;
        hasMoreArticles = true;
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка статей...</div>';
    }

    try {
        const res = await fetch(`/api/articles/catalog?page=${articlesPage}&limit=24`);
        const articles = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(articles) || articles.length === 0) {
            if (!append) container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-file-text"></i><p>Статьи не найдены</p></div>';
            hasMoreArticles = false;
            return;
        }

        if (articles.length < 24) {
            hasMoreArticles = false;
        }

        let gridEl = container.querySelector('.articles-grid');
        if (!gridEl) {
            gridEl = document.createElement('div');
            gridEl.className = 'articles-grid';
            container.appendChild(gridEl);
        }

        const cardsHtml = articles.map(a => `
            <a href="${a.url}" target="_blank" class="article-card">
                ${a.image ? `<img src="${a.image}" alt="${a.title}" class="article-thumb" loading="lazy">` : `<div class="article-thumb placeholder"><i class="ti ti-file-text"></i></div>`}
                <div class="article-body">
                    <div class="article-tag">Статья</div>
                    <div class="article-title">${a.title}</div>
                    ${a.snippet ? `<div class="article-snippet">${a.snippet}...</div>` : ''}
                    <div class="article-footer">
                        <span>👤 ${a.author}</span>
                        <span><i class="ti ti-message-circle"></i> ${a.comments_count}</span>
                    </div>
                </div>
            </a>
        `).join('');

        gridEl.insertAdjacentHTML('beforeend', cardsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки статей: ${err.message}</p>`;
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

    if (!append) {
        usersPage = 1;
        hasMoreUsers = true;
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка пользователей...</div>';
    }

    const search = document.getElementById('users-search-input')?.value || '';

    try {
        const res = await fetch(`/api/users/search?page=${usersPage}&limit=36&search=${encodeURIComponent(search)}`);
        const users = await res.json();

        if (!append) container.innerHTML = '';

        if (!Array.isArray(users) || users.length === 0) {
            if (!append) container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-user-off"></i><p>Пользователи не найдены</p></div>';
            hasMoreUsers = false;
            return;
        }

        if (users.length < 36) {
            hasMoreUsers = false;
        }

        let gridEl = container.querySelector('.users-cards-grid');
        if (!gridEl) {
            gridEl = document.createElement('div');
            gridEl.className = 'users-cards-grid';
            container.appendChild(gridEl);
        }

        const cardsHtml = users.map(u => `
            <a href="${u.url}" target="_blank" class="user-portal-card">
                ${u.avatar ? `<img src="${u.avatar}" alt="${u.nickname}" class="user-portal-avatar" loading="lazy">` : `<div class="user-portal-avatar placeholder"><i class="ti ti-user"></i></div>`}
                <div class="user-portal-info">
                    <div class="user-portal-nick" title="${u.nickname}">${u.nickname}</div>
                    <div class="user-portal-status">
                        ${u.last_online_at ? `<span class="online-indicator"></span> ${formatTimeAgo ? formatTimeAgo(u.last_online_at) : 'онлайн'}` : 'Участник'}
                    </div>
                </div>
            </a>
        `).join('');

        gridEl.insertAdjacentHTML('beforeend', cardsHtml);
    } catch(err) {
        if (!append) container.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки пользователей: ${err.message}</p>`;
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

    container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Подбор рекомендаций...</div>';

    try {
        const res = await fetch('/api/recommendations');
        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = '<div class="portal-empty-state"><i class="ti ti-thumb-up"></i><p>Не удалось составить рекомендации</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="portal-media-grid">
                ${items.map(anime => `
                    <div class="portal-media-card" onclick="openAnimeModal(${anime.id})">
                        <div class="portal-media-poster-wrap">
                            <img src="${anime.image || DEFAULT_NO_POSTER}" alt="${anime.russian || anime.name}" class="portal-media-poster" loading="lazy">
                            <span class="portal-score-badge"><i class="ti ti-star-filled"></i> ${anime.score || '7.5+'}</span>
                            <span class="portal-kind-badge">${anime.kind || 'TV'}</span>
                        </div>
                        <div class="portal-media-info">
                            <div class="portal-media-title" title="${anime.russian || anime.name}">${anime.russian || anime.name}</div>
                            <div class="portal-media-meta">
                                <span>${anime.year || ''}</span>
                                <span class="badge-rec-match">Рекомендовано</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch(err) {
        container.innerHTML = `<p style="color: var(--danger);">Ошибка: ${err.message}</p>`;
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

    if (!fullCalendarCache) {
        container.innerHTML = '<div class="loader"><i class="ti ti-loader animate-spin"></i> Загрузка расписания онгоингов...</div>';
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

    const days = [
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
                        ${idx === todayIndex ? `<span class="cal-today-tag">Сегодня</span>` : ''}
                    </button>
                `).join('')}
            </div>

            <div class="calendar-cards-grid">
                ${filtered.length > 0 ? filtered.map(item => `
                    <div class="calendar-grid-card" onclick="openAnimeModal(${item.id})">
                        <div class="cal-card-poster-wrap">
                            <img src="${item.image}" alt="${item.russian || item.name}" class="cal-card-poster" loading="lazy">
                            ${item.time_str ? `<span class="cal-time-tag"><i class="ti ti-clock"></i> ${item.time_str}</span>` : ''}
                            ${item.score ? `<span class="cal-score-tag"><i class="ti ti-star-filled"></i> ${item.score}</span>` : ''}
                        </div>
                        <div class="cal-card-body">
                            <div class="cal-card-title" title="${item.russian || item.name}">${item.russian || item.name}</div>
                            <div class="cal-card-meta">
                                <span class="cal-next-badge">${item.next_episode ? item.next_episode + ' эп.' : 'Новая серия'}</span>
                                <span class="cal-kind-tag">${item.kind || 'TV'}</span>
                            </div>
                        </div>
                    </div>
                `).join('') : `<div class="portal-empty-state"><i class="ti ti-calendar-off"></i><p>В этот день нет релизов</p></div>`}
            </div>
        </div>
    `;
}

// ==========================================
// 13. ГЛОБАЛЬНЫЙ INFINITE SCROLL ДЛЯ ВСЕХ МОДУЛЕЙ
// ==========================================

let infiniteScrollThrottleTimer = null;

function handleGlobalInfiniteScroll() {
    if (infiniteScrollThrottleTimer) return;
    infiniteScrollThrottleTimer = setTimeout(() => {
        infiniteScrollThrottleTimer = null;
        
        const scrollPosition = window.innerHeight + window.scrollY;
        const threshold = document.documentElement.scrollHeight - 600;

        if (scrollPosition >= threshold) {
            const activeTab = localStorage.getItem('activeTab') || 'profile';

            if (activeTab === 'catalog-anime') {
                if (!isAnimeCatalogLoading && hasMoreAnimeCatalog) {
                    loadMoreCatalogAnime();
                }
            } else if (activeTab === 'catalog-manga') {
                if (!isMangaCatalogLoading && hasMoreMangaCatalog) {
                    loadMoreCatalogManga();
                }
            } else if (activeTab === 'catalog-ranobe') {
                if (!isRanobeCatalogLoading && hasMoreRanobeCatalog) {
                    loadMoreCatalogRanobe();
                }
            } else if (activeTab === 'forum') {
                if (!isForumLoading && hasMoreForum) {
                    loadMoreForum();
                }
            } else if (activeTab === 'clubs') {
                if (!isClubsLoading && hasMoreClubs) {
                    loadMoreClubs();
                }
            } else if (activeTab === 'collections') {
                if (!isCollectionsLoading && hasMoreCollections) {
                    loadMoreCollections();
                }
            } else if (activeTab === 'critiques') {
                if (!isCritiquesLoading && hasMoreCritiques) {
                    loadMoreCritiques();
                }
            } else if (activeTab === 'articles') {
                if (!isArticlesLoading && hasMoreArticles) {
                    loadMoreArticles();
                }
            } else if (activeTab === 'users') {
                if (!isUsersLoading && hasMoreUsers) {
                    loadMoreUsers();
                }
            }
        }
    }, 150);
}

window.addEventListener('scroll', handleGlobalInfiniteScroll, { passive: true });
