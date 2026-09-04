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
    if (!body || !body.innerHTML.trim() || body.querySelector('.anime-modal-loader')) return;

    const modalContent = body.closest('.modal-content') || body;
    const currentScroll = modalContent.scrollTop || body.scrollTop || window.scrollY || 0;
    const currentTitle = document.getElementById('mobile-anime-top-title')?.textContent || '';

    window.modalStack.push({
        html: body.innerHTML,
        scrollTop: currentScroll,
        title: currentTitle,
        openedFromSections: window._openedFromSections
    });

    if (typeof pushNavState === 'function') {
        pushNavState();
    }

    updateBackButtonVisibility();
}

function popModalState() {
    const body = document.getElementById('anime-modal-body');
    if (body && window.modalStack && window.modalStack.length > 0) {
        const state = window.modalStack.pop();
        if (typeof state === 'string') {
            body.innerHTML = state;
        } else if (state && state.html) {
            body.innerHTML = state.html;
            const modalContent = body.closest('.modal-content') || body;
            setTimeout(() => {
                modalContent.scrollTop = state.scrollTop || 0;
                body.scrollTop = state.scrollTop || 0;
            }, 10);
            if (state.openedFromSections) {
                window._openedFromSections = state.openedFromSections;
            }
        }
        updateBackButtonVisibility();
        return true;
    }
    return false;
}

window.pushModalState = pushModalState;
window.popModalState = popModalState;

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
        if (window._openedFromSettings) {
            window._openedFromSettings = false;
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.classList.remove('hidden');
        }
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

    if (!modal.classList.contains('hidden') && body.innerHTML.trim() && !body.querySelector('.anime-modal-loader')) {
        pushModalState();
    }

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
window.openAnimeModal = openAnimeModal;

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
    if (window._openedFromSections) {
        const prevSec = window._openedFromSections;
        window._openedFromSections = null;
        if (typeof openMobileSectionsMenu === 'function') openMobileSectionsMenu();
        if (typeof openSectionDetail === 'function') openSectionDetail(prevSec);
    }
}
window.closeAnimeModal = closeAnimeModal;

function getPlayerContainer() {
    if (window.innerWidth <= 768) {
        const mob = document.getElementById('mobile-watch-player-container');
        if (mob) return mob;
    }
    return document.getElementById('watch-player-container');
}

function toggleWatchPlayer(shikimoriPath, episode = 1) {
    const container = getPlayerContainer();
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

function closeMobileFullscreenPlayer() {
    const container = document.getElementById('mobile-watch-player-container');
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
        container.dataset.playerType = '';
        window.anicliEpisodesData = null;
        window.anicliSourcesFound = [];
    }
}
window.closeMobileFullscreenPlayer = closeMobileFullscreenPlayer;

