// ==================== EVENT LISTENERS & MODAL HANDLERS ====================

document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    if (link.dataset.external === 'true') return;

    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    if (!href.includes('shikimori') && !href.startsWith('/')) return;

    const animeMatch = href.match(/shikimori\.(?:io|one|me)?\/animes\/(?:z|a)?(\d+)/) || href.match(/\/animes\/(?:z|a)?(\d+)/);
    if (animeMatch && animeMatch[1]) {
        e.preventDefault();
        openAnimeModal(animeMatch[1]);
        return;
    }

    const mangaMatch = href.match(/shikimori\.(?:io|one|me)?\/mangas\/(?:z|a)?(\d+)/) || href.match(/\/mangas\/(?:z|a)?(\d+)/);
    if (mangaMatch && mangaMatch[1]) {
        e.preventDefault();
        openMangaModal(mangaMatch[1]);
        return;
    }

    const charMatch = href.match(/shikimori\.(?:io|one|me)?\/characters\/(?:z|a)?(\d+)/) || href.match(/\/characters\/(?:z|a)?(\d+)/);
    if (charMatch && charMatch[1]) {
        e.preventDefault();
        openCharacterModal(charMatch[1]);
        return;
    }

    const userMatch = href.match(/shikimori\.(?:io|one|me)?\/users\/([^\/\?]+)/) || href.match(/\/users\/([^\/\?]+)/);
    const directUserMatch = !userMatch && href.match(/shikimori\.(?:io|one|me)\/([A-Za-z0-9_\-]+)\s*$/);
    const resolvedUser = userMatch || directUserMatch;
    if (resolvedUser && resolvedUser[1] && !['sign_in', 'sign_out', 'whoami', 'animes', 'mangas', 'characters', 'clubs', 'forum', 'api', 'oauth', 'about', 'topics', 'collections', 'reviews', 'contests', 'moderations', 'pages', 'terms'].includes(resolvedUser[1])) {
        e.preventDefault();
        openUserModal(resolvedUser[1]);
        return;
    }

    const clubMatch = href.match(/shikimori\.(?:io|one|me)?\/clubs\/(\d+)/) || href.match(/\/clubs\/(\d+)/);
    if (clubMatch && clubMatch[1]) {
        e.preventDefault();
        openClubModal(clubMatch[1]);
        return;
    }
});

window.modalStack = [];

function pushModalState() {
    const body = document.getElementById('anime-modal-body');
    if (body && body.innerHTML.trim()) {
        window.modalStack.push(body.innerHTML);
    }
    updateBackButtonVisibility();
}

function popModalState() {
    const body = document.getElementById('anime-modal-body');
    if (body && window.modalStack.length > 0) {
        body.innerHTML = window.modalStack.pop();
        updateBackButtonVisibility();
        return true;
    }
    return false;
}

function updateBackButtonVisibility() {
    const backBtn = document.querySelector('.modal-back-btn');
    if (backBtn) {
        backBtn.classList.toggle('visible', window.modalStack.length > 0);
    }
}

function handleModalBack() {
    const animeModal = document.getElementById('anime-modal');
    if (animeModal && !animeModal.classList.contains('hidden')) {
        if (!popModalState()) {
            closeAnimeModal({target: animeModal});
        }
        return;
    }

    const aboutModal = document.getElementById('about-modal');
    if (aboutModal && !aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden');
        document.body.style.overflow = '';
        return;
    }

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && !settingsModal.classList.contains('hidden')) {
        settingsModal.classList.add('hidden');
        document.body.style.overflow = '';
        return;
    }
}

