// ==================== EVENT LISTENERS & MODAL HANDLERS ====================

document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    if (link.dataset.external === 'true') return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Anime
    const animeMatch = href.match(/shikimori\.(?:io|one|me)?\/animes\/(?:z|a)?(\d+)/) || href.match(/\/animes\/(?:z|a)?(\d+)/);
    if (animeMatch && animeMatch[1]) {
        e.preventDefault();
        openAnimeModal(animeMatch[1]);
        return;
    }

    // Manga
    const mangaMatch = href.match(/shikimori\.(?:io|one|me)?\/mangas\/(?:z|a)?(\d+)/) || href.match(/\/mangas\/(?:z|a)?(\d+)/);
    if (mangaMatch && mangaMatch[1]) {
        e.preventDefault();
        openMangaModal(mangaMatch[1]);
        return;
    }

    // Character
    const charMatch = href.match(/shikimori\.(?:io|one|me)?\/characters\/(?:z|a)?(\d+)/) || href.match(/\/characters\/(?:z|a)?(\d+)/);
    if (charMatch && charMatch[1]) {
        e.preventDefault();
        openCharacterModal(charMatch[1]);
        return;
    }

    // User / Friend (matches /users/{nick} or direct shikimori.io/{nick} from friends page)
    const userMatch = href.match(/shikimori\.(?:io|one|me)?\/users\/([^\/\?]+)/) || href.match(/\/users\/([^\/\?]+)/);
    const directUserMatch = !userMatch && href.match(/shikimori\.(?:io|one|me)\/([A-Za-z0-9_\-]+)\s*$/);
    const resolvedUser = userMatch || directUserMatch;
    if (resolvedUser && resolvedUser[1] && !['sign_in', 'sign_out', 'whoami', 'animes', 'mangas', 'characters', 'clubs', 'forum', 'api', 'oauth', 'about', 'topics', 'collections', 'reviews', 'contests', 'moderations', 'pages', 'terms'].includes(resolvedUser[1])) {
        e.preventDefault();
        openUserModal(resolvedUser[1]);
        return;
    }

    // Club
    const clubMatch = href.match(/shikimori\.(?:io|one|me)?\/clubs\/(\d+)/) || href.match(/\/clubs\/(\d+)/);
    if (clubMatch && clubMatch[1]) {
        e.preventDefault();
        openClubModal(clubMatch[1]);
        return;
    }
});

async function openAnimeModal(animeId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('anime.loading') + '</div>';

    try {
        const res = await fetch(`/api/anime/${animeId}`);
        if (!res.ok) throw new Error(i18n('anime.load_error'));
        const anime = await res.json();
        renderAnimeDetail(anime);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('anime.load_error')}: ${err.message}</div>`;
    }
}

function closeAnimeModal(e) {
    if (e && e.target) {
        const isOverlay = e.target.classList.contains('modal-overlay');
        const isCloseBtn = !!e.target.closest('.modal-close-btn');
        if (!isOverlay && !isCloseBtn) {
            return;
        }
    }
    const modal = document.getElementById('anime-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        const player = document.getElementById('watch-player-container');
        if (player) {
            player.classList.add('hidden');
            player.innerHTML = '';
            player.dataset.playerType = '';
        }
    }
}
window.closeAnimeModal = closeAnimeModal;

function toggleWatchPlayer(shikimoriPath, episode = 1) {
    const container = document.getElementById('watch-player-container');
    if (!container || !shikimoriPath) return;

    if (!container.classList.contains('hidden') && container.dataset.playerType === 'shikimori') {
        container.classList.add('hidden');
        container.innerHTML = '';
        container.dataset.playerType = '';
        return;
    }

    const cleanPath = shikimoriPath.replace(/^https?:\/\/[^\/]+/, '').replace(/\/watch$/, '');
    let watchUrl = `https://shikimori.io${cleanPath}/watch`;
    
    if (episode && episode > 1) {
        watchUrl += `?episode=${episode}`;
    }

    container.classList.remove('hidden');
    container.dataset.playerType = 'shikimori';
    container.innerHTML = `
        <div class="watch-player-crop-wrapper">
            <iframe 
                src="${watchUrl}" 
                allowfullscreen 
                allow="autoplay; fullscreen; picture-in-picture">
            </iframe>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function toggleAnicliPlayer(title, episode = 1, animeId = 0) {
    const container = document.getElementById('watch-player-container');
    if (!container) return;

    if (!container.classList.contains('hidden') && container.dataset.playerType === 'anicli') {
        container.classList.add('hidden');
        container.innerHTML = '';
        container.dataset.playerType = '';
        window.anicliEpisodesData = null;
        window.anicliSourcesFound = [];
        return;
    }

    container.classList.remove('hidden');
    container.dataset.playerType = 'anicli';
    container.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('anime.search_players') + '</div>';

    try {
        const res = await fetch(`/api/anime/${animeId}/anicli?title=${encodeURIComponent(title)}`);
        const data = await res.json();

        if (!res.ok || data.error) throw new Error(data.error || i18n('anime.load_error'));

        window.anicliEpisodesData = data.episodes || {};
        window.anicliSourcesFound = data.sources_found || [];
        initAnicliPlayerUI(container, episode);
    } catch (err) {
        container.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('anime.playback_error')}: ${err.message}</div>`;
    }
}

