/* Настройки сайта: фон (цвет или фото), видимость разделов и вид навигации */

const BG_SETTINGS_KEY = 'app_bg_settings';
const SECTION_VISIBILITY_KEY = 'app_section_visibility';
const NAVBAR_VIEW_KEY = 'app_navbar_view';
const DEFAULT_NAVBAR_VIEW = 'full';
let currentBgMode = 'color';
let uploadedImageDataUrl = '';
let isAuthenticated = false;

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
            const data = await res.json();
            isAuthenticated = data.authenticated || false;
        }
    } catch (err) {
        console.error('Ошибка проверки авторизации:', err);
        isAuthenticated = false;
    }
    return isAuthenticated;
}

async function loadSettingsFromServer() {
    if (!isAuthenticated) return null;
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Ошибка загрузки настроек с сервера:', err);
    }
    return null;
}

async function saveSettingsToServer(settings) {
    if (!isAuthenticated) return false;
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        return res.ok;
    } catch (err) {
        console.error('Ошибка сохранения настроек на сервере:', err);
        return false;
    }
}

function getSavedBgSettings() {
    try {
        const raw = localStorage.getItem(BG_SETTINGS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error('Ошибка чтения настроек фона:', err);
        return null;
    }
}

function saveBgSettings(settings) {
    try {
        localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
        console.error('Ошибка сохранения настроек фона:', err);
    }
    // Also save to server if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ background: settings });
    }
}

function applyBgToPage(settings) {
    if (!settings || settings.mode === 'theme') {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundColor = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundAttachment = '';
        document.body.style.backgroundPosition = '';
        return;
    }

    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';

    if (settings.mode === 'image' && settings.image) {
        document.body.style.backgroundImage = `url("${settings.image}")`;
        document.body.style.backgroundColor = '';
    } else if (settings.mode === 'color' && settings.color) {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundColor = settings.color;
    }
}

async function applySavedBg() {
    let bgSettings = null;
    if (isAuthenticated) {
        const serverSettings = await loadSettingsFromServer();
        if (serverSettings && serverSettings.background) {
            bgSettings = serverSettings.background;
            // Cache in localStorage for offline use
            saveBgSettings(bgSettings);
        }
    }
    if (!bgSettings) {
        bgSettings = getSavedBgSettings();
    }
    applyBgToPage(bgSettings);
}

function setBgMode(mode) {
    currentBgMode = mode;
    const colorPanel = document.getElementById('bg-color-panel');
    const imagePanel = document.getElementById('bg-image-panel');
    const colorBtn = document.getElementById('bg-mode-color-btn');
    const imageBtn = document.getElementById('bg-mode-image-btn');

    if (colorPanel) colorPanel.classList.toggle('hidden', mode !== 'color');
    if (imagePanel) imagePanel.classList.toggle('hidden', mode !== 'image');
    if (colorBtn) colorBtn.classList.toggle('active', mode === 'color');
    if (imageBtn) imageBtn.classList.toggle('active', mode === 'image');
}

function onBgColorChange(value) {
    const valueEl = document.getElementById('bg-color-value');
    if (valueEl) valueEl.innerText = value || '#2b133d';
    const settings = { mode: 'color', color: value, image: '' };
    saveBgSettings(settings);
    applyBgToPage(settings);
}

function onBgImageUrlChange(value) {
    const url = value.trim();
    if (!url) return;
    uploadedImageDataUrl = '';
    const settings = { mode: 'image', color: '', image: url };
    saveBgSettings(settings);
    applyBgToPage(settings);
}

function onBgImageFileChange(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedImageDataUrl = e.target.result;
        const urlInput = document.getElementById('bg-image-url');
        if (urlInput) urlInput.value = '';
        const settings = { mode: 'image', color: '', image: uploadedImageDataUrl };
        saveBgSettings(settings);
        applyBgToPage(settings);
    };
    reader.readAsDataURL(file);
}