window.handleModalBack = handleModalBack;

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
    if (!modal) return;

    if (popModalState()) {
        return;
    }

    modal.classList.add('hidden');
    document.body.style.overflow = '';
    const player = document.getElementById('watch-player-container');
    if (player) {
        player.classList.add('hidden');
        player.innerHTML = '';
        player.dataset.playerType = '';
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

// ==================== SCREENSHOT LIGHTBOX ====================
let currentScreenshots = [];

let currentScreenshotIndex = 0;

function openScreenshotLightbox(index) {
    if (!currentScreenshots || !currentScreenshots.length) return;
    currentScreenshotIndex = index;

    let lightbox = document.getElementById('screenshot-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'screenshot-lightbox';
        lightbox.className = 'screenshot-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-backdrop" onclick="closeScreenshotLightbox()"></div>
            <button class="lightbox-close-btn" onclick="closeScreenshotLightbox()" title="${i18n('lightbox.close')}"><i class="ti ti-x"></i></button>
            <button class="lightbox-nav-btn lightbox-prev-btn" onclick="prevScreenshot(event)" title="${i18n('lightbox.prev')}"><i class="ti ti-chevron-left"></i></button>
            <div class="lightbox-content">
                <img id="lightbox-img" src="" alt="Screenshot" />
                <div id="lightbox-counter" class="lightbox-counter"></div>
            </div>
            <button class="lightbox-nav-btn lightbox-next-btn" onclick="nextScreenshot(event)" title="${i18n('lightbox.next')}"><i class="ti ti-chevron-right"></i></button>

        `;
        document.body.appendChild(lightbox);

        document.addEventListener('keydown', (e) => {
            const lb = document.getElementById('screenshot-lightbox');
            if (!lb || !lb.classList.contains('active')) return;
            if (e.key === 'Escape') closeScreenshotLightbox();
            if (e.key === 'ArrowLeft') prevScreenshot();
            if (e.key === 'ArrowRight') nextScreenshot();
        });
    }

    updateLightbox();
    lightbox.classList.add('active');
}

function updateLightbox() {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    if (img && currentScreenshots[currentScreenshotIndex]) {
        img.src = currentScreenshots[currentScreenshotIndex];
    }
    if (counter) {
        counter.textContent = `${currentScreenshotIndex + 1} / ${currentScreenshots.length}`;
    }
}

function closeScreenshotLightbox() {
    const lightbox = document.getElementById('screenshot-lightbox');
    if (lightbox) lightbox.classList.remove('active');
}

function prevScreenshot(e) {
    if (e) e.stopPropagation();
    if (currentScreenshotIndex > 0) {
        currentScreenshotIndex--;
    } else {
        currentScreenshotIndex = currentScreenshots.length - 1;
    }
    updateLightbox();
}

function nextScreenshot(e) {
    if (e) e.stopPropagation();
    if (currentScreenshotIndex < currentScreenshots.length - 1) {
        currentScreenshotIndex++;
    } else {
        currentScreenshotIndex = 0;
    }
    updateLightbox();
}

window.openScreenshotLightbox = openScreenshotLightbox;
window.closeScreenshotLightbox = closeScreenshotLightbox;
window.prevScreenshot = prevScreenshot;
window.nextScreenshot = nextScreenshot;

function saveWatchProgress(animeId, title, russian, poster, episode, translation, totalEpisodes) {

    if (!animeId) return;
    try {
        let list = JSON.parse(localStorage.getItem('shikimx_continue_watching') || '[]');
        list = list.filter(item => item.id != animeId);
        list.unshift({
            id: animeId,
            title: title || '',
            russian: russian || title || '',
            image: poster || '',
            episode: Number(episode) || 1,
            translation: translation || '',
            total_episodes: totalEpisodes || 0,
            updated_at: new Date().toISOString()
        });
        list = list.slice(0, 20);
        localStorage.setItem('shikimx_continue_watching', JSON.stringify(list));
        if (typeof renderContinueWatching === 'function') {
            renderContinueWatching();
        }
    } catch (e) {
        console.warn('Failed to save watch progress:', e);
    }
}
window.saveWatchProgress = saveWatchProgress;

function stepAnicliEpisode(delta) {
    if (typeof window.currentAnicliEp !== 'number') return;
    const availableEpNums = Object.keys(window.anicliEpisodesData || {}).map(Number).sort((a, b) => a - b);
    const currentIdx = availableEpNums.indexOf(window.currentAnicliEp);
    const nextIdx = currentIdx + delta;
    if (nextIdx < 0 || nextIdx >= availableEpNums.length) {
        showToast(delta > 0 ? 'Это последняя серия!' : 'Это первая серия!', 'info', 2000);
        return;
    }

    const nextEp = availableEpNums[nextIdx];
    const epData = window.anicliEpisodesData[nextEp.toString()];
    if (!epData) {
        onAnicliEpisodeChange(nextEp);
        return;
    }

    const currentDub = window.currentAnicliTrans;
    const currentPlayer = window.currentAnicliPlayerName;

    // 1. Проверяем наличие текущей озвучки в новой серии
    if (!currentDub || !epData[currentDub]) {
        // Озвучка не найдена в новой серии -> открываем выбор озвучки (Шаг 2)
        onAnicliEpisodeChange(nextEp);
        if (currentDub) {
            showToast(`Серия ${nextEp} не найдена в озвучке «${currentDub}». Выберите другую озвучку`, 'warning', 4000);
        }
        return;
    }

    // 2. Озвучка есть. Проверяем наличие того же источника (плеера)
    const availablePlayers = epData[currentDub];
    let matchedPlayer = null;

    if (currentPlayer && availablePlayers && availablePlayers.length) {
        // Точное совпадение
        matchedPlayer = availablePlayers.find(p => p.player === currentPlayer);

        // Если было Kodik #1, а в новой серии просто Kodik (или наоборот), сопоставляем по базовому имени
        if (!matchedPlayer) {
            const baseName = currentPlayer.replace(/\s*#\d+$/, '').trim().toLowerCase();
            matchedPlayer = availablePlayers.find(p => p.player.replace(/\s*#\d+$/, '').trim().toLowerCase() === baseName);
        }
    }

    // 3. Если источник найден -> сразу запускаем воспроизведение новой серии
    if (matchedPlayer) {
        window.currentAnicliEp = nextEp;
        document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === nextEp);
        });
        const epLbl = document.getElementById('wizard-ep-lbl');
        if (epLbl) epLbl.innerText = `(Серия ${nextEp})`;
        populateAnicliTranslations(nextEp);
        const transLbl = document.getElementById('wizard-trans-lbl');
        if (transLbl) transLbl.innerText = `(${currentDub})`;
        populateAnicliPlayers(nextEp, currentDub);

        onAnicliPlayerChange(matchedPlayer.url, null, matchedPlayer.player);
        showToast(`Серия ${nextEp} • ${currentDub} • ${matchedPlayer.player}`, 'info', 2000);
    } else {
        // Источник не найден -> открываем выбор источника (Шаг 3)
        window.currentAnicliEp = nextEp;
        document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === nextEp);
        });
        const epLbl = document.getElementById('wizard-ep-lbl');
        if (epLbl) epLbl.innerText = `(Серия ${nextEp})`;
        populateAnicliTranslations(nextEp);
        onAnicliTranslationChange(currentDub);

        showToast(`Источник «${currentPlayer || 'выбранный'}» не найден для ${nextEp} серии. Выберите другой источник`, 'warning', 4000);
    }
}
window.stepAnicliEpisode = stepAnicliEpisode;

function skipPlayerIntro() {
    showToast(i18n('player.skip_intro') + ' ⏩', 'info', 1800);
    const iframe = document.getElementById('anicli-iframe');
    if (iframe && iframe.contentWindow) {
        try {
            iframe.contentWindow.postMessage({ event: 'seek', value: 85 }, '*');
        } catch (e) {}
    }
}
window.skipPlayerIntro = skipPlayerIntro;

async function toggleFloatingMiniPlayer() {
    const iframe = document.getElementById('anicli-iframe') || document.querySelector('#watch-player-container iframe');
    if (!iframe || !iframe.src) {
        showToast(i18n('anime.no_players'), 'warning');
        return;
    }

    const currentSrc = iframe.src;
    const animeTitle = window.currentPlayingTitle || document.querySelector('.anime-title')?.textContent || 'Anime';
    const epNum = window.currentAnicliEp || '';
    const epText = epNum ? ` | Серия ${epNum}` : '';

    // 1. Настоящий системный PiP (Document Picture-in-Picture API) - виден поверх всех окон при свёрнутом браузере
    if ('documentPictureInPicture' in window) {
        try {
            if (window.pipWindowInstance && !window.pipWindowInstance.closed) {
                window.pipWindowInstance.close();
            }

            const pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 640,
                height: 360
            });
            window.pipWindowInstance = pipWindow;

            pipWindow.document.title = `${animeTitle}${epText} - PiP`;
            pipWindow.document.body.style.margin = '0';
            pipWindow.document.body.style.padding = '0';
            pipWindow.document.body.style.background = '#000';
            pipWindow.document.body.style.overflow = 'hidden';
            pipWindow.document.body.style.width = '100vw';
            pipWindow.document.body.style.height = '100vh';

            const pipIframe = document.createElement('iframe');
            pipIframe.src = currentSrc;
            pipIframe.style.width = '100%';
            pipIframe.style.height = '100%';
            pipIframe.style.border = 'none';
            pipIframe.allow = "autoplay; fullscreen; picture-in-picture";
            pipIframe.setAttribute('allowfullscreen', 'true');
            pipIframe.setAttribute('referrerpolicy', 'no-referrer');
            
            pipWindow.document.body.appendChild(pipIframe);

            showToast('Настоящий PiP открыт поверх всех окон! 📺', 'success');
            return;
        } catch (e) {
            console.warn('Document Picture-in-Picture failed:', e);
        }
    }

    // 2. Резервный HTML5 Video PiP (если доступен)
    try {
        if (document.pictureInPictureEnabled) {
            const video = iframe.contentDocument?.querySelector('video');
            if (video) {
                await video.requestPictureInPicture();
                showToast('PiP активирован!', 'info');
                return;
            }
        }
    } catch (e) {}

    // 3. Fallback: внутристраничный плавающий мини-плеер
    let miniPlayer = document.getElementById('floating-mini-player');
    if (!miniPlayer) {
        miniPlayer = document.createElement('div');
        miniPlayer.id = 'floating-mini-player';
        miniPlayer.className = 'floating-mini-player';
        document.body.appendChild(miniPlayer);
    }

    miniPlayer.innerHTML = `
        <div class="mini-player-header">
            <span class="mini-player-title" title="${animeTitle}">${animeTitle}${epText}</span>
            <div class="mini-player-controls">
                <button onclick="restoreFloatingMiniPlayer()" title="${i18n('player.restore')}"><i class="ti ti-arrows-maximize"></i></button>
                <button onclick="closeFloatingMiniPlayer()" title="${i18n('player.close')}"><i class="ti ti-x"></i></button>
            </div>
        </div>
        <div class="mini-player-body">
            <iframe src="${currentSrc}" allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe>
        </div>
    `;

    miniPlayer.classList.remove('hidden');
    closeAnimeModal();
    showToast(i18n('player.mini_player'), 'info');
}
window.toggleFloatingMiniPlayer = toggleFloatingMiniPlayer;

function closeFloatingMiniPlayer() {
    const miniPlayer = document.getElementById('floating-mini-player');
    if (miniPlayer) {
        miniPlayer.classList.add('hidden');
        miniPlayer.innerHTML = '';
    }
}
window.closeFloatingMiniPlayer = closeFloatingMiniPlayer;

function restoreFloatingMiniPlayer() {
    closeFloatingMiniPlayer();
    if (window.currentPlayingAnimeId) {
        openAnimeModal(window.currentPlayingAnimeId);
    }
}
window.restoreFloatingMiniPlayer = restoreFloatingMiniPlayer;


function initAnicliPlayerUI(container, initialEpisode = 1) {
    const episodes = window.anicliEpisodesData;
    if (!episodes || !Object.keys(episodes).length) {
        container.innerHTML = '<div class="anime-error"><i class="ti ti-alert-circle"></i> ' + i18n('anime.no_players') + '</div>';
        return;
    }

    const availableEpNums = Object.keys(episodes).map(Number).sort((a, b) => a - b);
    window.currentAnicliEp = availableEpNums.includes(initialEpisode) ? initialEpisode : availableEpNums[0];
    window.currentAnicliTrans = null;
    const sourcesFound = window.anicliSourcesFound || [];

    container.innerHTML = `
        <div class="anicli-player-wrapper">
            ${sourcesFound.length ? `
                <div class="anicli-sources-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: var(--text-muted);">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span><i class="ti ti-circle-check" style="color: var(--success);"></i> ${i18n('anime.sources')}</span>
                        ${sourcesFound.map(s => `<span class="badge badge-watching" style="font-size: 10px; padding: 2px 8px;">${s}</span>`).join(' ')}
                    </div>
                </div>
            ` : ''}
            
            <div id="anicli-wizard" class="anicli-wizard-container">
                <!-- STEP 1: EPISODE -->
                <div class="anicli-step-container" id="anicli-step-1">
                    <div class="anicli-step-title"><i class="ti ti-list-numbers"></i> Шаг 1: Выберите серию</div>
                    <div class="anicli-chip-list" id="anicli-ep-chips">
                        ${availableEpNums.map(num => `<div class="anicli-chip" data-ep="${num}" onclick="onAnicliEpisodeChange(${num})">${num} серия</div>`).join('')}
                    </div>
                </div>

                <!-- STEP 2: TRANSLATION -->
                <div class="anicli-step-container hidden" id="anicli-step-2">
                    <div class="anicli-step-title" style="justify-content: space-between;">
                        <span><i class="ti ti-headphones"></i> Шаг 2: Выберите озвучку <span id="wizard-ep-lbl" style="opacity: 0.6; font-size: 12px; margin-left: 8px;"></span></span>
                        <button class="btn-secondary" style="padding: 2px 8px; font-size: 12px;" onclick="goToAnicliStep(1)"><i class="ti ti-arrow-left"></i> Назад</button>
                    </div>
                    <div class="anicli-chip-list" id="anicli-trans-chips"></div>
                </div>

                <!-- STEP 3: PLAYER -->
                <div class="anicli-step-container hidden" id="anicli-step-3">
                    <div class="anicli-step-title" style="justify-content: space-between;">
                        <span><i class="ti ti-video"></i> Шаг 3: Выберите источник <span id="wizard-trans-lbl" style="opacity: 0.6; font-size: 12px; margin-left: 8px;"></span></span>
                        <button class="btn-secondary" style="padding: 2px 8px; font-size: 12px;" onclick="goToAnicliStep(2)"><i class="ti ti-arrow-left"></i> Назад</button>
                    </div>
                    <div class="anicli-chip-list" id="anicli-player-chips"></div>
                </div>
            </div>

            <!-- VIDEO VIEW (Hidden initially) -->
            <div id="anicli-video-view" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="color: var(--text-main); font-size: 13px; font-weight: 600;" id="video-active-info"></div>
                    <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="goToAnicliStep(1)"><i class="ti ti-settings"></i> Изменить</button>
                </div>

                <div class="watch-player-crop-wrapper" style="height: 480px; margin-bottom: 12px;">
                    <iframe 
                        id="anicli-iframe" 
                        src="" 
                        allowfullscreen 
                        referrerpolicy="no-referrer"
                        allow="autoplay; fullscreen; picture-in-picture"
                        style="width: 100%; height: 100%; border: none; border-radius: 8px; background: #000;">
                    </iframe>
                </div>

                <div class="player-quick-actions-bar">
                    <button type="button" class="btn-player-action" onclick="stepAnicliEpisode(-1)">
                        <i class="ti ti-player-skip-back"></i> <span data-i18n="player.prev_ep">${i18n('player.prev_ep')}</span>
                    </button>
                    <button type="button" class="btn-player-action btn-skip-intro" onclick="skipPlayerIntro()">
                        <i class="ti ti-player-track-next"></i> <span>${i18n('player.skip_intro')}</span>
                    </button>
                    <button type="button" class="btn-player-action" onclick="stepAnicliEpisode(1)">
                        <i class="ti ti-player-skip-forward"></i> <span data-i18n="player.next_ep">${i18n('player.next_ep')}</span>
                    </button>
                    <button type="button" class="btn-player-action" onclick="toggleFloatingMiniPlayer()">
                        <i class="ti ti-picture-in-picture-top"></i> <span data-i18n="player.mini_player">${i18n('player.mini_player')}</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Initialize state
    goToAnicliStep(1);
}

function goToAnicliStep(step) {
    const s1 = document.getElementById('anicli-step-1');
    const s2 = document.getElementById('anicli-step-2');
    const s3 = document.getElementById('anicli-step-3');
    const wizard = document.getElementById('anicli-wizard');
    const video = document.getElementById('anicli-video-view');
    const iframe = document.getElementById('anicli-iframe');

    if (!s1) return;

    wizard.classList.remove('hidden');
    video.classList.add('hidden');
    
    if (step === 1) {
        // Only show episodes
        s1.classList.remove('hidden');
        s2.classList.add('hidden');
        s3.classList.add('hidden');
        if (iframe) iframe.src = ""; // Stop video if going back to setup
    } else if (step === 2) {
        // Show translations
        s1.classList.add('hidden');
        s2.classList.remove('hidden');
        s3.classList.add('hidden');
    } else if (step === 3) {
        // Show players
        s1.classList.add('hidden');
        s2.classList.add('hidden');
        s3.classList.remove('hidden');
    } else if (step === 4) {
        // Show video
        wizard.classList.add('hidden');
        video.classList.remove('hidden');
    }
}

function onAnicliEpisodeChange(epNum) {
    window.currentAnicliEp = epNum;
    
    // Update active class on chips (visual feedback if they go back)
    document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === epNum);
    });

    document.getElementById('wizard-ep-lbl').innerText = `(Серия ${epNum})`;
    populateAnicliTranslations(epNum);
    goToAnicliStep(2);
}