function initAnicliPlayerUI(container, initialEpisode = 1) {
    const episodes = window.anicliEpisodesData;
    if (!episodes || !Object.keys(episodes).length) {
        container.innerHTML = '<div class="anime-error"><i class="ti ti-alert-circle"></i> ' + i18n('anime.no_players') + '</div>';
        return;
    }

    const availableEpNums = Object.keys(episodes).map(Number).sort((a, b) => a - b);
    let currentEp = availableEpNums.includes(initialEpisode) ? initialEpisode : availableEpNums[0];
    const sourcesFound = window.anicliSourcesFound || [];

    container.innerHTML = `
        <div class="anicli-player-wrapper">
            ${sourcesFound.length ? `
                <div class="anicli-sources-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: var(--text-muted);">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span><i class="ti ti-check-circle" style="color: var(--success);"></i> ${i18n('anime.sources')}</span>
                        ${sourcesFound.map(s => `<span class="badge badge-watching" style="font-size: 10px; padding: 2px 8px;">${s}</span>`).join(' ')}
                    </div>
                </div>
            ` : ''}
            <div class="anicli-controls-bar" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span><i class="ti ti-list-numbers"></i> ${i18n('anime.episode')}:</span>
                    <select id="anicli-ep-select" class="sort-select" onchange="onAnicliEpisodeChange()">
                        ${availableEpNums.map(num => `<option value="${num}" ${num === currentEp ? 'selected' : ''}>${i18n('anime.episode')} ${num}</option>`).join('')}
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                    <span><i class="ti ti-headphone"></i> ${i18n('anime.translation')}</span>
                    <select id="anicli-trans-select" class="sort-select" onchange="onAnicliTranslationChange()"></select>
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                    <span><i class="ti ti-video"></i> ${i18n('anime.player')}</span>
                    <select id="anicli-player-select" class="sort-select" onchange="updateAnicliIframe()"></select>
                </div>
            </div>
            <div class="watch-player-crop-wrapper" style="height: 480px;">
                <iframe 
                    id="anicli-iframe" 
                    src="" 
                    allowfullscreen 
                    referrerpolicy="no-referrer"
                    allow="autoplay; fullscreen; picture-in-picture"
                    style="width: 100%; height: 100%; border: none; border-radius: 8px; background: #000;">
                </iframe>
            </div>
        </div>
    `;

    populateAnicliTranslations(currentEp);
}

function populateAnicliTranslations(epNum, targetTrans = null, targetPlayerIdx = 0) {
    const epData = window.anicliEpisodesData[epNum.toString()];
    const transSelect = document.getElementById('anicli-trans-select');
    if (!epData || !transSelect) return;

    const availableTrans = Object.keys(epData);
    let selectedTrans = (targetTrans && availableTrans.includes(targetTrans)) ? targetTrans : availableTrans[0];

    transSelect.innerHTML = availableTrans.map(tr => 
        `<option value="${tr}" ${tr === selectedTrans ? 'selected' : ''}>${tr}</option>`
    ).join('');

    populateAnicliPlayers(epNum, selectedTrans, targetPlayerIdx);
}

function populateAnicliPlayers(epNum, transName, targetPlayerIdx = 0) {
    const epData = window.anicliEpisodesData[epNum.toString()];
    const playerSelect = document.getElementById('anicli-player-select');
    if (!epData || !epData[transName] || !playerSelect) return;

    const players = epData[transName];
    if (targetPlayerIdx >= players.length) targetPlayerIdx = 0;

    playerSelect.innerHTML = players.map((p, idx) => 
        `<option value="${p.url}" ${idx === targetPlayerIdx ? 'selected' : ''}>${p.player} #${idx + 1} (${p.source || 'Stream'})</option>`
    ).join('');

    updateAnicliIframe();
}

