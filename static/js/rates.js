let currentTargetType = localStorage.getItem('currentTargetType') || 'Anime';
let currentStatusFilter = localStorage.getItem('currentStatusFilter') || 'all';
let currentSortFilter = localStorage.getItem('currentSortFilter') || 'updated_at';
let currentViewMode = localStorage.getItem('ratesViewMode') || 'cards';

function getStatusMap() {
    return {
        'watching': { anime: i18n('rates.watching'), manga: i18n('rates.watching'), class: 'badge-watching' },
        'completed': { anime: i18n('rates.completed'), manga: i18n('rates.completed'), class: 'badge-completed' },
        'planned': { anime: i18n('rates.planned'), manga: i18n('rates.planned'), class: 'badge-planned' },
        'on_hold': { anime: i18n('rates.on_hold'), manga: i18n('rates.on_hold'), class: 'badge-on_hold' },
        'dropped': { anime: i18n('rates.dropped'), manga: i18n('rates.dropped'), class: 'badge-dropped' },
        'rewatching': { anime: i18n('rates.rewatching'), manga: i18n('rates.rewatching'), class: 'badge-watching' }
    };
}

async function openTabWithFilter(type, status) {
    currentTargetType = type;
    currentStatusFilter = status;
    localStorage.setItem('currentTargetType', type);
    localStorage.setItem('currentStatusFilter', status);

    await openTab('rates');

    document.querySelectorAll('.type-btn').forEach(b => {
        b.classList.remove('active');
        if ((type === 'Anime' && b.textContent.includes(i18n('rates.anime'))) || (type === 'Manga' && b.textContent.includes(i18n('rates.manga')))) {
            b.classList.add('active');
        }
    });

    updateFilterLabels();
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${status}'`)) b.classList.add('active');
    });

    applyListFilters();
}

function switchListType(type) {
    currentTargetType = type;
    localStorage.setItem('currentTargetType', type);
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
    updateFilterLabels();
    applyListFilters();
}

function filterListStatus(status, btn) {
    currentStatusFilter = status;
    localStorage.setItem('currentStatusFilter', status);
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyListFilters();
}