function populateAnicliTranslations(epNum) {
    const epData = window.anicliEpisodesData[epNum.toString()];
    const transChips = document.getElementById('anicli-trans-chips');
    if (!epData || !transChips) return;

    const availableTrans = Object.keys(epData);
    
    transChips.innerHTML = availableTrans.map(tr => {
        return `<div class="anicli-chip" onclick="onAnicliTranslationChange('${tr.replace(/'/g, "\\'")}')">${tr}</div>`;
    }).join('');
}

function onAnicliTranslationChange(transName) {
    window.currentAnicliTrans = transName;
    
    document.querySelectorAll('#anicli-trans-chips .anicli-chip').forEach(c => {
        c.classList.toggle('active', c.innerText === transName);
    });

    document.getElementById('wizard-trans-lbl').innerText = `(${transName})`;
    populateAnicliPlayers(window.currentAnicliEp, transName);
    goToAnicliStep(3);
}

function populateAnicliPlayers(epNum, transName) {
    const epData = window.anicliEpisodesData[epNum.toString()];
    const playerChips = document.getElementById('anicli-player-chips');
    if (!epData || !epData[transName] || !playerChips) return;

    const players = epData[transName];

    playerChips.innerHTML = players.map((p, idx) => {
        return `<div class="anicli-chip" onclick="onAnicliPlayerChange('${p.url}', this, '${p.player}')">
                    ${p.player}
                </div>`;
    }).join('');
}