function onAnicliEpisodeChange() {
    const epSelect = document.getElementById('anicli-ep-select');
    const transSelect = document.getElementById('anicli-trans-select');
    const playerSelect = document.getElementById('anicli-player-select');

    if (!epSelect) return;
    const epNum = parseInt(epSelect.value);
    const currentTrans = transSelect ? transSelect.value : null;
    const currentPlayerIdx = playerSelect ? playerSelect.selectedIndex : 0;

    populateAnicliTranslations(epNum, currentTrans, currentPlayerIdx);
}

function onAnicliTranslationChange() {
    const epSelect = document.getElementById('anicli-ep-select');
    const transSelect = document.getElementById('anicli-trans-select');
    const playerSelect = document.getElementById('anicli-player-select');

    if (!epSelect || !transSelect) return;
    const epNum = parseInt(epSelect.value);
    const selectedTrans = transSelect.value;
    const currentPlayerIdx = playerSelect ? playerSelect.selectedIndex : 0;

    populateAnicliPlayers(epNum, selectedTrans, currentPlayerIdx);
}

function updateAnicliIframe() {
    const playerSelect = document.getElementById('anicli-player-select');
    const iframe = document.getElementById('anicli-iframe');
    if (playerSelect && iframe && playerSelect.value) {
        iframe.src = playerSelect.value;
    }
}

function renderAnimeDetail(a) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const title = a.russian || a.name;
    const origTitle = (a.russian && a.name !== a.russian) ? a.name : '';

    let targetEpisode = 1;
    if (a.user_rate) {
        const watched = a.user_rate.episodes || 0;
        const total = a.episodes || 0;
        const isCompleted = a.user_rate.status === 'completed' || (total > 0 && watched >= total);

        if (!isCompleted) {
            targetEpisode = watched + 1;
        }
    }

    const safeTitle = (a.russian || a.name).replace(/'/g, "\\'");

    body.innerHTML = `
        <div class="anime-detail-container">
            <div class="anime-detail-header">
                <div class="anime-poster-wrapper">
                    ${a.image ? `<img src="${a.image}" alt="${title}" class="anime-poster">` : `<div class="anime-poster placeholder"><i class="ti ti-movie"></i></div>`}
                    ${a.score ? `<div class="anime-score-badge"><i class="ti ti-star-filled"></i> ${a.score}</div>` : ''}
                </div>
                <div class="anime-main-info">
                    <h2 class="anime-title">${title}</h2>
                    ${origTitle ? `<div class="anime-orig-title">${origTitle}</div>` : ''}
                    
                    <div class="anime-info-grid">
                        <div class="info-item"><span class="label">${i18n('anime.type')}</span> <span>${a.kind || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('anime.status')}</span> <span>${a.status || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('anime.episodes')}</span> <span>${a.episodes_aired ? `${a.episodes_aired} / ` : ''}${a.episodes || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('anime.duration')}</span> <span>${a.duration ? `${a.duration} мин.` : '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('anime.aired')}</span> <span>${a.aired_on || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('anime.rating')}</span> <span>${a.rating || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('anime.studios')}</span> <span>${a.studios && a.studios.length ? a.studios.join(', ') : '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('anime.genres')}</span> <span>${a.genres && a.genres.length ? a.genres.join(', ') : '—'}</span></div>
                    </div>

                    <div class="anime-actions">
                        ${a.shikimori_url ? `
                            <button id="watch-toggle-btn" class="btn-kodik-play" onclick="toggleWatchPlayer('${a.shikimori_url}', ${targetEpisode})">
                                <i class="ti ti-player-play-filled"></i> ${i18n('anime.player_1')}
                            </button>
                        ` : ''}
                        <button id="anicli-toggle-btn" class="btn-secondary" onclick="toggleAnicliPlayer('${safeTitle}', ${targetEpisode}, ${a.id})">
                            <i class="ti ti-device-tv"></i> ${i18n('anime.player_2')}
                        </button>
                        ${a.shikimori_url ? `<a href="${a.shikimori_url}" target="_blank" data-external="true" class="btn-secondary"><i class="ti ti-external-link"></i> Shikimori</a>` : ''}
                    </div>
                </div>
            </div>

            <div id="watch-player-container" class="kodik-player-wrapper hidden"></div>

            <div class="anime-description-section">
                <h3><i class="ti ti-file-text"></i> ${i18n('anime.description')}</h3>
                <div class="anime-description-content">${a.description}</div>
            </div>
        </div>
    `;
}

// ==================== UTILITY FUNCTIONS ====================

async function getAnimeData(animeId, source = 'shikimori') {
    try {
        const response = await fetch(`/api/anime/${source}/${animeId}`);
        if (!response.ok) throw new Error('Failed to fetch anime data');
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения данных аниме:', error);
        return null;
    }
}