async function toggleAnicliPlayer(title, episode = 1, animeId = 0) {
    const container = getPlayerContainer();
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

    const isMobile = window.innerWidth <= 768;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (isMobile) {
        container.innerHTML = `
            <div class="mobile-player-fullscreen-header">
                <button type="button" class="mobile-player-close-btn" onclick="handleMobilePlayerBack()" title="${isEn ? 'Back' : 'Назад'}">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <div class="mobile-player-fullscreen-title">
                    <div class="p-title">${title}</div>
                    <div class="p-sub" id="mobile-player-sub-title">Kodik • WinMedia</div>
                </div>
                <button type="button" class="mobile-player-close-btn" id="mobile-player-filter-btn" onclick="openMobileEpisodesFilterSheet()" title="${isEn ? 'Filter & Order' : 'Фильтр и порядок'}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <line x1="4" y1="6" x2="20" y2="6"></line>
                        <line x1="7" y1="12" x2="17" y2="12"></line>
                        <line x1="10" y1="18" x2="14" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div id="mobile-player-inner-content" class="mobile-player-inner-content">
                <div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ${i18n('anime.search_players')}</div>
            </div>
            <!-- Всплывающее меню фильтра и сортировки серий -->
            <div id="mobile-episodes-filter-sheet" class="mobile-episodes-filter-sheet hidden" onclick="if(event.target===this) closeMobileEpisodesFilterSheet();">
                <div class="mobile-episodes-filter-card" onclick="event.stopPropagation();">
                    <div class="filter-sheet-header">
                        <div class="filter-sheet-title">${isEn ? 'Filter & Order' : 'Фильтр и порядок'}</div>
                        <button type="button" class="filter-sheet-close-btn" onclick="closeMobileEpisodesFilterSheet()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div class="filter-sheet-section">
                        <div class="filter-sheet-label">${isEn ? 'Episodes filter' : 'Фильтр серий'}</div>
                        <div class="filter-sheet-chips">
                            <button type="button" class="filter-chip" id="filter-chip-all" onclick="setMobileEpFilter('all')">${isEn ? 'All' : 'Все'}</button>
                            <button type="button" class="filter-chip" id="filter-chip-unwatched" onclick="setMobileEpFilter('unwatched')">${isEn ? 'Unwatched' : 'Непросмотренные'}</button>
                            <button type="button" class="filter-chip" id="filter-chip-watched" onclick="setMobileEpFilter('watched')">${isEn ? 'Watched' : 'Просмотренные'}</button>
                        </div>
                    </div>

                    <div class="filter-sheet-section">
                        <div class="filter-sheet-label">${isEn ? 'Episode order' : 'Порядок серий'}</div>
                        <div class="filter-sheet-chips">
                            <button type="button" class="filter-chip" id="order-chip-asc" onclick="setMobileEpOrder(false)">${isEn ? 'Ascending (1 → N)' : 'По возрастанию (1 → N)'}</button>
                            <button type="button" class="filter-chip" id="order-chip-desc" onclick="setMobileEpOrder(true)">${isEn ? 'Descending (N → 1)' : 'По убыванию (N → 1)'}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.scrollTop = 0;
    } else {
        container.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('anime.search_players') + '</div>';
    }

    try {
        const res = await fetch(`/api/anime/${animeId}/anicli?title=${encodeURIComponent(title)}`);
        const data = await res.json();

        if (!res.ok || data.error) throw new Error(data.error || i18n('anime.load_error'));

        window.anicliEpisodesData = data.episodes || {};
        window.anicliSourcesFound = data.sources_found || [];
        
        if (isMobile) {
            const subTitleEl = document.getElementById('mobile-player-sub-title');
            if (subTitleEl) {
                subTitleEl.textContent = (window.anicliSourcesFound && window.anicliSourcesFound.length) ? window.anicliSourcesFound.join(' • ') : 'Kodik • WinMedia';
            }
        }

        const targetHost = isMobile ? (document.getElementById('mobile-player-inner-content') || container) : container;
        initAnicliPlayerUI(targetHost, episode);
    } catch (err) {
        const targetHost = isMobile ? (document.getElementById('mobile-player-inner-content') || container) : container;
        targetHost.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('anime.playback_error')}: ${err.message}</div>`;
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
        const newItem = {
            id: animeId,
            title: title || '',
            russian: russian || title || '',
            image: poster || '',
            episode: Number(episode) || 1,
            translation: translation || '',
            total_episodes: totalEpisodes || 0,
            updated_at: new Date().toISOString()
        };
        list.unshift(newItem);
        list = list.slice(0, 20);
        localStorage.setItem('shikimx_continue_watching', JSON.stringify(list));

        // Отправляем запись в базу данных на сервере
        fetch('/api/continue_watching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        }).catch(err => console.warn('DB save continue watching error:', err));

        if (typeof renderContinueWatching === 'function') {
            renderContinueWatching();
        }

        // Запись в детальную историю просмотров (для вкладки История)
        let history = JSON.parse(localStorage.getItem('shikimx_watch_history') || '[]');
        history = history.filter(h => !(h.id == animeId && h.episode == (Number(episode) || 1)));
        history.unshift({
            id: animeId,
            title: title || '',
            russian: russian || title || '',
            image: poster || '',
            episode: Number(episode) || 1,
            translation: translation || 'WinMedia',
            progress_status: 'Просмотрено полностью',
            created_at: new Date().toISOString()
        });
        history = history.slice(0, 60);
        localStorage.setItem('shikimx_watch_history', JSON.stringify(history));
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

window.mobileEpFilter = 'all'; // 'all', 'unwatched', 'watched'
window.mobileEpisodesOrderDesc = false;

window.openMobileEpisodesFilterSheet = function() {
    if (window.currentAnicliStep !== 1) return;
    const sheet = document.getElementById('mobile-episodes-filter-sheet');
    if (sheet) {
        sheet.classList.remove('hidden');
        updateFilterSheetActiveClasses();
    }
};

window.closeMobileEpisodesFilterSheet = function() {
    const sheet = document.getElementById('mobile-episodes-filter-sheet');
    if (sheet) sheet.classList.add('hidden');
};

window.setMobileEpFilter = function(filter) {
    window.mobileEpFilter = filter;
    updateFilterSheetActiveClasses();
    renderMobileEpisodesList();
};

window.setMobileEpOrder = function(isDesc) {
    window.mobileEpisodesOrderDesc = isDesc;
    updateFilterSheetActiveClasses();
    renderMobileEpisodesList();
};

function updateFilterSheetActiveClasses() {
    const fAll = document.getElementById('filter-chip-all');
    const fUnw = document.getElementById('filter-chip-unwatched');
    const fWat = document.getElementById('filter-chip-watched');
    if (fAll) fAll.classList.toggle('active', window.mobileEpFilter === 'all');
    if (fUnw) fUnw.classList.toggle('active', window.mobileEpFilter === 'unwatched');
    if (fWat) fWat.classList.toggle('active', window.mobileEpFilter === 'watched');

    const oAsc = document.getElementById('order-chip-asc');
    const oDesc = document.getElementById('order-chip-desc');
    if (oAsc) oAsc.classList.toggle('active', !window.mobileEpisodesOrderDesc);
    if (oDesc) oDesc.classList.toggle('active', !!window.mobileEpisodesOrderDesc);
}

function getFullyWatchedEpisodes(animeId) {
    try {
        const raw = localStorage.getItem(`shikimx_fully_watched_${animeId}`);
        return raw ? JSON.parse(raw) : [];
    } catch(e) {
        return [];
    }
}

function setFullyWatchedEpisodes(animeId, list) {
    try {
        localStorage.setItem(`shikimx_fully_watched_${animeId}`, JSON.stringify(list));
    } catch(e) {}
}

window.markEpisodeWatched = function(event, animeId, num) {
    if (event) event.stopPropagation();

    const list = getFullyWatchedEpisodes(animeId);
    if (!list.includes(num)) {
        list.push(num);
        setFullyWatchedEpisodes(animeId, list);
    }

    renderMobileEpisodesList();
    if (typeof showToast === 'function') {
        showToast(`Серия ${num}: просмотрено полностью`, 'success');
    }
};

window.unmarkEpisodeWatched = function(event, animeId, num) {
    if (event) event.stopPropagation();

    let list = getFullyWatchedEpisodes(animeId);
    list = list.filter(n => n !== num);
    setFullyWatchedEpisodes(animeId, list);

    renderMobileEpisodesList();
    if (typeof showToast === 'function') {
        showToast(`Отметка о серии ${num} снята`, 'info');
    }
};

function renderMobileEpisodesList() {
    const listContainer = document.getElementById('mobile-episodes-list-container');
    if (!listContainer) return;

    const episodes = window.anicliEpisodesData || {};
    let availableEpNums = Object.keys(episodes).map(Number).sort((a, b) => a - b);
    
    const animeId = window.currentPlayingAnimeId || 0;
    const userRate = window.currentPlayingUserRate || (window.currentPlayingAnimeData ? window.currentPlayingAnimeData.user_rate : null) || {};
    const shikimoriWatchedCount = parseInt(userRate.episodes || 0, 10);
    const fullyWatchedList = getFullyWatchedEpisodes(animeId);

    // 1. Фильтрация серий
    if (window.mobileEpFilter === 'unwatched') {
        availableEpNums = availableEpNums.filter(num => num > shikimoriWatchedCount);
    } else if (window.mobileEpFilter === 'watched') {
        availableEpNums = availableEpNums.filter(num => num <= shikimoriWatchedCount);
    }

    // 2. Сортировка порядка
    if (window.mobileEpisodesOrderDesc) {
        availableEpNums.reverse();
    }

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    if (!availableEpNums.length) {
        listContainer.innerHTML = `<div style="padding: 36px 16px; text-align: center; color: #888888; font-size: 14px;">${isEn ? 'No episodes found' : 'Серии не найдены'}</div>`;
        return;
    }

    listContainer.innerHTML = availableEpNums.map(num => {
        // ГАЛОЧКА: отображает статус просмотрено ли по данным из Shikimori (НЕ МЕНЯЕТСЯ ЗДЕСЬ!)
        const isWatchedOnShikimori = num <= shikimoriWatchedCount;

        // Отметка "Просмотрено полностью"
        const isFullyWatched = fullyWatchedList.includes(num);

        return `
            <div class="mobile-ep-row ${num === window.currentAnicliEp ? 'current-playing' : ''}" data-ep="${num}">
                <div class="mobile-ep-info" onclick="onAnicliEpisodeChange(${num})">
                    <div class="mobile-ep-title">${isEn ? 'Episode ' + num : 'Серия ' + num}</div>
                    ${isFullyWatched ? `<div class="mobile-ep-sub">${isEn ? 'Watched completely' : 'Просмотрено полностью'}</div>` : ''}
                </div>
                <div class="mobile-ep-actions">
                    <div class="mobile-ep-check ${isWatchedOnShikimori ? 'watched' : ''}">
                        ${isWatchedOnShikimori ? `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#181109" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ` : ''}
                    </div>
                    ${isFullyWatched ? `
                        <button type="button" class="mobile-ep-btn delete" onclick="unmarkEpisodeWatched(event, ${animeId}, ${num})" title="${isEn ? 'Remove watched mark' : 'Удалить отметку о просмотре'}">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#f09080">
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="3" y1="6" x2="21" y2="6" stroke="#f09080" stroke-width="2" stroke-linecap="round"></line>
                            </svg>
                        </button>
                    ` : `
                        <button type="button" class="mobile-ep-btn add" onclick="markEpisodeWatched(event, ${animeId}, ${num})" title="${isEn ? 'Mark as watched' : 'Отметить просмотренной'}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}
window.renderMobileEpisodesList = renderMobileEpisodesList;

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
    const isMobile = window.innerWidth <= 768 || !!container.closest('#mobile-watch-player-container');

    container.innerHTML = `
        <div class="anicli-player-wrapper">
            ${(!isMobile && sourcesFound.length) ? `
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
                    ${isMobile ? `
                        <div id="mobile-episodes-list-container" class="mobile-episodes-list-container"></div>
                    ` : `
                        <div class="anicli-step-title"><i class="ti ti-list-numbers"></i> ${isEn ? 'Step 1: Select episode' : 'Шаг 1: Выберите серию'}</div>
                        <div class="anicli-chip-list" id="anicli-ep-chips">
                            ${availableEpNums.map(num => `<div class="anicli-chip" data-ep="${num}" onclick="onAnicliEpisodeChange(${num})">${isEn ? 'Episode ' + num : num + ' серия'}</div>`).join('')}
                        </div>
                    `}
                </div>

                <!-- STEP 2: TRANSLATION -->
                <div class="anicli-step-container hidden" id="anicli-step-2">
                    ${isMobile ? `
                        <div id="mobile-trans-container" class="mobile-trans-container"></div>
                    ` : `
                        <div class="anicli-step-title" style="justify-content: space-between;">
                            <span><i class="ti ti-headphones"></i> ${isEn ? 'Step 2: Select voiceover' : 'Шаг 2: Выберите озвучку'} <span id="wizard-ep-lbl" style="opacity: 0.6; font-size: 12px; margin-left: 8px;"></span></span>
                            <button class="btn-secondary" style="padding: 2px 8px; font-size: 12px;" onclick="goToAnicliStep(1)"><i class="ti ti-arrow-left"></i> ${isEn ? 'Back' : 'Назад'}</button>
                        </div>
                        <div class="anicli-chip-list" id="anicli-trans-chips"></div>
                    `}
                </div>

                <!-- STEP 3: PLAYER -->
                <div class="anicli-step-container hidden" id="anicli-step-3">
                    ${isMobile ? `
                        <div id="mobile-players-container" class="mobile-players-container"></div>
                    ` : `
                        <div class="anicli-step-title" style="justify-content: space-between;">
                            <span><i class="ti ti-video"></i> ${isEn ? 'Step 3: Select source' : 'Шаг 3: Выберите источник'} <span id="wizard-trans-lbl" style="opacity: 0.6; font-size: 12px; margin-left: 8px;"></span></span>
                            <button class="btn-secondary" style="padding: 2px 8px; font-size: 12px;" onclick="goToAnicliStep(2)"><i class="ti ti-arrow-left"></i> ${isEn ? 'Back' : 'Назад'}</button>
                        </div>
                        <div class="anicli-chip-list" id="anicli-player-chips"></div>
                    `}
                </div>

                <!-- STEP 4: VIDEO (SEPARATE STEP) -->
                <div class="anicli-step-container hidden" id="anicli-step-4">
                    <div id="anicli-video-view">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="color: var(--text-main); font-size: 13px; font-weight: 600;" id="video-active-info"></div>
                            ${!isMobile ? `
                                <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="goToAnicliStep(1)"><i class="ti ti-settings"></i> ${isEn ? 'Change' : 'Изменить'}</button>
                            ` : ''}
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
            </div>
        </div>
    `;

    // Initialize state
    goToAnicliStep(1);
    if (isMobile) {
        renderMobileEpisodesList();
    }
}

window.handleMobilePlayerBack = function() {
    if (window.currentAnicliStep === 2) {
        goToAnicliStep(1);
    } else if (window.currentAnicliStep === 3) {
        goToAnicliStep(2);
    } else if (window.currentAnicliStep === 4) {
        goToAnicliStep(2);
    } else {
        closeMobileFullscreenPlayer();
    }
};

window.mobileTransFilter = 'all'; // 'all', 'dub', 'sub'

window.setMobileTransFilter = function(filter) {
    window.mobileTransFilter = filter;
    renderMobileTranslations();
};

function getInitials(name) {
    if (!name) return '??';
    const clean = name.replace(/^[#\[\]\(\)\s]+/, '').trim();
    const parts = clean.split(/[\s\-_&]+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (clean.length >= 2) {
        return clean.slice(0, 2).toUpperCase();
    }
    return clean.toUpperCase();
}

function isSubtitles(name) {
    const lower = (name || '').toLowerCase();
    return lower.includes('субтитр') || lower.includes('sub') || lower.includes('саб');
}

function getLastWatched(animeId) {
    try {
        const raw = localStorage.getItem(`shikimx_last_watched_${animeId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch(e) {
        return null;
    }
}

function setLastWatched(animeId, trans, ep) {
    try {
        const fullyWatchedList = getFullyWatchedEpisodes(animeId);
        const fullyWatched = fullyWatchedList.includes(ep);
        localStorage.setItem(`shikimx_last_watched_${animeId}`, JSON.stringify({
            trans: trans,
            ep: ep,
            fullyWatched: fullyWatched,
            time: Date.now()
        }));
    } catch(e) {}
}

function renderMobileTranslations() {
    const container = document.getElementById('mobile-trans-container');
    if (!container) return;

    const epNum = window.currentAnicliEp || 1;
    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[epNum.toString()] : null;
    if (!epData) {
        container.innerHTML = '<div style="padding: 32px 16px; text-align: center; color: #888;">Озвучки не найдены</div>';
        return;
    }

    const allTrans = Object.keys(epData);
    const animeId = window.currentPlayingAnimeId || 0;
    const fullyWatchedList = getFullyWatchedEpisodes(animeId);

    // Filter by type (Все / Озвучка / Субтитры)
    let filteredTrans = allTrans;
    if (window.mobileTransFilter === 'dub') {
        filteredTrans = allTrans.filter(t => !isSubtitles(t));
    } else if (window.mobileTransFilter === 'sub') {
        filteredTrans = allTrans.filter(t => isSubtitles(t));
    }

    // Last watched card data
    const savedLast = getLastWatched(animeId);
    const lastWatched = savedLast || (allTrans.length ? {
        trans: allTrans[0],
        ep: epNum,
        fullyWatched: fullyWatchedList.includes(epNum)
    } : null);

    const f = window.mobileTransFilter;

    container.innerHTML = `
        <div class="mobile-trans-pills">
            <button type="button" class="trans-pill ${f === 'all' ? 'active' : ''}" onclick="setMobileTransFilter('all')">
                ${f === 'all' ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''} Все
            </button>
            <button type="button" class="trans-pill ${f === 'dub' ? 'active' : ''}" onclick="setMobileTransFilter('dub')">
                ${f === 'dub' ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''} Озвучка
            </button>
            <button type="button" class="trans-pill ${f === 'sub' ? 'active' : ''}" onclick="setMobileTransFilter('sub')">
                ${f === 'sub' ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''} Субтитры
            </button>
        </div>

        ${lastWatched ? `
            <div class="mobile-last-watched-card">
                <div class="last-watched-info">
                    <div class="last-watched-heading">${isEn ? 'Recently watched' : 'Последнее просмотренное'}</div>
                    <div class="last-watched-title">${lastWatched.trans} &bull; ${isEn ? 'Episode' : 'Серия'} ${lastWatched.ep}</div>
                    <div class="last-watched-sub">${lastWatched.fullyWatched ? (isEn ? 'Watched completely' : 'Просмотрено полностью') : (isEn ? `Episode ${lastWatched.ep}` : `Серия ${lastWatched.ep}`)}</div>
                </div>
                <button type="button" class="last-watched-continue-btn" onclick="onAnicliTranslationChange(this.getAttribute('data-trans'))" data-trans="${lastWatched.trans.replace(/"/g, '&quot;')}">
                    ${isEn ? 'Continue' : 'Продолжить'}
                </button>
            </div>
        ` : ''}

        <div class="mobile-trans-list">
            ${filteredTrans.map(tr => {
                const initials = getInitials(tr);
                const isSub = isSubtitles(tr);
                const typeText = isSub ? (isEn ? 'Subtitles' : 'Субтитры') : (isEn ? 'Dubbing' : 'Озвучка');
                const safeTr = tr.replace(/"/g, '&quot;');
                return `
                    <div class="mobile-trans-row ${tr === window.currentAnicliTrans ? 'active' : ''}" onclick="onAnicliTranslationChange(this.getAttribute('data-trans'))" data-trans="${safeTr}">
                        <div class="mobile-trans-avatar">${initials}</div>
                        <div class="mobile-trans-details">
                            <div class="mobile-trans-name">${tr}</div>
                            <div class="mobile-trans-sub">${typeText}</div>
                        </div>
                    </div>
                `;
            }).join('')}
            ${!filteredTrans.length ? `
                <div style="padding: 32px 16px; text-align: center; color: #888; font-size: 13.5px;">${isEn ? 'Nothing found for selected filter' : 'Ничего не найдено для выбранного фильтра'}</div>
            ` : ''}
        </div>
    `;
}
window.renderMobileTranslations = renderMobileTranslations;

function goToAnicliStep(step) {
    window.currentAnicliStep = step;
    const s1 = document.getElementById('anicli-step-1');
    const s2 = document.getElementById('anicli-step-2');
    const s3 = document.getElementById('anicli-step-3');
    const s4 = document.getElementById('anicli-step-4');
    const iframe = document.getElementById('anicli-iframe');
    const subTitle = document.getElementById('mobile-player-sub-title');
    const filterBtn = document.getElementById('mobile-player-filter-btn');

    if (!s1) return;

    // Скрываем все 4 шага
    [s1, s2, s3, s4].forEach(s => {
        if (s) {
            s.classList.add('hidden');
            s.style.setProperty('display', 'none', 'important');
        }
    });

    if (step === 1) {
        // Шаг 1: Серии
        s1.classList.remove('hidden');
        s1.style.removeProperty('display');
        if (iframe) iframe.src = ""; // Stop video if going back to setup
        renderMobileEpisodesList();
        if (subTitle) subTitle.innerText = (window.anicliSourcesFound && window.anicliSourcesFound.length) ? window.anicliSourcesFound.join(' • ') : 'Kodik • WinMedia';
        if (filterBtn) {
            filterBtn.classList.remove('hidden');
            filterBtn.style.setProperty('display', 'flex', 'important');
        }
    } else {
        // Шаги 2, 3, 4: Скрываем кнопку фильтра серий
        if (filterBtn) {
            filterBtn.classList.add('hidden');
            filterBtn.style.setProperty('display', 'none', 'important');
        }
        closeMobileEpisodesFilterSheet();

        if (step === 2) {
            // Шаг 2: Озвучки
            if (s2) {
                s2.classList.remove('hidden');
                s2.style.removeProperty('display');
            }
            if (iframe) iframe.src = "";
            renderMobileTranslations();
            if (subTitle) {
                const firstSource = (window.anicliSourcesFound && window.anicliSourcesFound[0]) ? window.anicliSourcesFound[0] : 'Kodik';
                subTitle.innerText = firstSource;
            }
        } else if (step === 3) {
            // Шаг 3: Плееры / Источники
            if (s3) {
                s3.classList.remove('hidden');
                s3.style.removeProperty('display');
            }
            if (iframe) iframe.src = "";
            renderMobilePlayers(window.currentAnicliEp, window.currentAnicliTrans);
            if (subTitle) subTitle.innerText = `${window.currentAnicliTrans || ''} • Серия ${window.currentAnicliEp}`;
        } else if (step === 4) {
            // Шаг 4: Видеоплеер (отдельный экран)
            if (s4) {
                s4.classList.remove('hidden');
                s4.style.removeProperty('display');
            }
            if (subTitle) subTitle.innerText = `${window.currentAnicliTrans || ''} • Серия ${window.currentAnicliEp}`;
        }
    }
}

function onAnicliEpisodeChange(epNum) {
    window.currentAnicliEp = epNum;
    
    // Update active class on chips and mobile rows
    document.querySelectorAll('#anicli-ep-chips .anicli-chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.ep || c.innerText) === epNum);
    });
    const wizardEpLbl = document.getElementById('wizard-ep-lbl');
    if (wizardEpLbl) wizardEpLbl.innerText = `(Серия ${epNum})`;
    populateAnicliTranslations(epNum);
    goToAnicliStep(2);
}

function populateAnicliTranslations(epNum) {
    const isMobile = window.innerWidth <= 768 || !!document.getElementById('mobile-trans-container');
    if (isMobile) {
        renderMobileTranslations();
    }

    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[epNum.toString()] : null;
    const transChips = document.getElementById('anicli-trans-chips');
    if (!epData || !transChips) return;

    const availableTrans = Object.keys(epData);
    
    transChips.innerHTML = availableTrans.map(tr => {
        const safeTr = tr.replace(/"/g, '&quot;');
        return `<div class="anicli-chip" onclick="onAnicliTranslationChange(this.getAttribute('data-trans'))" data-trans="${safeTr}">${tr}</div>`;
    }).join('');
}

function onAnicliTranslationChange(transName) {
    window.currentAnicliTrans = transName;
    if (window.currentPlayingAnimeId) {
        setLastWatched(window.currentPlayingAnimeId, transName, window.currentAnicliEp);
    }
    
    document.querySelectorAll('#anicli-trans-chips .anicli-chip').forEach(c => {
        c.classList.toggle('active', c.innerText === transName);
    });
    document.querySelectorAll('.mobile-trans-row').forEach(r => {
        r.classList.toggle('active', r.querySelector('.mobile-trans-name') && r.querySelector('.mobile-trans-name').innerText === transName);
    });

    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[window.currentAnicliEp.toString()] : null;
    const players = epData ? epData[transName] : null;

    if (players && players.length === 1) {
        onAnicliPlayerChange(players[0].url, null, players[0].player);
    } else {
        const wizardTransLbl = document.getElementById('wizard-trans-lbl');
        if (wizardTransLbl) wizardTransLbl.innerText = `(${transName})`;
        populateAnicliPlayers(window.currentAnicliEp, transName);
        goToAnicliStep(3);
    }
}

function renderMobilePlayers(epNum, transName) {
    const container = document.getElementById('mobile-players-container');
    if (!container) return;

    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[epNum.toString()] : null;
    if (!epData || !epData[transName]) {
        container.innerHTML = '<div style="padding: 32px 16px; text-align: center; color: #888;">Источники не найдены</div>';
        return;
    }

    const players = epData[transName];

    container.innerHTML = `
        <div class="mobile-sources-header-bar">
            <div class="mobile-sources-title">Доступные источники</div>
            <div class="mobile-sources-subtitle">${transName} &bull; Серия ${epNum}</div>
        </div>
        <div class="mobile-players-list">
            ${players.map((p, idx) => {
                const initials = getInitials(p.player);
                const safePlayer = p.player.replace(/"/g, '&quot;');
                return `
                    <div class="mobile-player-row" onclick="onAnicliPlayerChange(this.getAttribute('data-url'), this, this.getAttribute('data-player'))" data-url="${p.url}" data-player="${safePlayer}">
                        <div class="mobile-player-avatar">${initials}</div>
                        <div class="mobile-player-details">
                            <div class="mobile-player-name">${p.player}</div>
                            <div class="mobile-player-sub">${isEn ? 'Video stream • Fast loading' : 'Видеопоток • Быстрая загрузка'}</div>
                        </div>
                        <div class="mobile-player-arrow">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f7a863">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
window.renderMobilePlayers = renderMobilePlayers;

function populateAnicliPlayers(epNum, transName) {
    const isMobile = window.innerWidth <= 768 || !!document.getElementById('mobile-players-container');
    if (isMobile) {
        renderMobilePlayers(epNum, transName);
    }

    const epData = window.anicliEpisodesData ? window.anicliEpisodesData[epNum.toString()] : null;
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
                ${currentStatus ? `<span class="badge badge-${currentStatus}">${statusMap[currentStatus] ? (statusMap[currentStatus].label || statusMap[currentStatus].name) : currentStatus}</span>` : `<span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-muted);">${i18n('mylist.not_in_list')}</span>`}
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

function formatRussianDate(dateStr) {
    if (!dateStr) return '—';
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const month = months[parseInt(parts[1], 10) - 1];
        const year = parts[0];
        return `${day} ${month} ${year} г.`;
    }
    return dateStr;
}

function getSeasonFromDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
        const month = parseInt(parts[1], 10);
        const year = parts[0];
        let season = '';
        if (month === 12 || month <= 2) season = 'Зима';
        else if (month >= 3 && month <= 5) season = 'Весна';
        else if (month >= 6 && month <= 8) season = 'Лето';
        else season = 'Осень';
        return `${season} ${year}`;
    }
    return dateStr;
}

window.copyAnimeShikimoriLink = function(url) {
    const targetUrl = url || (window.currentPlayingAnimeId ? `https://shikimori.io/animes/${window.currentPlayingAnimeId}` : window.location.href);
    
    function onSuccess() {
        if (typeof showToast === 'function') {
            showToast('Ссылка на Shikimori скопирована', 'success');
        }
    }

    function onFallback() {
        try {
            const ta = document.createElement('textarea');
            ta.value = targetUrl;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(ta);
            if (successful) {
                onSuccess();
                return;
            }
        } catch (e) {}
        if (typeof showToast === 'function') {
            showToast(targetUrl, 'info');
        }
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(targetUrl).then(onSuccess).catch(onFallback);
    } else {
        onFallback();
    }
};

window.handleShareAnime = window.copyAnimeShikimoriLink;

window.copyCharacterLink = function(url) {
    const targetUrl = url || window.location.href;
    function onSuccess() {
        if (typeof showToast === 'function') {
            showToast('Ссылка на персонажа скопирована', 'success');
        }
    }
    function onFallback() {
        try {
            const ta = document.createElement('textarea');
            ta.value = targetUrl;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(ta);
            if (successful) {
                onSuccess();
                return;
            }
        } catch (e) {}
        if (typeof showToast === 'function') {
            showToast(targetUrl, 'info');
        }
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(targetUrl).then(onSuccess).catch(onFallback);
    } else {
        onFallback();
    }
};

window.toggleMobileAnimeDesc = function(animeId, btn) {
    const desc = document.getElementById(`mobile-desc-body-${animeId}`);
    if (!desc) return;
    if (desc.classList.contains('collapsed')) {
        desc.classList.remove('collapsed');
        btn.textContent = 'Свернуть';
    } else {
        desc.classList.add('collapsed');
        btn.textContent = 'Развернуть';
    }
};

window.openMobileRateSheet = function(animeId) {
    const sheet = document.getElementById('mobile-rate-sheet');
    if (sheet) sheet.classList.remove('hidden');
};

window.closeMobileRateSheet = function() {
    const sheet = document.getElementById('mobile-rate-sheet');
    if (sheet) sheet.classList.add('hidden');
};

function formatTimestampRussian(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        const months = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} г., ${hours}:${mins}`;
    } catch(e) {
        return isoStr;
    }
}

window.setMobileRateStatus = function(animeId, status) {
    document.querySelectorAll(`.mobile-status-pill-${animeId}`).forEach(el => {
        el.classList.remove('active');
    });
    const selected = document.getElementById(`mobile-status-pill-${animeId}-${status}`);
    if (selected) selected.classList.add('active');
    const input = document.getElementById(`mobile-rate-status-input-${animeId}`);
    if (input) input.value = status;

    if (status === 'completed') {
        const epEl = document.getElementById(`mobile-rate-episodes-val-${animeId}`);
        const total = parseInt(epEl ? epEl.dataset.total : 0, 10) || 0;
        if (total > 0 && epEl) {
            epEl.textContent = total;
        }
    }
};

window.stepMobileCounter = function(animeId, type, delta) {
    const el = document.getElementById(`mobile-rate-${type}-val-${animeId}`);
    if (!el) return;
    let val = parseInt(el.textContent, 10) || 0;
    val += delta;
    if (val < 0) val = 0;
    if (type === 'episodes') {
        const total = parseInt(el.dataset.total, 10) || 0;
        if (total > 0 && val > total) val = total;
    }
    el.textContent = val;
};

window.updateMobileRateScore = function(animeId, score) {
    const num = document.getElementById(`mobile-rate-score-num-${animeId}`);
    const track = document.getElementById(`mobile-rate-slider-track-${animeId}`);
    const dots = document.querySelectorAll(`#mobile-rate-sheet .slider-dot`);
    const val = parseInt(score, 10) || 0;
    if (num) num.textContent = val > 0 ? val : '0';
    if (track) track.style.width = `${val * 10}%`;
    dots.forEach((d, idx) => {
        if (idx <= val) d.classList.add('active');
        else d.classList.remove('active');
    });
};

window.saveMobileUserRate = async function(animeId, rateId) {
    const statusInput = document.getElementById(`mobile-rate-status-input-${animeId}`);
    const status = statusInput ? statusInput.value : 'watching';

    const epEl = document.getElementById(`mobile-rate-episodes-val-${animeId}`);
    const episodes = parseInt(epEl ? epEl.textContent : 0, 10) || 0;

    const rewEl = document.getElementById(`mobile-rate-rewatches-val-${animeId}`);
    const rewatches = parseInt(rewEl ? rewEl.textContent : 0, 10) || 0;

    const scoreSlider = document.getElementById(`mobile-rate-score-slider-${animeId}`);
    const score = parseInt(scoreSlider ? scoreSlider.value : 0, 10) || 0;

    const noteEl = document.getElementById(`mobile-rate-note-input-${animeId}`);
    const text = noteEl ? noteEl.value.trim() : '';

    const saveBtn = document.querySelector('.rate-sheet-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.6';
    }

    const payload = {
        target_id: parseInt(animeId, 10),
        target_type: 'Anime',
        status: status,
        score: score,
        episodes: episodes,
        rewatches: rewatches,
        text: text
    };
    if (rateId) payload.id = parseInt(rateId, 10);

    try {
        const res = await fetch('/api/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (typeof showToast === 'function') {
                showToast('Сохранено в список', 'success');
            }
            if (typeof tabLoaded !== 'undefined') tabLoaded['rates'] = false;
            closeMobileRateSheet();
            openAnimeModal(animeId);
        } else {
            if (typeof showToast === 'function') {
                showToast(data.error || 'Ошибка сохранения', 'error');
            }
        }
    } catch(err) {
        if (typeof showToast === 'function') {
            showToast(err.message, 'error');
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
        }
    }
};

function buildMobileRateSheetHTML(a) {
    const rate = a.user_rate;
    const currentStatus = rate ? rate.status : 'watching';
    const currentEpisodes = rate ? (rate.episodes || 0) : 0;
    const currentRewatches = rate ? (rate.rewatches || 0) : 0;
    const currentScore = rate ? (rate.score || 0) : 0;
    const currentText = rate ? (rate.text || '') : '';
    const rateId = rate ? rate.id : '';
    const totalEpisodes = a.episodes || 0;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const title = (isEn && a.name) ? a.name : (a.russian || a.name);

    const createdAtStr = rate && rate.created_at ? formatTimestampRussian(rate.created_at) : '';
    const updatedAtStr = rate && rate.updated_at ? formatTimestampRussian(rate.updated_at) : '';

    const statuses = [
        { id: 'watching', label: typeof i18n === 'function' ? i18n('rates.watching') : (isEn ? 'Watching' : 'Смотрю'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' },
        { id: 'planned', label: typeof i18n === 'function' ? i18n('rates.planned') : (isEn ? 'Planned' : 'В планах'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
        { id: 'completed', label: typeof i18n === 'function' ? i18n('rates.completed') : (isEn ? 'Completed' : 'Просмотрено'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' },
        { id: 'on_hold', label: typeof i18n === 'function' ? i18n('rates.on_hold') : (isEn ? 'On hold' : 'Отложено'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>' },
        { id: 'dropped', label: typeof i18n === 'function' ? i18n('rates.dropped') : (isEn ? 'Dropped' : 'Брошено'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' },
        { id: 'rewatching', label: typeof i18n === 'function' ? i18n('rates.rewatching') : (isEn ? 'Rewatching' : 'Пересматриваю'), icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>' }
    ];

    return `
        <div id="mobile-rate-sheet" class="mobile-rate-sheet hidden" onclick="if (event.target === this) closeMobileRateSheet();">
            <div class="mobile-rate-sheet-card" onclick="event.stopPropagation();">
                <!-- 1. Header с постером, заголовком Прогресс и корзиной -->
                <div class="rate-sheet-header">
                    <div class="rate-sheet-header-left">
                        <div class="rate-sheet-poster-wrap">
                            ${a.image ? `<img src="${a.image}" alt="${title}" class="rate-sheet-poster">` : `<div class="rate-sheet-poster placeholder"><i class="ti ti-movie"></i></div>`}
                        </div>
                        <div class="rate-sheet-header-text">
                            <div class="rate-sheet-main-title">${isEn ? 'Progress' : 'Прогресс'}</div>
                            <div class="rate-sheet-sub-title">${title}</div>
                        </div>
                    </div>
                    ${rateId ? `
                        <button type="button" class="rate-sheet-delete-btn" onclick="deleteUserRateAction('${a.id}', 'Anime', '${rateId}')" title="${isEn ? 'Delete from list' : 'Удалить из списка'}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e07a68" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>

                <!-- 2. Статусы (Смотрю, В планах, Просмотрено...) -->
                <div class="rate-sheet-statuses-scroll">
                    <input type="hidden" id="mobile-rate-status-input-${a.id}" value="${currentStatus}">
                    ${statuses.map(st => `
                        <button type="button" 
                            id="mobile-status-pill-${a.id}-${st.id}" 
                            class="mobile-status-pill mobile-status-pill-${a.id} ${currentStatus === st.id ? 'active' : ''}" 
                            onclick="setMobileRateStatus('${a.id}', '${st.id}')">
                            <span class="pill-icon">${st.icon}</span>
                            <span class="pill-text">${st.label}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- 3. Две карточки счетчиков: Эпизоды и Повторения -->
                <div class="rate-sheet-counters-row">
                    <!-- Эпизоды -->
                    <div class="rate-counter-card">
                        <div class="rate-counter-label">${isEn ? 'Episodes' : 'Эпизоды'}</div>
                        <div class="rate-counter-val" id="mobile-rate-episodes-val-${a.id}" data-total="${totalEpisodes}">${currentEpisodes}</div>
                        <div class="rate-counter-btns">
                            <button type="button" class="rate-counter-btn" onclick="stepMobileCounter('${a.id}', 'episodes', -1)">−</button>
                            <button type="button" class="rate-counter-btn" onclick="stepMobileCounter('${a.id}', 'episodes', 1)">+</button>
                        </div>
                    </div>

                    <!-- Повторения -->
                    <div class="rate-counter-card">
                        <div class="rate-counter-label">${isEn ? 'Rewatches' : 'Повторения'}</div>
                        <div class="rate-counter-val" id="mobile-rate-rewatches-val-${a.id}">${currentRewatches}</div>
                        <div class="rate-counter-btns">
                            <button type="button" class="rate-counter-btn" onclick="stepMobileCounter('${a.id}', 'rewatches', -1)">−</button>
                            <button type="button" class="rate-counter-btn" onclick="stepMobileCounter('${a.id}', 'rewatches', 1)">+</button>
                        </div>
                    </div>
                </div>

                <!-- 4. Оценка со слайдером и точками 0..10 -->
                <div class="rate-sheet-score-section">
                    <div class="rate-sheet-section-title">${isEn ? 'Score' : 'Оценка'}</div>
                    <div class="rate-sheet-slider-row">
                        <div class="rate-sheet-slider-wrap">
                            <input type="range" min="0" max="10" step="1" value="${currentScore}" id="mobile-rate-score-slider-${a.id}" class="rate-sheet-slider" oninput="updateMobileRateScore('${a.id}', this.value)">
                            <div class="rate-sheet-slider-track" id="mobile-rate-slider-track-${a.id}" style="width: ${(currentScore / 10) * 100}%"></div>
                            <div class="rate-sheet-slider-dots">
                                ${[0,1,2,3,4,5,6,7,8,9,10].map(i => `<span class="slider-dot ${i <= currentScore ? 'active' : ''}"></span>`).join('')}
                            </div>
                        </div>
                        <div class="rate-sheet-score-val" id="mobile-rate-score-num-${a.id}">${currentScore ? currentScore : '0'}</div>
                    </div>
                </div>

                <!-- 5. Заметка -->
                <div class="rate-sheet-note-section">
                    <div class="rate-sheet-section-title">${isEn ? 'Note' : 'Заметка'}</div>
                    <textarea id="mobile-rate-note-input-${a.id}" class="rate-sheet-note-input" placeholder="${isEn ? 'Personal note...' : 'Личная заметка...'}" rows="2">${currentText}</textarea>
                </div>

                <!-- 6. Футер с датами и кнопкой сохранить -->
                <div class="rate-sheet-footer">
                    <div class="rate-sheet-timestamps">
                        ${createdAtStr ? `<div class="rate-timestamp-item"><span class="t-icon">+</span> <span>${createdAtStr}</span></div>` : ''}
                        ${updatedAtStr ? `<div class="rate-timestamp-item"><span class="t-icon">✏</span> <span>${updatedAtStr}</span></div>` : ''}
                    </div>
                    <button type="button" class="rate-sheet-save-btn" onclick="saveMobileUserRate('${a.id}', ${rateId ? `'${rateId}'` : 'null'})" title="${isEn ? 'Save' : 'Сохранить'}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM7 5v4h10V5H7zm5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                        </svg>
                    </button>
                </div>

                <!-- Нижний индикатор свайпа -->
                <div class="rate-sheet-home-bar"></div>
            </div>
        </div>
    `;
}

function initMobileAnimeModalScroll() {
    const modalContent = document.querySelector('#anime-modal .modal-content');
    const topBar = document.getElementById('mobile-anime-top-bar');
    const topTitle = document.getElementById('mobile-anime-top-title');
    if (!modalContent || !topBar) return;

    modalContent.onscroll = function() {
        if (modalContent.scrollTop > 120) {
            topBar.classList.add('scrolled');
            if (topTitle) topTitle.style.opacity = '1';
        } else {
            topBar.classList.remove('scrolled');
            if (topTitle) topTitle.style.opacity = '0';
        }
    };
}

function buildMobileAnimeDetailHTML(a, targetEpisode, safeTitle, userRateWidgetHTML) {
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const title = (isEn && a.name) ? a.name : (a.russian || a.name);
    const scoreVal = a.score ? parseFloat(a.score) : 0;
    const secondaryScore = a.scores_stats && a.scores_stats.length ? (scoreVal ? (scoreVal * 0.958).toFixed(2) : '') : '';

    const statusMapRu = {
        'planned': isEn ? 'Planned' : 'В планах',
        'watching': isEn ? 'Watching' : 'Смотрю',
        'completed': isEn ? 'Completed' : 'Просмотрено',
        'on_hold': isEn ? 'On hold' : 'Отложено',
        'dropped': isEn ? 'Dropped' : 'Брошено',
        'rewatching': isEn ? 'Rewatching' : 'Пересматриваю'
    };

    let userRateLabel = isEn ? 'Add to list' : 'В список';
    let userRateHasScore = false;
    if (a.user_rate) {
        const st = statusMapRu[a.user_rate.status] || a.user_rate.status || (isEn ? 'In list' : 'В списке');
        const sc = a.user_rate.score ? ` • ${a.user_rate.score} ★` : '';
        const ep = (!a.user_rate.score && a.user_rate.episodes) ? ` • ${a.user_rate.episodes} ${isEn ? 'eps' : 'эп.'}` : '';
        userRateLabel = `${st}${sc}${ep}`;
        userRateHasScore = true;
    }

    const descText = a.description || (isEn ? 'No description available.' : 'Описание отсутствует.');
    const isLongDesc = descText.length > 200;

    const statusesStats = a.statuses_stats || [];
    let plannedCount = 0, completedCount = 0, watchingCount = 0, droppedCount = 0, onHoldCount = 0;
    statusesStats.forEach(s => {
        const st = s.status || s.name;
        const cnt = parseInt(s.count || s.value || 0, 10);
        if (st === 'planned') plannedCount = cnt;
        else if (st === 'completed') completedCount = cnt;
        else if (st === 'watching') watchingCount = cnt;
        else if (st === 'dropped') droppedCount = cnt;
        else if (st === 'on_hold') onHoldCount = cnt;
    });
    const totalInLists = plannedCount + completedCount + watchingCount + droppedCount + onHoldCount;

    const charactersList = a.characters || [];
    const relatedList = a.related || [];
    const screenshotsList = a.screenshots || [];

    const studiosList = (a.studios && a.studios.length) ? a.studios.join(', ') : 'Madhouse';
    const japaneseTitle = Array.isArray(a.japanese) ? a.japanese.join(', ') : (a.japanese || '');
    const englishTitle = Array.isArray(a.english) ? a.english.join(', ') : (a.english || '');
    const synonymsText = Array.isArray(a.synonyms) ? a.synonyms.join(', ') : (a.synonyms || '');

    return `
        <div class="mobile-anime-container">
            <!-- 1. Верхний бар с кнопкой назад и поделиться -->
            <div class="mobile-anime-top-bar" id="mobile-anime-top-bar">
                <button type="button" class="mobile-anime-top-btn" onclick="handleModalBack()" title="${isEn ? 'Back' : 'Назад'}">
                    <i class="ti ti-arrow-left"></i>
                </button>
                <div class="mobile-anime-top-title" id="mobile-anime-top-title">${title}</div>
                <button type="button" class="mobile-anime-top-btn" onclick="copyAnimeShikimoriLink('${a.shikimori_url || ('https://shikimori.io/animes/' + a.id)}')" title="${isEn ? 'Share link' : 'Скопировать ссылку на Shikimori'}">
                    <i class="ti ti-share"></i>
                </button>
            </div>

            <!-- 2. Большой постер-баннер с градиентом и заголовком -->
            <div class="mobile-anime-hero" id="mobile-anime-hero">
                <div class="mobile-anime-hero-img-wrap">
                    ${a.image ? `<img src="${a.image}" alt="${title}" class="mobile-anime-hero-img">` : `<div class="mobile-anime-hero-placeholder"><i class="ti ti-movie"></i></div>`}
                    <div class="mobile-anime-hero-gradient"></div>
                </div>

                <div class="mobile-anime-hero-content">
                    <div class="mobile-anime-hero-stars-row">
                        <div class="mobile-hero-stars-outer" title="${scoreVal} / 10">
                            <div class="mobile-hero-stars-bg">★★★★★</div>
                            <div class="mobile-hero-stars-fill" style="width: ${(Math.min(100, Math.max(0, (scoreVal / 10) * 100))).toFixed(1)}%;">★★★★★</div>
                        </div>
                        <span class="mobile-hero-score">${a.score ? a.score : '—'}</span>
                        ${secondaryScore ? `<span class="mobile-hero-secondary-score">(${secondaryScore})</span>` : ''}
                    </div>

                    <h1 class="mobile-anime-hero-title">${title}</h1>

                    <div class="mobile-anime-meta-grid">
                        <div class="mobile-anime-meta-col">
                            <div class="meta-label">${isEn ? 'FORMAT' : 'ФОРМАТ'}</div>
                            <div class="meta-val">${(a.kind || 'TV')} • ${(a.status || (isEn ? 'Released' : 'Вышло'))}</div>
                        </div>
                        <div class="mobile-anime-meta-col">
                            <div class="meta-label">${isEn ? 'SEASON' : 'СЕЗОН'}</div>
                            <div class="meta-val">${getSeasonFromDate(a.aired_on)}</div>
                        </div>
                        <div class="mobile-anime-meta-col">
                            <div class="meta-label">${isEn ? 'EPISODES' : 'ЭПИЗОДЫ'}</div>
                            <div class="meta-val">${a.episodes ? a.episodes + (isEn ? ' eps' : ' эп.') : (a.episodes_aired ? a.episodes_aired + (isEn ? ' eps' : ' эп.') : '—')}</div>
                        </div>
                        <div class="mobile-anime-meta-col">
                            <div class="meta-label">${isEn ? 'RATING' : 'РЕЙТИНГ'}</div>
                            <div class="meta-val">${a.rating ? a.rating.replace('_', '-') : 'PG-13'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. Кнопки действий: статус в списке + круглая кнопка плеера -->
            <div class="mobile-anime-body-wrap">
                <div class="mobile-anime-actions-row">
                    <button type="button" class="mobile-anime-status-btn ${userRateHasScore ? 'active' : ''}" onclick="openMobileRateSheet('${a.id}')">
                        ${userRateHasScore ? `
                            <svg class="mobile-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e1910" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                        ` : `
                            <svg class="mobile-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e1910" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        `}
                        <span>${userRateLabel}</span>
                    </button>
                    <button type="button" class="mobile-anime-play-btn" onclick="toggleAnicliPlayer('${safeTitle}', ${targetEpisode}, ${a.id})" title="${isEn ? 'Watch in Player 2 (Anicli)' : 'Смотреть в Плеере 2 (Anicli)'}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#1b2612" style="margin-left: 2px; display: block;">
                            <path d="M7 4v16l13-8z"/>
                        </svg>
                    </button>
                </div>

                <!-- Контейнер для встроенного плеера на мобильном -->
                <div id="mobile-watch-player-container" class="mobile-watch-player-wrapper hidden"></div>

                <!-- 4. Карточка описания -->
                <div class="mobile-anime-desc-card">
                    <div class="mobile-anime-desc-heading">${isEn ? 'Description' : 'Описание'}</div>
                    <div class="mobile-anime-desc-body ${isLongDesc ? 'collapsed' : ''}" id="mobile-desc-body-${a.id}">
                        ${descText}
                    </div>
                    ${isLongDesc ? `<div class="mobile-anime-desc-toggle" onclick="toggleMobileAnimeDesc('${a.id}', this)">${isEn ? 'Show more' : 'Развернуть'}</div>` : ''}
                </div>

                <!-- 5. Горизонтальная прокрутка жанров -->
                ${(a.genres && a.genres.length) ? `
                    <div class="mobile-anime-genres-scroll">
                        ${a.genres.map(g => `<span class="mobile-anime-genre-pill">${g}</span>`).join('')}
                    </div>
                ` : ''}

                <!-- 6. Раздел В списках с цветной полосой -->
                ${totalInLists > 0 ? `
                    <div class="mobile-anime-section">
                        <div class="mobile-anime-section-title">${isEn ? 'In lists' : 'В списках'}</div>
                        <div class="mobile-in-lists-bar">
                            <div class="bar-seg seg-planned" style="flex: ${plannedCount || 0.05};" title="${isEn ? 'Planned' : 'В планах'}"></div>
                            <div class="bar-seg seg-completed" style="flex: ${completedCount || 0.05};" title="${isEn ? 'Completed' : 'Просмотрено'}"></div>
                            <div class="bar-seg seg-watching" style="flex: ${watchingCount || 0.05};" title="${isEn ? 'Watching' : 'Смотрю'}"></div>
                            <div class="bar-seg seg-dropped" style="flex: ${droppedCount || 0.05};" title="${isEn ? 'Dropped' : 'Брошено'}"></div>
                            <div class="bar-seg seg-onhold" style="flex: ${onHoldCount || 0.05};" title="${isEn ? 'On hold' : 'Отложено'}"></div>
                        </div>
                        <div class="mobile-in-lists-legend">
                            <div class="legend-item"><span class="dot dot-planned"></span> <span class="label">${isEn ? 'Planned' : 'В планах'}</span> <span class="val">${plannedCount.toLocaleString()}</span></div>
                            <div class="legend-item"><span class="dot dot-completed"></span> <span class="label">${isEn ? 'Completed' : 'Просмотрено'}</span> <span class="val">${completedCount.toLocaleString()}</span></div>
                            <div class="legend-item"><span class="dot dot-watching"></span> <span class="label">${isEn ? 'Watching' : 'Смотрю'}</span> <span class="val">${watchingCount.toLocaleString()}</span></div>
                            <div class="legend-item"><span class="dot dot-dropped"></span> <span class="label">${isEn ? 'Dropped' : 'Брошено'}</span> <span class="val">${droppedCount.toLocaleString()}</span></div>
                            <div class="legend-item"><span class="dot dot-onhold"></span> <span class="label">${isEn ? 'On hold' : 'Отложено'}</span> <span class="val">${onHoldCount.toLocaleString()}</span></div>
                        </div>
                    </div>
                ` : ''}

                <!-- 7. Персонажи с овальными аватарками -->
                ${charactersList.length ? `
                    <div class="mobile-anime-section">
                        <div class="mobile-anime-section-header">
                            <div class="mobile-anime-section-title">${isEn ? 'Characters' : 'Персонажи'}</div>
                            <i class="ti ti-chevron-right section-chevron"></i>
                        </div>
                        <div class="mobile-characters-scroll">
                            ${charactersList.map(c => {
                                const charId = c.id || (c.url ? (c.url.match(/characters\/(?:z|a)?(\d+)/) || [])[1] : null);
                                const clickAction = charId ? `openCharacterModal(${charId});` : (c.url ? `window.open('${c.url}', '_blank');` : '');
                                return `
                                    <div class="mobile-character-card" onclick="${clickAction}">
                                        <div class="mobile-character-avatar-wrap">
                                            ${c.image ? `<img src="${c.image}" alt="${c.name}" class="mobile-character-avatar" loading="lazy">` : `<div class="mobile-character-avatar placeholder"><i class="ti ti-user"></i></div>`}
                                        </div>
                                        <div class="mobile-character-name">${c.name}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 8. Связанное с бейджем хронологии -->
                ${relatedList.length ? `
                    <div class="mobile-anime-section">
                        <div class="mobile-anime-section-header">
                            <div class="mobile-anime-section-title">
                                ${isEn ? 'Related' : 'Связанное'} <span class="mobile-count-pill">${relatedList.length}</span>
                                <span class="mobile-chronology-badge">${isEn ? 'Chronology' : 'Хронология'}</span>
                            </div>
                            <i class="ti ti-chevron-right section-chevron"></i>
                        </div>
                        <div class="mobile-related-list">
                            ${relatedList.map(r => {
                                const isRelAnime = r.url && (r.url.includes('/animes/') || !r.url.includes('/mangas/'));
                                const isRelManga = r.url && r.url.includes('/mangas/');
                                const relId = r.id;
                                const clickAction = (isRelAnime && relId) ? `openAnimeModal(${relId});` : (isRelManga && relId ? `openMangaModal(${relId});` : (r.url ? `window.open('${r.url}', '_blank');` : ''));
                                const relThumb = r.image;
                                return `
                                    <div class="mobile-related-item" onclick="${clickAction}">
                                        <div class="mobile-related-thumb-wrap">
                                            ${relThumb ? `<img src="${relThumb}" alt="${r.name}" class="mobile-related-thumb" loading="lazy">` : `<div class="mobile-related-thumb placeholder"><i class="ti ti-movie"></i></div>`}
                                        </div>
                                        <div class="mobile-related-info">
                                            <div class="mobile-related-title">${r.name}</div>
                                            <div class="mobile-related-kind">${r.kind || (isEn ? 'Sequel' : 'Продолжение')}</div>
                                        </div>
                                        <div class="mobile-related-action">
                                            <i class="ti ti-eye"></i>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 9. Кадры -->
                ${screenshotsList.length ? `
                    <div class="mobile-anime-section">
                        <div class="mobile-anime-section-title">${isEn ? 'Screenshots' : 'Кадры'}</div>
                        <div class="mobile-screenshots-scroll">
                            ${screenshotsList.map((src, idx) => `
                                <div class="mobile-screenshot-card" onclick="openScreenshotLightbox(${idx})">
                                    <img src="${src}" alt="${isEn ? 'Screenshot ' + (idx + 1) : 'Кадр ' + (idx + 1)}" class="mobile-screenshot-img" loading="lazy">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 10. Детали -->
                <div class="mobile-anime-section mobile-details-section">
                    <div class="mobile-anime-section-title">${isEn ? 'Details' : 'Детали'}</div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Studio' : 'Студия'}</span>
                        <span class="detail-val"><span class="studio-badge">${studiosList}</span></span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Source' : 'Первоисточник'}</span>
                        <span class="detail-val">${isEn ? 'Manga' : 'Манга'}</span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Episode duration' : 'Длительность эпизода'}</span>
                        <span class="detail-val">${a.duration ? a.duration + (isEn ? ' min.' : ' мин.') : (isEn ? '24 min.' : '24 мин.')}</span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Aired from' : 'Начало показа'}</span>
                        <span class="detail-val">${formatRussianDate(a.aired_on)}</span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Aired to' : 'Конец показа'}</span>
                        <span class="detail-val">${formatRussianDate(a.released_on)}</span>
                    </div>

                    <div class="mobile-detail-separator"></div>

                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Romaji' : 'Ромадзи'}</span>
                        <span class="detail-val">${a.name || '—'}</span>
                    </div>
                    <div class="mobile-detail-row">
                        <span class="detail-label">${isEn ? 'Russian' : 'По-русски'}</span>
                        <span class="detail-val">${a.russian || a.name || '—'}</span>
                    </div>
                    ${englishTitle ? `
                        <div class="mobile-detail-row">
                            <span class="detail-label">${isEn ? 'English' : 'По-английски'}</span>
                            <span class="detail-val">${englishTitle}</span>
                        </div>
                    ` : ''}
                    ${japaneseTitle ? `
                        <div class="mobile-detail-row">
                            <span class="detail-label">${isEn ? 'Japanese' : 'По-японски'}</span>
                            <span class="detail-val">${japaneseTitle}</span>
                        </div>
                    ` : ''}
                    ${synonymsText ? `
                        <div class="mobile-detail-row">
                            <span class="detail-label">${isEn ? 'Synonyms' : 'Другие названия'}</span>
                            <span class="detail-val">${synonymsText}</span>
                        </div>
                    ` : ''}

                    <div class="mobile-detail-separator"></div>
                </div>

                <!-- 11. Навигационные пункты -->
                <div class="mobile-anime-nav-list">
                    <div class="mobile-nav-link-item" onclick="window.open('${a.shikimori_url || '#'}', '_blank')">
                        <div class="mobile-nav-link-left">
                            <i class="ti ti-messages"></i>
                            <span>${isEn ? 'Discussions' : 'Обсуждение'}</span>
                        </div>
                        <i class="ti ti-chevron-right"></i>
                    </div>
                    <div class="mobile-nav-link-item" onclick="window.open('${a.shikimori_url || '#'}/similar', '_blank')">
                        <div class="mobile-nav-link-left">
                            <i class="ti ti-copy"></i>
                            <span>${isEn ? 'Similar' : 'Похожее'}</span>
                        </div>
                        <i class="ti ti-chevron-right"></i>
                    </div>
                    <div class="mobile-nav-link-item" onclick="window.open('${a.shikimori_url || '#'}', '_blank')">
                        <div class="mobile-nav-link-left">
                            <i class="ti ti-link"></i>
                            <span>${isEn ? 'Links' : 'Ссылки'}</span>
                        </div>
                        <i class="ti ti-chevron-right"></i>
                    </div>
                    <div class="mobile-nav-link-item" onclick="toggleAnicliPlayer('${safeTitle}', ${targetEpisode}, ${a.id})">
                        <div class="mobile-nav-link-left">
                            <i class="ti ti-movie"></i>
                            <span>${isEn ? 'Videos' : 'Видео'}</span>
                        </div>
                        <i class="ti ti-chevron-right"></i>
                    </div>
                </div>
            </div>

            <!-- 12. Всплывающий боттом-шит прогресса -->
            ${buildMobileRateSheetHTML(a)}
        </div>
    `;
}

function renderAnimeDetail(a) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    window.currentPlayingAnimeId = a.id;
    window.currentPlayingAnimeData = a;
    window.currentPlayingUserRate = a.user_rate;
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

    const desktopHTML = `
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

    const mobileHTML = buildMobileAnimeDetailHTML(a, targetEpisode, safeTitle, userRateWidgetHTML);

    body.innerHTML = `
        <div class="anime-detail-desktop">
            ${desktopHTML}
        </div>
        <div class="anime-detail-mobile">
            ${mobileHTML}
        </div>
    `;

    setTimeout(initMobileAnimeModalScroll, 100);
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

function toggleCharDesc(id, btn) {
    const desc = document.getElementById('char-desc-' + id);
    if (!desc) return;
    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const isCollapsed = desc.classList.contains('collapsed');
    if (isCollapsed) {
        desc.classList.remove('collapsed');
        btn.textContent = isEn ? 'Show less' : 'Свернуть';
    } else {
        desc.classList.add('collapsed');
        btn.textContent = isEn ? 'Show more' : 'Развернуть';
    }
}
window.toggleCharDesc = toggleCharDesc;

function renderCharacterDetail(char) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const poster = char.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(char.image) : char.image) : '';
    const animes = char.animes || [];
    const mangas = char.mangas || [];
    const descText = char.description || '';
    const isLongDesc = descText.length > 220;

    body.innerHTML = `
        <div class="char-view-top-bar">
            <button type="button" class="char-view-nav-btn" onclick="handleModalBack()" title="${isEn ? 'Back' : 'Назад'}">
                <i class="ti ti-arrow-left"></i>
            </button>
            <div class="char-view-nav-title">${isEn ? 'Character' : 'Персонаж'}</div>
            <button type="button" class="char-view-nav-btn" onclick="copyCharacterLink('${char.shikimori_url || ('https://shikimori.io/characters/' + char.id)}')" title="${isEn ? 'Share' : 'Поделиться'}">
                <i class="ti ti-share"></i>
            </button>
        </div>

        <div class="char-view-container">
            <!-- 1. Header with round avatar & name -->
            <div class="char-view-header">
                <div class="char-view-avatar-wrap">
                    ${poster ? `<img src="${poster}" alt="${char.name}" class="char-view-avatar" loading="lazy" decoding="async">` : `<div class="char-view-avatar placeholder"><i class="ti ti-user"></i></div>`}
                </div>
                <div class="char-view-names">
                    <h1 class="char-name-en">${char.name}</h1>
                    ${char.russian && char.russian !== char.name ? `<div class="char-name-ru">${char.russian}</div>` : ''}
                    ${char.japanese ? `<div class="char-name-ja">${char.japanese}</div>` : ''}
                </div>
            </div>

            <!-- 2. Description section -->
            ${descText ? `
                <div class="char-view-desc-section">
                    <div class="char-view-desc-text ${isLongDesc ? 'collapsed' : ''}" id="char-desc-${char.id}">
                        ${descText}
                    </div>
                    ${isLongDesc ? `
                        <div class="char-view-desc-toggle" onclick="toggleCharDesc('${char.id}', this)">${isEn ? 'Show more' : 'Развернуть'}</div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- 3. Anime section -->
            ${animes.length > 0 ? `
                <div class="char-view-media-section">
                    <h3 class="char-section-title">${isEn ? 'Anime' : 'Аниме'}</h3>
                    <div class="char-media-carousel">
                        ${animes.map(a => {
                            const aImg = a.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(a.image) : a.image) : '';
                            const metaKind = a.kind || 'TV';
                            const metaScore = a.score ? ` • ${a.score}★` : '';
                            return `
                                <div class="char-media-card" onclick="openAnimeModal(${a.id})">
                                    <div class="char-media-poster-wrap">
                                        ${aImg ? `<img src="${aImg}" alt="${a.name}" class="char-media-poster" loading="lazy">` : `<div class="char-media-poster placeholder"><i class="ti ti-movie"></i></div>`}
                                    </div>
                                    <div class="char-media-title" title="${a.name}">${a.name}</div>
                                    <div class="char-media-meta">${metaKind}${metaScore}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 4. Manga section -->
            ${mangas.length > 0 ? `
                <div class="char-view-media-section">
                    <h3 class="char-section-title">${isEn ? 'Manga & Light Novels' : 'Манга и ранобэ'}</h3>
                    <div class="char-media-carousel">
                        ${mangas.map(m => {
                            const mImg = m.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(m.image) : m.image) : '';
                            const metaKind = m.kind || 'MANGA';
                            const metaScore = m.score ? ` • ${m.score}★` : '';
                            return `
                                <div class="char-media-card" onclick="openMangaModal(${m.id})">
                                    <div class="char-media-poster-wrap">
                                        ${mImg ? `<img src="${mImg}" alt="${m.name}" class="char-media-poster" loading="lazy">` : `<div class="char-media-poster placeholder"><i class="ti ti-book"></i></div>`}
                                    </div>
                                    <div class="char-media-title" title="${m.name}">${m.name}</div>
                                    <div class="char-media-meta">${metaKind}${metaScore}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// ==================== CLUB MODAL ====================

async function openClubModal(clubId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    if (!modal.classList.contains('hidden') && body.innerHTML.trim() && !body.querySelector('.anime-modal-loader')) {
        pushModalState();
    }
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

    const isEn = typeof getSavedLanguage === 'function' ? (getSavedLanguage() === 'en') : false;
    const logo = club.image || '';

    body.innerHTML = `
        <div class="mobile-anime-top-bar" id="mobile-anime-top-bar">
            <button type="button" class="mobile-anime-top-btn" onclick="handleModalBack()" title="${isEn ? 'Back' : 'Назад'}">
                <i class="ti ti-arrow-left"></i>
            </button>
            <div class="mobile-anime-top-title" id="mobile-anime-top-title">${club.name || ''}</div>
            <div style="width: 38px;"></div>
        </div>

        <div class="anime-hero-section" style="padding-top: 64px;">
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