function onAnicliPlayerChange(url, element, playerName) {
    window.currentAnicliPlayerName = playerName;
    window.currentAnicliPlayerUrl = url;

    // 1. Show video view
    goToAnicliStep(4);
    
    // 2. Update info text
    const info = document.getElementById('video-active-info');
    if (info) {
        info.innerHTML = `Серия ${window.currentAnicliEp} &bull; ${window.currentAnicliTrans} &bull; ${playerName}`;
    }

    // 3. Render iframe
    updateAnicliIframe(url);

    // 4. Save progress
    if (window.currentPlayingAnimeId) {
        saveWatchProgress(
            window.currentPlayingAnimeId,
            window.currentPlayingTitle,
            window.currentPlayingRussian,
            window.currentPlayingPoster,
            window.currentAnicliEp,
            window.currentAnicliTrans,
            window.currentPlayingTotalEpisodes
        );
    }
}

function updateAnicliIframe(url) {
    const iframe = document.getElementById('anicli-iframe');
    if (iframe && url) {
        iframe.src = url;
    }
}

// User Rate Management helpers
function stepRateCounter(targetId, delta, maxVal = 0) {
    const input = document.getElementById(`rate-episodes-input-${targetId}`);
    if (!input) return;
    let val = (parseInt(input.value) || 0) + delta;
    if (val < 0) val = 0;
    if (maxVal > 0 && val > maxVal) val = maxVal;
    input.value = val;
}
window.stepRateCounter = stepRateCounter;