async function searchAnime(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    } catch (error) {
        console.error('Ошибка поиска:', error);
        return { anime: [], other: [] };
    }
}

async function getSerialInfo(animeId, source = 'shikimori') {
    try {
        const response = await fetch(`/api/serial/${source}/${animeId}`);
        if (!response.ok) throw new Error('Failed to fetch serial info');
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения информации серий:', error);
        return null;
    }
}

// ==================== CHARACTER MODAL ====================

async function openCharacterModal(charId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('character.loading') + '</div>';

    try {
        const res = await fetch(`/api/character/${charId}`);
        if (!res.ok) throw new Error(i18n('character.load_error'));
        const char = await res.json();
        renderCharacterDetail(char);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('character.load_error')}: ${err.message}</div>`;
    }
}

function renderCharacterDetail(char) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const poster = char.image || '';
    const animesHTML = (char.animes || []).map(a => `<a href="https://shikimori.io/animes/${a.id}" class="search-tag">${a.name}</a>`).join(' ');
    const mangasHTML = (char.mangas || []).map(m => `<a href="https://shikimori.io/mangas/${m.id}" class="search-tag">${m.name}</a>`).join(' ');

    body.innerHTML = `
        <div class="anime-detail-header">
            <div class="anime-poster-wrapper">
                ${poster ? `<img src="${poster}" alt="${char.russian}" class="anime-poster">` : `<div class="anime-poster placeholder"><i class="ti ti-user"></i></div>`}
            </div>

            <div class="anime-main-info">
                <h2 class="anime-title">${char.russian}</h2>
                <div class="anime-orig-title">${char.name} ${char.japanese ? `(${char.japanese})` : ''}</div>

                <div class="anime-info-grid" style="margin-top:12px;">
                    ${animesHTML ? `<div class="info-item" style="grid-column: span 2;"><span class="label">${i18n('character.anime')}</span><div class="search-item-tags" style="margin-top:4px;">${animesHTML}</div></div>` : ''}
                    ${mangasHTML ? `<div class="info-item" style="grid-column: span 2; margin-top:8px;"><span class="label">${i18n('character.manga')}</span><div class="search-item-tags" style="margin-top:4px;">${mangasHTML}</div></div>` : ''}
                </div>

                <div class="anime-actions" style="margin-top:16px;">
                    ${char.shikimori_url ? `<a href="${char.shikimori_url}" target="_blank" data-external="true" class="btn-secondary" style="display:inline-flex; align-items:center; gap:6px;"><i class="ti ti-external-link"></i> ${i18n('anime.open_shikimori')}</a>` : ''}
                </div>
            </div>
        </div>

        <div class="anime-description-section">
            <h3><i class="ti ti-info-circle"></i> ${i18n('character.info')}</h3>
            <div class="anime-description-content">${char.description}</div>
        </div>
    `;
}

// ==================== CLUB MODAL ====================

async function openClubModal(clubId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('club.loading') + '</div>';

    try {
        const res = await fetch(`/api/club/${clubId}`);
        if (!res.ok) throw new Error(i18n('club.load_error'));
        const club = await res.json();
        renderClubDetail(club);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('club.load_error')}: ${err.message}</div>`;
    }
}

function renderClubDetail(club) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const logo = club.image || '';

    body.innerHTML = `
        <div class="anime-detail-header">
            <div class="anime-poster-wrapper">
                ${logo ? `<img src="${logo}" alt="${club.name}" class="anime-poster">` : `<div class="anime-poster placeholder"><i class="ti ti-users"></i></div>`}
            </div>

            <div class="anime-main-info">
                <h2 class="anime-title">${club.name}</h2>

                <div class="anime-info-grid" style="margin-top:12px;">
                    <div class="info-item"><span class="label">${i18n('club.members')}</span> <b>${club.members_count}</b></div>
                    <div class="info-item"><span class="label">${i18n('club.type')}</span> ${club.is_private ? i18n('friends.private_club') : i18n('friends.public_club')}</div>
                </div>

                <div class="anime-actions" style="margin-top:16px;">
                    ${club.shikimori_url ? `<a href="${club.shikimori_url}" target="_blank" data-external="true" class="btn-secondary" style="display:inline-flex; align-items:center; gap:6px;"><i class="ti ti-external-link"></i> ${i18n('anime.open_shikimori')}</a>` : ''}
                </div>
            </div>
        </div>

        <div class="anime-description-section">
            <h3><i class="ti ti-users"></i> ${i18n('club.description')}</h3>
            <div class="anime-description-content">${club.description}</div>
        </div>
    `;
}