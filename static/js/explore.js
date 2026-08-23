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

function handleExploreSearch(val) {
    const query = val.trim();
    const clearBtn = document.getElementById('search-clear-btn');
    const resultsContainer = document.getElementById('explore-search-results');

    if (clearBtn) {
        if (query.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (query.length < 2) {
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

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            renderSearchResults(data);
        } catch (err) {
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="search-no-results" style="color: var(--danger);">${i18n('explore.search_error')}</div>`;
            }
        }
    }, 250);
}

function clearExploreSearch() {
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

    const badgeMap = {
        'collection': 'explore.collection',
        'critique': 'explore.review',
        'article': 'explore.article',
        'news': 'explore.article',
        '': 'explore.topic'
    };

    const buildTopicRow = (item) => {
        const badgeKey = badgeMap[(item.tag || '').toLowerCase()] || 'explore.topic';
        return `
        <a href="${item.url}" target="_blank" class="topic-row-item" title="${(item.title || '').replace(/"/g, '&quot;')}">
            <div class="topic-main">
                <span class="topic-title-text">${item.title}</span>
                <span class="topic-badge badge-${(item.tag || '').toLowerCase()}">${i18n(badgeKey)}</span>
            </div>
            <div class="topic-meta">
                <span class="topic-comments"><i class="ti ti-message-circle"></i> ${item.comments_count}</span>
            </div>
        </a>`;
    };

    let html = `
        <div class="explore-two-col">
            <!-- Content Manager -->
            <div class="card" data-section="explore-content">
                <div class="card-header">
                    <h3><i class="ti ti-grid-dots"></i> ${i18n('explore.content')}</h3>
                    <div class="content-sub-links">
                        <a href="https://shikimori.io/collections" target="_blank">${i18n('explore.collections')}</a> /
                        <a href="https://shikimori.io/forum/critiques" target="_blank">${i18n('explore.reviews')}</a> /
                        <a href="https://shikimori.io/articles" target="_blank">${i18n('explore.articles')}</a>
                    </div>
                </div>
                <div class="topics-list">
                    ${contentList.length ? contentList.map(buildTopicRow).join('') : `<p style="color:var(--text-muted)">${i18n('explore.no_content')}</p>`}
                </div>
            </div>

            <!-- Hot Topics -->
            <div class="card" data-section="explore-hot">
                <div class="card-header">
                    <h3><i class="ti ti-flame"></i> ${i18n('explore.hot_topics')}</h3>
                </div>
                <div class="topics-list">
                    ${hotList.length ? hotList.map(buildTopicRow).join('') : `<p style="color:var(--text-muted)">${i18n('explore.no_hot')}</p>`}
                </div>
            </div>
        </div>
    `;

    if (latest.length) {
        html += `<div class="card explore-news-card" data-section="explore-news" style="margin-top: 24px;">
            <div class="card-header"><h3><i class="ti ti-news"></i> ${i18n('explore.main_news')}</h3></div>
            <div class="news-feed-list">${latest.map(buildNewsItemCard).join('')}</div>
        </div>`;
    }

    if (other.length) {
        html += `<div class="card explore-news-card" data-section="explore-news" style="margin-top: 24px;">
            <div class="card-header"><h3><i class="ti ti-layout-grid"></i> ${i18n('explore.more_news')}</h3></div>
            <div id="other-news-list" class="news-feed-list">${other.map(buildNewsItemCard).join('')}</div>
            <div id="news-infinite-sentinel" style="height: 20px; margin-top: 10px;"></div>
            <div id="news-infinite-loader" class="news-infinite-loader hidden">
                <i class="ti ti-loader animate-spin"></i> ${i18n('explore.loading_more')}
            </div>
        </div>`;
    }


    container.innerHTML = html;
    setupNewsInfiniteScroll();
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
                    const total = item.total_episodes || 0;
                    const percent = total > 0 ? Math.min(100, Math.round((item.episode / total) * 100)) : 0;
                    const epText = `${i18n('player.ep_short')} ${item.episode}${total ? ` / ${total}` : ''}`;
                    const imgUrl = item.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(item.image) : item.image) : '';
                    const title = item.russian || item.title || 'Anime';

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
                    const title = item.russian || item.name;
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

    container.innerHTML = items.map(item => {
        const title = item.russian || item.name;
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
    renderContinueWatching();
    loadAiringCalendar();
    
    // Populate genres in catalog filter if catalog exists
    const genreSelect = document.getElementById('cat-filter-genre');
    if (genreSelect) {
        const genres = await loadGenres();
        genreSelect.innerHTML = `<option value="">${i18n('catalog.filter.all_genres')}</option>` +
            genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    }
    loadCatalog(1, false);
}
window.initExploreExtraSections = initExploreExtraSections;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initExploreExtraSections, 100);
});