function setUserRateScore(targetId, score) {
    const container = document.getElementById(`stars-container-${targetId}`);
    const textEl = document.getElementById(`score-text-${targetId}`);
    if (!container) return;

    const current = parseInt(container.dataset.score) || 0;
    const newScore = (current === score) ? 0 : score;
    container.dataset.score = newScore;

    container.querySelectorAll('.star-btn').forEach(btn => {
        const starVal = parseInt(btn.dataset.star);
        btn.classList.toggle('active', starVal <= newScore);
    });

    if (textEl) {
        textEl.textContent = newScore ? `${newScore}/10` : '—';
    }
}
window.setUserRateScore = setUserRateScore;

function previewUserRateScore(targetId, score) {
    const container = document.getElementById(`stars-container-${targetId}`);
    if (!container) return;
    container.querySelectorAll('.star-btn').forEach(btn => {
        const starVal = parseInt(btn.dataset.star);
        btn.classList.toggle('hover', starVal <= score);
    });
}
window.previewUserRateScore = previewUserRateScore;

function resetPreviewUserRateScore(targetId) {
    const container = document.getElementById(`stars-container-${targetId}`);
    if (!container) return;
    container.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.remove('hover');
    });
}
window.resetPreviewUserRateScore = resetPreviewUserRateScore;

async function submitUserRate(targetId, targetType, rateId, totalCount = 0) {
    const statusSelect = document.getElementById(`rate-status-select-${targetId}`);
    const epInput = document.getElementById(`rate-episodes-input-${targetId}`);
    const starsContainer = document.getElementById(`stars-container-${targetId}`);
    const noteInput = document.getElementById(`rate-note-input-${targetId}`);

    if (!statusSelect) return;

    const status = statusSelect.value;
    const count = parseInt(epInput ? epInput.value : 0) || 0;
    const score = parseInt(starsContainer ? starsContainer.dataset.score : 0) || 0;
    const text = noteInput ? noteInput.value.trim() : '';

    const payload = {
        target_id: parseInt(targetId),
        target_type: targetType,
        status: status,
        score: score,
        text: text
    };
    if (rateId) payload.id = parseInt(rateId);

    if (targetType === 'Anime') {
        payload.episodes = count;
    } else {
        payload.chapters = count;
    }

    try {
        const saveBtn = document.querySelector(`#user-rate-widget-${targetId} .btn-save-rate`);
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="ti ti-loader animate-spin"></i> ${i18n('mylist.saving')}`;
        }

        const res = await fetch('/api/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="ti ti-check"></i> ${i18n('mylist.save')}`;
        }

        if (res.ok && data.success) {
            showToast(i18n('mylist.saved'), 'success');
            tabLoaded['rates'] = false;
        } else {
            showToast(data.error || i18n('mylist.save_error'), 'error');
        }
    } catch (err) {
        console.error('Ошибка сохранения оценки:', err);
        showToast(err.message, 'error');
    }
}
window.submitUserRate = submitUserRate;