function changeListSort(sortVal) {
    currentSortFilter = sortVal;
    localStorage.setItem('currentSortFilter', sortVal);
    applyListFilters();
}

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('ratesViewMode', mode);
    document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.view-mode-btn[data-view="${mode}"]`);
    if (btn) btn.classList.add('active');
    const grid = document.getElementById('rates-grid-container');
    if (grid) {
        grid.className = `rates-grid rates-view-${mode}`;
    }
    applyListFilters();
}

function updateFilterLabels() {
    const isAnime = currentTargetType === 'Anime';
    const lblWatching = document.getElementById('lbl-watching');
    const lblCompleted = document.getElementById('lbl-completed');
    if (lblWatching) lblWatching.textContent = isAnime ? i18n('rates.watching') : i18n('rates.watching');
    if (lblCompleted) lblCompleted.textContent = isAnime ? i18n('rates.completed') : i18n('rates.completed');
}

function renderRatesView() {
    const container = document.getElementById('rates');
    if (!Array.isArray(ratesDataCache) || ratesDataCache.length === 0) {
        container.innerHTML = '<div class="card"><p style="color: var(--text-muted);">' + i18n('rates.empty') + '</p></div>';
        return;
    }

    const isAnime = currentTargetType === 'Anime';
    container.innerHTML = `
        <div class="list-controls">
            <div class="type-switch">
                <button class="type-btn ${isAnime ? 'active' : ''}" onclick="switchListType('Anime')"><i class="ti ti-movie"></i> ${i18n('rates.anime')}</button>
                <button class="type-btn ${!isAnime ? 'active' : ''}" onclick="switchListType('Manga')"><i class="ti ti-book"></i> ${i18n('rates.manga')}</button>
            </div>
            <div class="filter-sort-bar">
                <div class="rates-filters">
                    <button class="filter-btn ${currentStatusFilter === 'all' ? 'active' : ''}" onclick="filterListStatus('all', this)">${i18n('rates.all')} (<span id="cnt-all">0</span>)</button>
                    <button id="lbl-watching" class="filter-btn ${currentStatusFilter === 'watching' ? 'active' : ''}" onclick="filterListStatus('watching', this)">${i18n('rates.watching')}</button>
                    <button id="lbl-completed" class="filter-btn ${currentStatusFilter === 'completed' ? 'active' : ''}" onclick="filterListStatus('completed', this)">${i18n('rates.completed')}</button>
                    <button class="filter-btn ${currentStatusFilter === 'planned' ? 'active' : ''}" onclick="filterListStatus('planned', this)">${i18n('rates.planned')}</button>
                    <button class="filter-btn ${currentStatusFilter === 'on_hold' ? 'active' : ''}" onclick="filterListStatus('on_hold', this)">${i18n('rates.on_hold')}</button>
                    <button class="filter-btn ${currentStatusFilter === 'dropped' ? 'active' : ''}" onclick="filterListStatus('dropped', this)">${i18n('rates.dropped')}</button>
                </div>
                <select id="rates-sort" class="sort-select" onchange="changeListSort(this.value)">
                    <option value="updated_at" ${currentSortFilter === 'updated_at' ? 'selected' : ''}>${i18n('rates.sort.updated')}</option>
                    <option value="score_desc" ${currentSortFilter === 'score_desc' ? 'selected' : ''}>${i18n('rates.sort.score_desc')}</option>
                    <option value="score_asc" ${currentSortFilter === 'score_asc' ? 'selected' : ''}>${i18n('rates.sort.score_asc')}</option>
                    <option value="name" ${currentSortFilter === 'name' ? 'selected' : ''}>${i18n('rates.sort.name')}</option>
                    <option value="episodes" ${currentSortFilter === 'episodes' ? 'selected' : ''}>${i18n('rates.sort.progress')}</option>
                </select>
            </div>
            <div class="view-mode-bar">
                <button class="view-mode-btn ${currentViewMode === 'list' ? 'active' : ''}" data-view="list" onclick="setViewMode('list')" title="${i18n('rates.view.list')}">
                    <i class="ti ti-list"></i>
                </button>
                <button class="view-mode-btn ${currentViewMode === 'cards' ? 'active' : ''}" data-view="cards" onclick="setViewMode('cards')" title="${i18n('rates.view.cards')}">
                    <i class="ti ti-layout-grid"></i>
                </button>
                <button class="view-mode-btn ${currentViewMode === 'large' ? 'active' : ''}" data-view="large" onclick="setViewMode('large')" title="${i18n('rates.view.large')}">
                    <i class="ti ti-photo"></i>
                </button>
            </div>
        </div>
        <div id="rates-grid-container" class="rates-grid rates-view-${currentViewMode}"></div>
    `;

    updateFilterLabels();
    applyListFilters();
}

function sortRatesList(rates, criterion) {
    return [...rates].sort((a, b) => {
        const targetA = a.target_data || a.anime || a.manga || {};
        const targetB = b.target_data || b.anime || b.manga || {};
        switch (criterion) {
            case 'score_desc': return (b.score || 0) - (a.score || 0);
            case 'score_asc': return (a.score || 0) - (b.score || 0);
            case 'name': return (targetA.russian || targetA.name || '').localeCompare(targetB.russian || targetB.name || '', 'ru');
            case 'episodes': return ((b.episodes ?? b.chapters ?? 0) - (a.episodes ?? a.chapters ?? 0));
            default: return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
        }
    });
}

function applyListFilters() {
    const byType = ratesDataCache.filter(r => r.target_type === currentTargetType);
    const cntAll = document.getElementById('cnt-all');
    if (cntAll) cntAll.textContent = byType.length;

    let filtered = currentStatusFilter === 'all' ? byType : byType.filter(r => r.status === currentStatusFilter);
    filtered = sortRatesList(filtered, currentSortFilter);
    renderListGrid(filtered);
}

function renderListGrid(items) {
    const grid = document.getElementById('rates-grid-container');
    if (!grid) return;
    if (!items.length) {
        grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">' + i18n('rates.no_results') + '</p>';
        return;
    }

    const viewMode = currentViewMode;

    if (viewMode === 'list') {
        grid.innerHTML = items.map(rate => {
            const targetObj = rate.target_data || rate.anime || rate.manga || {};
            const isAnime = rate.target_type === 'Anime';
            const targetUrl = targetObj.url
                ? (targetObj.url.startsWith('http') ? targetObj.url : 'https://shikimori.io' + targetObj.url)
                : `https://shikimori.io/${isAnime ? 'animes' : 'mangas'}/${rate.target_id}`;
            const targetName = targetObj.russian || targetObj.name || `#${rate.target_id}`;
            const statusInfo = getStatusMap()[rate.status] || { anime: rate.status, manga: rate.status, class: 'badge-planned' };
            let progressText = isAnime ? `${rate.episodes ?? 0} / ${targetObj.episodes || '?'} ${i18n('rates.progress.anime')}` : `${rate.chapters ?? 0} / ${targetObj.chapters || '?'} ${i18n('rates.progress.manga')}`;
            if (rate.rewatches > 0) progressText += ` (${i18n('rates.rewatches')} ${rate.rewatches})`;
            const onclickAttr = isAnime ? `onclick="event.preventDefault(); openAnimeModal(${rate.target_id});"` : `onclick="event.preventDefault(); openMangaModal(${rate.target_id});"`;

            return `
                <div class="rate-list-row">
                    <div class="rate-list-info">
                        <a href="${targetUrl}" ${onclickAttr} class="rate-title" title="${targetName}">${targetName}</a>
                        <span class="badge ${statusInfo.class}">${isAnime ? statusInfo.anime : statusInfo.manga}</span>
                    </div>
                    <div class="rate-list-meta">
                        <span class="label">${i18n('rates.progress')}:</span> <b>${progressText}</b>
                        <span class="label">${i18n('rates.score')}:</span> <span class="score-pill">${rate.score ? `<i class="ti ti-star-filled"></i> ${rate.score}/10` : '—'}</span>
                    </div>
                </div>`;
        }).join('');
    } else {
        grid.innerHTML = items.map(rate => {
            const targetObj = rate.target_data || rate.anime || rate.manga || {};
            const isAnime = rate.target_type === 'Anime';
            const targetUrl = targetObj.url
                ? (targetObj.url.startsWith('http') ? targetObj.url : 'https://shikimori.io' + targetObj.url)
                : `https://shikimori.io/${isAnime ? 'animes' : 'mangas'}/${rate.target_id}`;
            const targetName = targetObj.russian || targetObj.name || `#${rate.target_id}`;
            const imgUrl = targetObj.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(targetObj.image) : targetObj.image) : '';
            const statusInfo = getStatusMap()[rate.status] || { anime: rate.status, manga: rate.status, class: 'badge-planned' };
            let progressText = isAnime ? `${rate.episodes ?? 0} / ${targetObj.episodes || '?'} ${i18n('rates.progress.anime')}` : `${rate.chapters ?? 0} / ${targetObj.chapters || '?'} ${i18n('rates.progress.manga')}`;
            if (rate.rewatches > 0) progressText += ` (${i18n('rates.rewatches')} ${rate.rewatches})`;
            const onclickAttr = isAnime ? `onclick="event.preventDefault(); openAnimeModal(${rate.target_id});"` : `onclick="event.preventDefault(); openMangaModal(${rate.target_id});"`;
            const posterClass = viewMode === 'large' ? 'rate-poster-large' : 'history-thumb';

            return `
                <div class="rate-card">
                    ${imgUrl ? `<a href="${targetUrl}" ${onclickAttr}><img src="${imgUrl}" alt="${targetName}" class="${posterClass}" loading="lazy"></a>` : `<div class="history-thumb-placeholder"></div>`}
                    <div class="rate-content">
                        <div class="rate-header">
                            <a href="${targetUrl}" ${onclickAttr} class="rate-title" title="${targetName}">${targetName}</a>
                            <span class="badge ${statusInfo.class}">${isAnime ? statusInfo.anime : statusInfo.manga}</span>
                        </div>
                        <div class="info-row" style="padding: 2px 0;"><span class="label">${i18n('rates.progress')}:</span><span><b>${progressText}</b></span></div>
                        <div class="info-row" style="padding: 2px 0;"><span class="label">${i18n('rates.score')}:</span><span class="score-pill">${rate.score ? `<i class="ti ti-star-filled"></i> ${rate.score}/10` : '—'}</span></div>
                        ${rate.text ? `<div style="font-size: 12px; color: var(--text-muted); font-style: italic; margin-top: 2px;">"${rate.text}"</div>` : ''}
                    </div>
                </div>`;
        }).join('');
    }
}