function resetBackgroundSettings() {
    uploadedImageDataUrl = '';
    localStorage.removeItem(BG_SETTINGS_KEY);

    const colorInput = document.getElementById('bg-color-input');
    if (colorInput) {
        colorInput.value = colorInput.dataset.default || '#2b133d';
        const valueEl = document.getElementById('bg-color-value');
        if (valueEl) valueEl.innerText = colorInput.value;
    }
    const urlInput = document.getElementById('bg-image-url');
    if (urlInput) urlInput.value = '';
    const fileInput = document.getElementById('bg-image-file');
    if (fileInput) fileInput.value = '';

    // Reset on server too if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ background: { mode: 'theme', color: '', image: '' } });
    }

    applyBgToPage(null);
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const colorInput = document.getElementById('bg-color-input');
    if (colorInput && !colorInput.dataset.default) {
        colorInput.dataset.default = colorInput.value;
    }

    const saved = getSavedBgSettings();
    if (saved && saved.mode === 'image' && saved.image) {
        setBgMode('image');
        if (saved.image.startsWith('data:')) {
            uploadedImageDataUrl = saved.image;
        } else {
            const urlInput = document.getElementById('bg-image-url');
            if (urlInput) urlInput.value = saved.image;
        }
    } else if (saved && saved.mode === 'color' && saved.color) {
        if (colorInput) colorInput.value = saved.color;
        const valueEl = document.getElementById('bg-color-value');
        if (valueEl) valueEl.innerText = saved.color;
        setBgMode('color');
    } else {
        setBgMode('color');
    }

    loadSectionVisibilityToggles();
    applyNavbarView(getSavedNavbarView());
}

function closeSettingsModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close-btn') && !event.target.parentElement.classList.contains('modal-close-btn')) return;
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
}

/* ---- Видимость разделов ---- */

function getSectionVisibility() {
    try {
        const raw = localStorage.getItem(SECTION_VISIBILITY_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.error('Ошибка чтения настроек видимости разделов:', err);
        return {};
    }
}

function saveSectionVisibility(visibility) {
    try {
        localStorage.setItem(SECTION_VISIBILITY_KEY, JSON.stringify(visibility));
    } catch (err) {
        console.error('Ошибка сохранения настроек видимости разделов:', err);
    }
    // Also save to server if authenticated
    if (isAuthenticated) {
        saveSettingsToServer({ section_visibility: visibility });
    }
}

function onSectionToggle(checkbox) {
    const section = checkbox.dataset.section;
    if (!section) return;

    const visibility = getSectionVisibility();
    visibility[section] = checkbox.checked;
    saveSectionVisibility(visibility);
    applySectionVisibility();
}

function applySectionVisibility() {
    const visibility = getSectionVisibility();
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(el => {
        const section = el.dataset.section;
        if (section && visibility.hasOwnProperty(section)) {
            el.classList.toggle('section-hidden', !visibility[section]);
        }
    });
}

function loadSectionVisibilityToggles() {
    const visibility = getSectionVisibility();
    const toggles = document.querySelectorAll('.settings-toggle input[type="checkbox"][data-section]');
    toggles.forEach(toggle => {
        const section = toggle.dataset.section;
        if (section && visibility.hasOwnProperty(section)) {
            toggle.checked = visibility[section];
        }
    });
}

/* ---- Вид навигации ---- */

function getSavedNavbarView() {
    try {
        const raw = localStorage.getItem(NAVBAR_VIEW_KEY);
        return raw ? raw : DEFAULT_NAVBAR_VIEW;
    } catch (err) {
        console.error('Ошибка чтения настроек вида навигации:', err);
        return DEFAULT_NAVBAR_VIEW;
    }
}

function saveNavbarView(view) {
    try {
        localStorage.setItem(NAVBAR_VIEW_KEY, view);
    } catch (err) {
        console.error('Ошибка сохранения настроек вида навигации:', err);
    }
    if (isAuthenticated) {
        saveSettingsToServer({ navbar_view: view });
    }
}

function applyNavbarView(view) {
    const header = document.querySelector('.app-header');
    if (!header) return;

    header.classList.remove('navbar-view-full', 'navbar-view-icons', 'navbar-view-titles');
    if (view && view !== DEFAULT_NAVBAR_VIEW) {
        header.classList.add(`navbar-view-${view}`);
    }

    const options = document.querySelectorAll('.navbar-view-option');
    options.forEach(opt => {
        const optView = opt.dataset.navbarView;
        opt.classList.toggle('active', optView === view);
    });
}

function setNavbarView(view) {
    if (!view) return;
    saveNavbarView(view);
    applyNavbarView(view);
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    await applySavedBg();
    applySectionVisibility();
    applyNavbarView(getSavedNavbarView());
});