async function deleteUserRateAction(targetId, targetType, rateId) {
    if (!confirm(i18n('mylist.delete_confirm'))) return;
    try {
        const res = await fetch(`/api/rate/${rateId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(i18n('mylist.deleted'), 'warning');
            tabLoaded['rates'] = false;
            if (targetType === 'Anime') openAnimeModal(targetId);
            else openMangaModal(targetId);
        } else {
            showToast(data.error || i18n('mylist.delete_error'), 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

window.deleteUserRateAction = deleteUserRateAction;

function renderAnimeUserRateWidget(a) {
    const rate = a.user_rate;
    const currentStatus = rate ? rate.status : '';
    const currentEpisodes = rate ? (rate.episodes || 0) : 0;
    const currentScore = rate ? (rate.score || 0) : 0;
    const currentText = rate ? (rate.text || '') : '';
    const rateId = rate ? rate.id : '';
    const totalEpisodes = a.episodes || 0;

    const statusMap = typeof getStatusMap === 'function' ? getStatusMap() : {};

    return `
        <div class="user-rate-widget-card" id="user-rate-widget-${a.id}">
            <div class="user-rate-widget-header">
                <h4><i class="ti ti-bookmark"></i> ${i18n('mylist.title')}</h4>
                ${currentStatus ? `<span class="badge badge-${currentStatus}">${statusMap[currentStatus] ? statusMap[currentStatus].anime : currentStatus}</span>` : `<span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-muted);">${i18n('mylist.not_in_list')}</span>`}
            </div>
            <div class="user-rate-widget-body">
                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.status')}</label>
                    <select id="rate-status-select-${a.id}" class="sort-select user-rate-select">
                        <option value="watching" ${currentStatus === 'watching' ? 'selected' : ''}>${i18n('rates.watching')}</option>
                        <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>${i18n('rates.completed')}</option>
                        <option value="planned" ${currentStatus === 'planned' ? 'selected' : (!currentStatus ? 'selected' : '')}>${i18n('rates.planned')}</option>
                        <option value="on_hold" ${currentStatus === 'on_hold' ? 'selected' : ''}>${i18n('rates.on_hold')}</option>
                        <option value="dropped" ${currentStatus === 'dropped' ? 'selected' : ''}>${i18n('rates.dropped')}</option>
                        <option value="rewatching" ${currentStatus === 'rewatching' ? 'selected' : ''}>${i18n('rates.rewatching')}</option>
                    </select>
                </div>

                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.episodes')}</label>
                    <div class="episode-stepper">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${a.id}', -1)"><i class="ti ti-minus"></i></button>
                        <input type="number" id="rate-episodes-input-${a.id}" class="stepper-input" min="0" max="${totalEpisodes || 9999}" value="${currentEpisodes}">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${a.id}', 1, ${totalEpisodes || 0})"><i class="ti ti-plus"></i></button>
                        ${totalEpisodes ? `<span class="stepper-total">/ ${totalEpisodes}</span>` : ''}
                    </div>
                </div>

                <div class="user-rate-row user-rate-score-row">
                    <div class="user-rate-score-header">
                        <label class="user-rate-label">${i18n('mylist.score')}</label>
                        <span class="score-display-text" id="score-text-${a.id}">${currentScore ? `${currentScore}/10` : '—'}</span>
                    </div>
                    <div class="stars-rating-container" id="stars-container-${a.id}" data-score="${currentScore}">
                        ${[1,2,3,4,5,6,7,8,9,10].map(s => `
                            <button type="button" class="star-btn ${s <= currentScore ? 'active' : ''}" data-star="${s}" onclick="setUserRateScore('${a.id}', ${s})" onmouseenter="previewUserRateScore('${a.id}', ${s})" onmouseleave="resetPreviewUserRateScore('${a.id}')" title="${s}/10">
                                <i class="ti ti-star-filled"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="user-rate-row" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <label class="user-rate-label">${i18n('mylist.note')}</label>
                    <textarea id="rate-note-input-${a.id}" class="user-rate-textarea" placeholder="${i18n('mylist.note_placeholder')}" rows="2">${currentText}</textarea>
                </div>

                <div class="user-rate-actions">
                    <button type="button" class="btn btn-save-rate" onclick="submitUserRate('${a.id}', 'Anime', ${rateId ? `'${rateId}'` : 'null'}, ${totalEpisodes || 0})">
                        <i class="ti ti-check"></i> <span>${i18n('mylist.save')}</span>
                    </button>
                    ${rateId ? `
                        <button type="button" class="btn-secondary btn-delete-rate" onclick="deleteUserRateAction('${a.id}', 'Anime', '${rateId}')">
                            <i class="ti ti-trash"></i> <span>${i18n('mylist.delete')}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderAnimeDetail(a) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    window.currentPlayingAnimeId = a.id;
    window.currentPlayingTitle = a.name;
    window.currentPlayingRussian = a.russian || a.name;
    window.currentPlayingPoster = a.image;
    window.currentPlayingTotalEpisodes = a.episodes || 0;

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

    const userRateWidgetHTML = renderAnimeUserRateWidget(a);

    const relatedHTML = (a.related && a.related.length) ? `
        <div class="anime-related-section">
            <h3><i class="ti ti-link"></i> ${i18n('anime.related')}</h3>
            <div class="anime-related-list">
                ${a.related.map(r => r.url ? `<a href="${r.url}" class="related-item" data-external="true"><span class="related-kind">${r.kind || ''}</span> ${r.name}</a>` : '').join('')}
            </div>
        </div>
    ` : '';

    const charactersHTML = (a.characters && a.characters.length) ? `
        <div class="anime-characters-section">
            <h3><i class="ti ti-users"></i> ${i18n('anime.characters')}</h3>
            <div class="anime-characters-scroll" id="anime-characters-scroll">
                ${a.characters.map((c, idx) => c.url ? `
                    <a href="${c.url}" class="character-card" target="_blank">
                        <div class="character-avatar-wrapper">
                            ${c.image ? `<img src="${c.image}" alt="${c.name}" class="character-avatar" loading="lazy" decoding="async">` : `<div class="character-avatar placeholder"><i class="ti ti-user"></i></div>`}
                            <span class="character-role">${c.role || ''}</span>
                        </div>
                        <div class="character-name">${c.name}</div>
                        ${c.japanese ? `<div class="character-japanese">${c.japanese}</div>` : ''}
                    </a>
                ` : '').join('')}
            </div>
            ${a.characters.length > 8 ? `
                <button class="characters-toggle-btn" onclick="toggleCharacters()" id="characters-toggle-btn">
                    <i class="ti ti-chevron-down"></i> ${i18n('anime.show_all_characters')}
                </button>
            ` : ''}
        </div>
    ` : '';

    currentScreenshots = a.screenshots || [];
    const screenshotsHTML = (a.screenshots && a.screenshots.length) ? `
        <div class="anime-screenshots-section">
            <h3><i class="ti ti-photo"></i> ${i18n('anime.screenshots')} <span class="badge-count">(${a.screenshots.length})</span></h3>
            <div class="anime-screenshots-scroll">
                ${a.screenshots.map((src, idx) => `
                    <div class="anime-screenshot-card" onclick="openScreenshotLightbox(${idx})" title="${i18n('lightbox.zoom')}">
                        <img src="${src}" class="anime-screenshot" loading="lazy" decoding="async" alt="Screenshot ${idx + 1}">
                        <div class="screenshot-zoom-overlay"><i class="ti ti-zoom-in"></i></div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';


    const videosHTML = (a.video && a.video.length) ? `
        <div class="anime-videos-section">
            <h3><i class="ti ti-video"></i> ${i18n('anime.videos')}</h3>
            <div class="anime-videos-list">
                ${a.video.map(v => `<a href="${v.url || v.player_url || '#'}" target="_blank" class="video-link" data-external="true"><i class="ti ti-player-play"></i> ${v.name || i18n('video.link')}</a>`).join('')}
            </div>
        </div>
    ` : '';


    const externalScoresHTML = (a.external_scores && a.external_scores.length) ? `
        <div class="anime-external-scores">
            ${a.external_scores.map(s => `<span class="external-score-badge">${s.service || ''}: ${s.score || '—'}</span>`).join(' ')}
        </div>
    ` : '';

    const franchiseHTML = a.franchise ? `
        <div class="info-item"><span class="label">${i18n('anime.franchise')}</span> <span>${a.franchise}</span></div>
    ` : '';

    const licensedByHTML = (a.licensed_by && a.licensed_by.length) ? `
        <div class="info-item info-full-row"><span class="label">${i18n('anime.licensed_by')}</span> <span>${a.licensed_by.join(', ')}</span></div>
    ` : '';

    body.innerHTML = `
        <div class="anime-detail-container">
            <!-- Top Hero Section: Poster + Actions on Left, Title + Information Box on Right -->
            <div class="anime-hero-section">
                <!-- Left: Poster + Watch Buttons + My List -->
                <div class="anime-hero-left">
                    <div class="anime-poster-wrapper">
                        ${a.image ? `<img src="${a.image}" alt="${title}" class="anime-poster" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder"><i class="ti ti-movie"></i></div>`}
                        ${a.score ? `<div class="anime-score-badge"><i class="ti ti-star-filled"></i> ${a.score}</div>` : ''}
                    </div>

                    <div class="anime-actions-panel">
                        ${a.shikimori_url ? `
                            <button id="watch-toggle-btn" class="btn-kodik-play" onclick="toggleWatchPlayer('${a.shikimori_url}', ${targetEpisode})">
                                <i class="ti ti-player-play"></i> <span>${i18n('anime.player_1')}</span>
                            </button>
                        ` : ''}

                        <button id="anicli-toggle-btn" class="btn-secondary btn-anicli-play" onclick="toggleAnicliPlayer('${safeTitle}', ${targetEpisode}, ${a.id})">
                            <i class="ti ti-device-tv"></i> <span>${i18n('anime.player_2')}</span>
                        </button>
                        ${a.shikimori_url ? `
                            <a href="${a.shikimori_url}" target="_blank" data-external="true" class="btn-secondary btn-shiki-link">
                                <i class="ti ti-external-link"></i> <span>Shikimori</span>
                            </a>
                        ` : ''}
                    </div>

                    ${userRateWidgetHTML}
                </div>

                <!-- Right: Title + Video Player (Above Info!) + Information Box + Description + Characters + Screenshots + Related + Videos -->
                <div class="anime-hero-right">
                    <div class="anime-header-titles">
                        <h2 class="anime-title">${title}</h2>
                        ${origTitle ? `<div class="anime-orig-title">${origTitle}</div>` : ''}
                        ${a.scored_by ? `<div class="anime-scored-by">${i18n('anime.scored_by')} ${a.scored_by.toLocaleString()}</div>` : ''}
                    </div>

                    <!-- Video Player (Appears directly ABOVE information when clicked!) -->
                    <div id="watch-player-container" class="kodik-player-wrapper hidden"></div>

                    <!-- ИНФОРМАЦИЯ Card: Beside poster, below player -->
                    <div class="anime-meta-details-card">
                        <h4><i class="ti ti-info-circle"></i> ${i18n('profile.info')}</h4>
                        <div class="anime-info-grid">
                            <div class="info-item"><span class="label">${i18n('anime.type')}</span> <span>${a.kind || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.status')}</span> <span>${a.status || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.episodes')}</span> <span>${a.episodes_aired ? `${a.episodes_aired} / ` : ''}${a.episodes || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.duration')}</span> <span>${a.duration ? `${a.duration} ${i18n('anime.min')}` : '—'}</span></div>

                            <div class="info-item"><span class="label">${i18n('anime.aired')}</span> <span>${a.aired_on || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('anime.rating')}</span> <span>${a.rating || '—'}</span></div>
                            <div class="info-item info-full-row"><span class="label">${i18n('anime.studios')}</span> <span>${a.studios && a.studios.length ? a.studios.join(', ') : '—'}</span></div>
                            <div class="info-item info-full-row"><span class="label">${i18n('anime.genres')}</span> <span>${a.genres && a.genres.length ? a.genres.join(', ') : '—'}</span></div>
                            ${franchiseHTML}
                            ${licensedByHTML}
                        </div>
                    </div>

                    <!-- Description (Directly Below Information Card!) -->
                    <div class="anime-description-section">
                        <h3><i class="ti ti-file-text"></i> ${i18n('anime.description')}</h3>
                        <div class="anime-description-content">${a.description}</div>
                    </div>

                    <!-- Characters (Below Description!) -->
                    ${charactersHTML}

                    <!-- Screenshots (Below Characters!) -->
                    ${screenshotsHTML}

                    <!-- Related / Chronology -->
                    ${relatedHTML}

                    <!-- Videos -->
                    ${videosHTML}

                    ${externalScoresHTML}
                </div>
            </div>
        </div>
    `;
}






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

    pushModalState();
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
        <div class="anime-hero-section">
            <div class="anime-hero-left">
                <div class="anime-poster-wrapper">
                    ${poster ? `<img src="${poster}" alt="${char.russian}" class="anime-poster" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder"><i class="ti ti-user"></i></div>`}
                </div>
                <div class="anime-actions-panel">
                    ${char.shikimori_url ? `<a href="${char.shikimori_url}" target="_blank" data-external="true" class="btn-secondary"><i class="ti ti-external-link"></i> <span>${i18n('anime.open_shikimori')}</span></a>` : ''}
                </div>
            </div>

            <div class="anime-hero-right">
                <div class="anime-header-titles">
                    <h2 class="anime-title">${char.russian}</h2>
                    <div class="anime-orig-title">${char.name} ${char.japanese ? `(${char.japanese})` : ''}</div>
                </div>

                <div class="anime-meta-details-card">
                    <h4><i class="ti ti-info-circle"></i> ${i18n('character.info')}</h4>
                    <div class="anime-info-grid">
                        ${animesHTML ? `<div class="info-item info-full-row"><span class="label">${i18n('character.anime')}</span><div class="search-item-tags" style="margin-top:4px;">${animesHTML}</div></div>` : ''}
                        ${mangasHTML ? `<div class="info-item info-full-row"><span class="label">${i18n('character.manga')}</span><div class="search-item-tags" style="margin-top:4px;">${mangasHTML}</div></div>` : ''}
                    </div>
                </div>
            </div>
        </div>

        <div class="anime-description-section">
            <h3><i class="ti ti-file-text"></i> ${i18n('character.info')}</h3>
            <div class="anime-description-content">${char.description || '—'}</div>
        </div>
    `;
}

// ==================== CLUB MODAL ====================

async function openClubModal(clubId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    pushModalState();
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
        <div class="anime-hero-section">
            <div class="anime-hero-left">
                <div class="anime-poster-wrapper">
                    ${logo ? `<img src="${logo}" alt="${club.name}" class="anime-poster" loading="lazy" decoding="async">` : `<div class="anime-poster placeholder"><i class="ti ti-users"></i></div>`}
                </div>
                <div class="anime-actions-panel">
                    ${club.shikimori_url ? `<a href="${club.shikimori_url}" target="_blank" data-external="true" class="btn-secondary"><i class="ti ti-external-link"></i> <span>${i18n('anime.open_shikimori')}</span></a>` : ''}
                </div>
            </div>

            <div class="anime-hero-right">
                <div class="anime-header-titles">
                    <h2 class="anime-title">${club.name}</h2>
                </div>

                <div class="anime-meta-details-card">
                    <h4><i class="ti ti-info-circle"></i> ${i18n('profile.info')}</h4>
                    <div class="anime-info-grid">
                        <div class="info-item"><span class="label">${i18n('club.members')}</span> <b>${club.members_count}</b></div>
                        <div class="info-item"><span class="label">${i18n('club.type')}</span> <span>${club.is_private ? i18n('friends.private_club') : i18n('friends.public_club')}</span></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="anime-description-section">
            <h3><i class="ti ti-file-text"></i> ${i18n('club.description')}</h3>
            <div class="anime-description-content">${club.description || '—'}</div>
        </div>
    `;
}