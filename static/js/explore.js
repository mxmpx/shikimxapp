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