function renderFavourites(data) {
    const container = document.getElementById('favourites');
    const chars = data.characters || [], animes = data.animes || [], mangas = data.mangas || [];

    const buildGrid = (items, type) => {
        if (!items.length) return '<p style="color: var(--text-muted);">' + i18n('favourites.empty') + '</p>';
        return `<div class="media-grid">` + items.map(item => {
            const title = item.russian || item.name || '';
            const img = buildImgUrl(item.image);
            const url = item.url ? (item.url.startsWith('http') ? item.url : 'https://shikimori.io' + item.url) : `https://shikimori.io/${type}/${item.id}`;
            return `
                <a href="${url}" target="_blank" class="media-item" title="${title}">
                    <img src="${img}" alt="${title}" loading="lazy">
                    <div class="media-title">${title}</div>
                </a>`;
        }).join('') + `</div>`;
    };

    container.innerHTML = `
        <div class="card media-section">
            <h3><i class="ti ti-user-star"></i> ${i18n('favourites.characters')} (${chars.length})</h3>
            ${buildGrid(chars, 'characters')}
        </div>
        <div class="card media-section">
            <h3><i class="ti ti-movie"></i> ${i18n('favourites.animes')} (${animes.length})</h3>
            ${buildGrid(animes, 'animes')}
        </div>
        ${mangas.length ? `<div class="card media-section">
            <h3><i class="ti ti-book"></i> ${i18n('favourites.mangas')} (${mangas.length})</h3>
            ${buildGrid(mangas, 'mangas')}
        </div>` : ''}
    `;
}
