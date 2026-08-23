const tabLoaded = {};
let cachedHistoryData = null;
let ratesDataCache = [];

function showLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.add('hidden');
}

window.addEventListener('load', () => setTimeout(hideLoader, 300));

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
}

function buildImgUrl(src) {
    if (!src) return '';
    if (typeof src === 'string') {
        if (src.startsWith('/cache/img') || src.startsWith('data:')) return src;
        if (src.includes('missing_original') || src.includes('missing_preview')) return '';
    }
    let path = typeof src === 'string' ? src : (src.original || src.x160 || src.preview || src.main || '');
    if (!path || path === 'None' || path === '{}') return '';
    if (path.includes('missing_original') || path.includes('missing_preview')) return '';
    path = path.replace(/\/(x64|x32|preview)\//, '/original/');
    const fullUrl = path.startsWith('http') ? path : 'https://shikimori.io' + (path.startsWith('/') ? path : '/' + path);
    return `/cache/img?url=${encodeURIComponent(fullUrl)}`;
}


async function openTab(tabId) {
    localStorage.setItem('activeTab', tabId);
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-tab-btn').forEach(el => el.classList.remove('active'));

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');

    document.querySelectorAll(`.tab-btn[onclick*="'${tabId}'"]`).forEach(btn => btn.classList.add('active'));
    document.querySelectorAll(`.mobile-tab-btn[data-tab="${tabId}"]`).forEach(btn => btn.classList.add('active'));

    if (tabId === 'profile') {
        // Load explore data (news) when profile tab is opened
        if (!tabLoaded['explore']) {
            showLoader();
            try {
                const res = await fetch(`/api/tab/explore`);
                const data = await res.json();
                tabLoaded['explore'] = true;
                renderExplore(data);
            } catch (err) {
                console.error('Ошибка загрузки новостей:', err);
            } finally {
                hideLoader();
            }
        }
        return;
    }
    if (tabId === 'history' && cachedHistoryData) {
        renderHistory(cachedHistoryData);
        tabLoaded['history'] = true;
        return;
    }
    if (tabLoaded[tabId]) return;

    showLoader();
    try {
        const res = await fetch(`/api/tab/${tabId}`);
        const data = await res.json();
        tabLoaded[tabId] = true;

        if (tabId === 'favourites') renderFavourites(data);
        else if (tabId === 'friends') renderFriends(data);
        else if (tabId === 'history') { cachedHistoryData = data; renderHistory(data); }
        else if (tabId === 'rates') { ratesDataCache = data; renderRatesView(); }
    } catch (err) {
        if (activeContent) activeContent.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки: ${err.message}</p>`;
    } finally {
        hideLoader();
    }
}

async function syncAppVersion() {
    try {
        const res = await fetch('/api/about');
        const data = await res.json();

        if (data.version) {
            const dropdownVer = document.getElementById('dropdown-version');
            if (dropdownVer) dropdownVer.innerHTML = `<i class="ti ti-code"></i> Shiki MX v${data.version}`;

            const badgeVer = document.getElementById('about-badge-version');
            if (badgeVer) badgeVer.innerText = `v${data.version}`;
        }
        return data;
    } catch (err) {
        console.error('Ошибка получения версии приложения:', err);
        return null;
    }
}

async function openAboutModal() {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    try {
        const data = await syncAppVersion();
        if (!data) return;

        const descEl = document.getElementById('about-modal-desc');
        if (descEl && data.description) descEl.innerText = data.description;

        const featuresEl = document.getElementById('about-modal-features');
        if (featuresEl && data.features) {
            featuresEl.innerHTML = data.features.map(f => `<li><i class="ti ti-check"></i> ${f}</li>`).join('');
        }

        const stackEl = document.getElementById('about-modal-stack');
        if (stackEl && data.stack) {
            stackEl.innerHTML = data.stack.map(s => `<span class="search-tag">${s}</span>`).join('');
        }

        const changelogEl = document.getElementById('about-modal-changelog');
        if (changelogEl && Array.isArray(data.changelog)) {
            changelogEl.innerHTML = data.changelog.map(item => `
                <div class="changelog-item">
                    <div class="changelog-header">
                        <div class="changelog-title-wrap">
                            <span class="changelog-version">v${item.version}</span>
                            <span class="changelog-item-title">${item.title || ''}</span>
                        </div>
                        <span class="changelog-date">${item.date || ''}</span>
                    </div>
                    <ul class="changelog-changes">
                        ${(item.changes || []).map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Ошибка загрузки данных о сайте:', err);
    }
}

function closeAboutModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close-btn') && !event.target.parentElement.classList.contains('modal-close-btn')) return;
    const modal = document.getElementById('about-modal');
    if (modal) modal.classList.add('hidden');
}

// Toast Notification System
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    let icon = 'ti-info-circle';
    if (type === 'success') icon = 'ti-circle-check';
    else if (type === 'error') icon = 'ti-alert-circle';
    else if (type === 'warning') icon = 'ti-alert-triangle';

    toast.innerHTML = `
        <i class="ti ${icon} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
window.showToast = showToast;

// PWA Service Worker & Install Prompt
window.deferredPwaPrompt = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
            .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPwaPrompt = e;
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => btn.classList.remove('hidden'));
});

window.addEventListener('appinstalled', () => {
    window.deferredPwaPrompt = null;
    showToast(i18n('pwa.installed'), 'success');
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => btn.classList.add('hidden'));
});

function installPwaApp() {
    if (!window.deferredPwaPrompt) {
        showToast(i18n('pwa.install'), 'info');
        return;
    }
    window.deferredPwaPrompt.prompt();
    window.deferredPwaPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] User accepted install prompt');
        }
        window.deferredPwaPrompt = null;
    });
}
window.installPwaApp = installPwaApp;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    syncAppVersion();
    loadRecentHistory();
    loadProfileFriendsClubs();

    const savedTab = localStorage.getItem('activeTab') || 'profile';
    openTab(savedTab);

    if (typeof applyTranslations === 'function') applyTranslations();
    if (typeof updateLanguageButton === 'function') updateLanguageButton();

    document.querySelectorAll('.shiki-grid').forEach(async (grid) => {
        const type = grid.dataset.type;
        const ids = grid.dataset.ids;
        if (!ids) return;

        try {
            const res = await fetch(`/api/grid-data?type=${type}&ids=${ids}`);
            const items = await res.json();
            if (!Array.isArray(items)) return;

            grid.innerHTML = items.map(item => {
                const title = item.russian || item.name || '';
                const imgUrl = buildImgUrl(item.image);
                const itemUrl = item.url ? `https://shikimori.io${item.url}` : `https://shikimori.io/${type}/${item.id}`;
                return `
                    <a href="${itemUrl}" target="_blank" class="shiki-grid-item" title="${title}">
                        <img src="${imgUrl}" alt="${title}" loading="lazy">
                        <div class="item-title">${title}</div>
                    </a>`;
            }).join('');
        } catch (err) {
            console.error('Ошибка загрузки сетки:', err);
        }
    });
});