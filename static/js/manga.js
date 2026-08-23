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

function renderMangaUserRateWidget(manga) {
    const rate = manga.user_rate;
    const currentStatus = rate ? rate.status : '';
    const currentChapters = rate ? (rate.chapters || 0) : 0;
    const currentVolumes = rate ? (rate.volumes || 0) : 0;
    const currentScore = rate ? (rate.score || 0) : 0;
    const currentText = rate ? (rate.text || '') : '';
    const rateId = rate ? rate.id : '';
    const totalChapters = manga.chapters || 0;

    const statusMap = typeof getStatusMap === 'function' ? getStatusMap() : {};

    return `
        <div class="user-rate-widget-card" id="user-rate-widget-${manga.id}">
            <div class="user-rate-widget-header">
                <h4><i class="ti ti-bookmark"></i> ${i18n('mylist.title')}</h4>
                ${currentStatus ? `<span class="badge badge-${currentStatus}">${statusMap[currentStatus] ? statusMap[currentStatus].manga : currentStatus}</span>` : `<span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-muted);">${i18n('mylist.not_in_list')}</span>`}
            </div>
            <div class="user-rate-widget-body">
                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.status')}</label>
                    <select id="rate-status-select-${manga.id}" class="sort-select user-rate-select">
                        <option value="watching" ${currentStatus === 'watching' ? 'selected' : ''}>${i18n('rates.watching')}</option>
                        <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>${i18n('rates.completed')}</option>
                        <option value="planned" ${currentStatus === 'planned' ? 'selected' : (!currentStatus ? 'selected' : '')}>${i18n('rates.planned')}</option>
                        <option value="on_hold" ${currentStatus === 'on_hold' ? 'selected' : ''}>${i18n('rates.on_hold')}</option>
                        <option value="dropped" ${currentStatus === 'dropped' ? 'selected' : ''}>${i18n('rates.dropped')}</option>
                        <option value="rewatching" ${currentStatus === 'rewatching' ? 'selected' : ''}>${i18n('rates.rewatching')}</option>
                    </select>
                </div>

                <div class="user-rate-row">
                    <label class="user-rate-label">${i18n('mylist.chapters')}</label>
                    <div class="episode-stepper">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${manga.id}', -1)"><i class="ti ti-minus"></i></button>
                        <input type="number" id="rate-episodes-input-${manga.id}" class="stepper-input" min="0" max="${totalChapters || 9999}" value="${currentChapters}">
                        <button type="button" class="stepper-btn" onclick="stepRateCounter('${manga.id}', 1, ${totalChapters || 0})"><i class="ti ti-plus"></i></button>
                        ${totalChapters ? `<span class="stepper-total">/ ${totalChapters}</span>` : ''}
                    </div>
                </div>

                <div class="user-rate-row user-rate-score-row">
                    <label class="user-rate-label">${i18n('mylist.score')}</label>
                    <div class="stars-rating-container" id="stars-container-${manga.id}" data-score="${currentScore}">
                        ${[1,2,3,4,5,6,7,8,9,10].map(s => `
                            <button type="button" class="star-btn ${s <= currentScore ? 'active' : ''}" data-star="${s}" onclick="setUserRateScore('${manga.id}', ${s})" onmouseenter="previewUserRateScore('${manga.id}', ${s})" onmouseleave="resetPreviewUserRateScore('${manga.id}')" title="${s}/10">
                                <i class="ti ti-star-filled"></i>
                            </button>
                        `).join('')}
                        <span class="score-display-text" id="score-text-${manga.id}">${currentScore ? `${currentScore}/10` : '—'}</span>
                    </div>
                </div>

                <div class="user-rate-row" style="flex-direction: column; align-items: stretch; gap: 6px;">
                    <label class="user-rate-label">${i18n('mylist.note')}</label>
                    <textarea id="rate-note-input-${manga.id}" class="user-rate-textarea" placeholder="${i18n('mylist.note_placeholder')}" rows="2">${currentText}</textarea>
                </div>

                <div class="user-rate-actions">
                    <button type="button" class="btn btn-save-rate" onclick="submitUserRate('${manga.id}', 'Manga', ${rateId ? `'${rateId}'` : 'null'}, ${totalChapters || 0})">
                        <i class="ti ti-check"></i> <span>${i18n('mylist.save')}</span>
                    </button>
                    ${rateId ? `
                        <button type="button" class="btn-secondary btn-delete-rate" onclick="deleteUserRateAction('${manga.id}', 'Manga', '${rateId}')">
                            <i class="ti ti-trash"></i> <span>${i18n('mylist.delete')}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderMangaDetail(manga) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const poster = manga.image || '';
    const genres = (manga.genres || []).join(', ') || '—';
    const publishers = (manga.publishers || []).join(', ') || '—';

    const userRateWidgetHTML = renderMangaUserRateWidget(manga);

    body.innerHTML = `
        <div class="anime-detail-container manga-modal-container">
            <!-- Top Hero Section: Poster on Left, Title + Information Box on Right -->
            <div class="anime-hero-section">
                <!-- Left: Poster + Actions + My List -->
                <div class="anime-hero-left">
                    <div class="anime-poster-wrapper manga-poster-wrapper">
                        ${poster ? `<img src="${poster}" alt="${manga.russian}" class="anime-poster manga-poster-img" decoding="async">` : `<div class="anime-poster placeholder manga-poster-placeholder"><i class="ti ti-book"></i></div>`}
                        ${manga.score ? `<div class="anime-score-badge"><i class="ti ti-star-filled"></i> ${manga.score}</div>` : ''}
                    </div>

                    <div class="anime-actions-panel">
                        ${manga.shikimori_url ? `
                            <a href="${manga.shikimori_url}" target="_blank" data-external="true" class="btn-secondary btn-shiki-link">
                                <i class="ti ti-external-link"></i> <span>${i18n('anime.open_shikimori')}</span>
                            </a>
                        ` : ''}
                    </div>

                    ${userRateWidgetHTML}
                </div>

                <!-- Right: Title + Information Box -->
                <div class="anime-hero-right">
                    <div class="anime-header-titles">
                        <h2 class="anime-title">${manga.russian}</h2>
                        ${manga.name !== manga.russian ? `<div class="anime-orig-title">${manga.name}</div>` : ''}
                    </div>

                    <!-- Metadata Card: Beside poster -->
                    <div class="anime-meta-details-card">
                        <h4><i class="ti ti-info-circle"></i> ${i18n('profile.info')}</h4>
                        <div class="anime-info-grid">
                            <div class="info-item"><span class="label">${i18n('manga.type')}</span> <span>${manga.kind || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.status')}</span> <span>${manga.status || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.volumes')}</span> <span>${manga.volumes || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.chapters')}</span> <span>${manga.chapters || '—'}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.publisher')}</span> <span>${publishers}</span></div>
                            <div class="info-item"><span class="label">${i18n('manga.aired')}</span> <span>${manga.aired_on || '—'}</span></div>
                            <div class="info-item info-full-row"><span class="label">${i18n('manga.genres')}</span> <span>${genres}</span></div>
                        </div>
                    </div>

                    <!-- Description (Directly Below Information Card!) -->
                    <div class="anime-description-section manga-description-section">
                        <h3><i class="ti ti-file-text"></i> ${i18n('anime.description')}</h3>
                        <div class="anime-description-content">${manga.description}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}



