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
            ${item.image ? `<div class="news-thumb"><img src="${item.image}" alt="${item.title}" loading="lazy"></div>` : `<div class="news-thumb placeholder"><i class="ti ti-news"></i></div>`}
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
        if (entries[0].isIntersecting && !isLoadingNews && hasMoreNews) {
            loadNextNewsPage();
        }
    }, { rootMargin: '300px' });

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
        html += `<div class="card" data-section="explore-news" style="margin-bottom: 20px;">
            <div class="card-header"><h3><i class="ti ti-news"></i> ${i18n('explore.main_news')}</h3></div>
            <div class="news-feed-list">${latest.map(buildNewsItemCard).join('')}</div>
        </div>`;
    }

    if (other.length) {
        html += `<div class="card" data-section="explore-news">
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