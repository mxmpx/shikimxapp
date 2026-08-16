// ==================== MANGA MODAL & DETAILS ====================

async function openMangaModal(mangaId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('manga.loading') + '</div>';

    try {
        const res = await fetch(`/api/manga/${mangaId}`);
        if (!res.ok) throw new Error(i18n('manga.load_error'));
        const manga = await res.json();
        renderMangaDetail(manga);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('manga.load_error')}: ${err.message}</div>`;
    }
}

function renderMangaDetail(manga) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const poster = manga.image || '';
    const genres = (manga.genres || []).join(', ') || '—';
    const publishers = (manga.publishers || []).join(', ') || '—';

    let userProgressHtml = '';
    if (manga.user_rate) {
        const ch = manga.user_rate.chapters || 0;
        const vol = manga.user_rate.volumes || 0;
        userProgressHtml = `
            <div class="info-item manga-user-rate-item">
                <span class="label">${i18n('anime.my_progress')}</span>
                <span class="badge badge-watching">${i18n('manga.chapters')}: ${ch}${manga.chapters ? ' / ' + manga.chapters : ''}, ${i18n('manga.volumes')}: ${vol}${manga.volumes ? ' / ' + manga.volumes : ''}</span>
            </div>
        `;
    }

    body.innerHTML = `
        <div class="anime-detail-container manga-modal-container">
            <div class="anime-detail-header manga-detail-header">
                <div class="anime-poster-wrapper manga-poster-wrapper">
                    ${poster ? `<img src="${poster}" alt="${manga.russian}" class="anime-poster manga-poster-img">` : `<div class="anime-poster placeholder manga-poster-placeholder"><i class="ti ti-book"></i></div>`}
                    ${manga.score ? `<div class="anime-score-badge"><i class="ti ti-star-filled"></i> ${manga.score}</div>` : ''}
                </div>

                <div class="anime-main-info manga-main-info">
                    <h2 class="anime-title manga-title">${manga.russian}</h2>
                    ${manga.name !== manga.russian ? `<div class="anime-orig-title manga-orig-title">${manga.name}</div>` : ''}

                    <div class="anime-info-grid manga-info-grid">
                        <div class="info-item"><span class="label">${i18n('manga.type')}</span> <span>${manga.kind || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('manga.status')}</span> <span>${manga.status || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('manga.volumes')}</span> <span>${manga.volumes || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('manga.chapters')}</span> <span>${manga.chapters || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('manga.publisher')}</span> <span>${publishers}</span></div>
                        <div class="info-item"><span class="label">${i18n('manga.aired')}</span> <span>${manga.aired_on || '—'}</span></div>
                        <div class="info-item" style="grid-column: span 2;"><span class="label">${i18n('manga.genres')}</span> <span>${genres}</span></div>
                        ${userProgressHtml}
                    </div>

                    <div class="anime-actions manga-actions">
                        ${manga.shikimori_url ? `
                            <a href="${manga.shikimori_url}" target="_blank" data-external="true" class="btn-secondary">
                                <i class="ti ti-external-link"></i> ${i18n('anime.open_shikimori')}
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="anime-description-section manga-description-section">
                <h3><i class="ti ti-file-text"></i> ${i18n('anime.description')}</h3>
                <div class="anime-description-content">${manga.description}</div>
            </div>
        </div>
    `;
}
