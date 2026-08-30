// ==================== MANGA MODAL & DETAILS ====================

async function openMangaModal(mangaId) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    if (!modal.classList.contains('hidden') && body.innerHTML.trim() && !body.querySelector('.anime-modal-loader')) {
        if (typeof pushModalState === 'function') pushModalState();
    }

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
                    <div class="user-rate-score-header">
                        <label class="user-rate-label">${i18n('mylist.score')}</label>
                        <span class="score-display-text" id="score-text-${manga.id}">${currentScore ? `${currentScore}/10` : '—'}</span>
                    </div>
                    <div class="stars-rating-container" id="stars-container-${manga.id}" data-score="${currentScore}">
                        ${[1,2,3,4,5,6,7,8,9,10].map(s => `
                            <button type="button" class="star-btn ${s <= currentScore ? 'active' : ''}" data-star="${s}" onclick="setUserRateScore('${manga.id}', ${s})" onmouseenter="previewUserRateScore('${manga.id}', ${s})" onmouseleave="resetPreviewUserRateScore('${manga.id}')" title="${s}/10">
                                <i class="ti ti-star-filled"></i>
                            </button>
                        `).join('')}
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

function renderMangaStarsHTML(score) {
    const num = parseFloat(score);
    if (!num || isNaN(num)) return '<span class="manga-stars-empty">☆☆☆☆☆</span>';
    const rating5 = num / 2;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (rating5 >= i) {
            stars += '<i class="ti ti-star-filled star-gold"></i>';
        } else if (rating5 >= i - 0.5) {
            stars += '<i class="ti ti-star-half-filled star-gold"></i>';
        } else {
            stars += '<i class="ti ti-star star-empty"></i>';
        }
    }
    return stars;
}
window.renderMangaStarsHTML = renderMangaStarsHTML;

window.toggleMangaRateWidget = function(mangaId) {
    const el = document.getElementById(`manga-rate-widget-collapse-${mangaId}`);
    if (el) el.classList.toggle('hidden');
};

window.toggleMangaDesc = function(mangaId, btn) {
    const el = document.getElementById(`manga-desc-${mangaId}`);
    if (!el) return;
    if (el.classList.contains('collapsed')) {
        el.classList.remove('collapsed');
        btn.textContent = 'Свернуть';
    } else {
        el.classList.add('collapsed');
        btn.textContent = 'Развернуть';
    }
};

function renderMangaDetail(manga) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const poster = manga.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(manga.image) : manga.image) : '';
    const title = manga.russian || manga.name || '';
    const origTitle = (manga.name && manga.name !== manga.russian) ? manga.name : '';
    const scoreVal = manga.score || '';
    const descText = manga.description || '';
    const isLongDesc = descText.length > 220;

    // Rates statuses stats for "В списках"
    const statsList = Array.isArray(manga.rates_statuses_stats) ? manga.rates_statuses_stats : [];
    let plannedCount = 0, completedCount = 0, readingCount = 0, droppedCount = 0, onHoldCount = 0;
    statsList.forEach(st => {
        const name = (st.name || '').toLowerCase();
        const val = parseInt(st.value, 10) || 0;
        if (name.includes('план')) plannedCount = val;
        else if (name.includes('прочит')) completedCount = val;
        else if (name.includes('чит')) readingCount = val;
        else if (name.includes('брош')) droppedCount = val;
        else if (name.includes('отлож')) onHoldCount = val;
    });
    const totalInLists = plannedCount + completedCount + readingCount + droppedCount + onHoldCount;

    // User rate info
    const rate = manga.user_rate;
    const currentStatus = rate ? rate.status : '';
    const statusMap = typeof getStatusMap === 'function' ? getStatusMap() : {};
    const statusText = currentStatus ? (statusMap[currentStatus] ? statusMap[currentStatus].manga : currentStatus) : 'Добавить в список';

    const characters = manga.characters || [];
    const related = manga.related || [];

    const userRateWidgetHTML = renderMangaUserRateWidget(manga);

    body.innerHTML = `
        <div class="manga-view-top-bar">
            <button type="button" class="manga-view-nav-btn" onclick="handleModalBack()" title="Назад">
                <i class="ti ti-arrow-left"></i>
            </button>
            <div class="manga-view-nav-title" id="manga-view-nav-title">${title}</div>
            <button type="button" class="manga-view-nav-btn" onclick="copyCharacterLink('${manga.shikimori_url || ('https://shikimori.io/mangas/' + manga.id)}')" title="Поделиться">
                <i class="ti ti-share"></i>
            </button>
        </div>

        <div class="manga-view-container">
            <!-- 1. Centered Hero Poster -->
            <div class="manga-hero-section">
                <div class="manga-hero-poster-wrap">
                    ${poster ? `<img src="${poster}" alt="${title}" class="manga-hero-poster">` : `<div class="manga-hero-poster placeholder"><i class="ti ti-book"></i></div>`}
                </div>
            </div>

            <!-- 2. Action buttons row -->
            <div class="manga-actions-scroll">
                <button type="button" class="manga-action-btn ${currentStatus ? 'active' : ''}" onclick="toggleMangaRateWidget('${manga.id}')">
                    <i class="ti ti-bookmark"></i>
                    <span>${statusText}</span>
                </button>
                ${manga.shikimori_url ? `
                    <a href="${manga.shikimori_url}#comments" target="_blank" class="manga-action-btn">
                        <i class="ti ti-message"></i>
                        <span>Обсуждение</span>
                    </a>
                ` : ''}
                ${manga.shikimori_url ? `
                    <a href="${manga.shikimori_url}" target="_blank" class="manga-action-btn">
                        <i class="ti ti-external-link"></i>
                        <span>Shikimori</span>
                    </a>
                ` : ''}
            </div>

            <!-- Expandable User Rate Widget Card -->
            <div id="manga-rate-widget-collapse-${manga.id}" class="manga-rate-collapse hidden">
                ${userRateWidgetHTML}
            </div>

            <!-- 3. Title & Rating -->
            <div class="manga-header-info">
                <h1 class="manga-title-main">${title}</h1>
                ${origTitle ? `<div class="manga-title-sub">${origTitle}</div>` : ''}
                <div class="manga-score-row">
                    <div class="manga-stars">${renderMangaStarsHTML(scoreVal)}</div>
                    <span class="manga-score-number">${scoreVal ? scoreVal : '—'}</span>
                </div>
            </div>

            <!-- 4. Metadata Info Grid (2 cols) -->
            <div class="manga-meta-grid">
                <div class="manga-meta-col">
                    <span class="manga-meta-label">Тип</span>
                    <span class="manga-meta-val">${manga.type_and_status || (manga.kind + ' • ' + (manga.status || 'Онгоинг'))}</span>
                </div>
                <div class="manga-meta-col">
                    <span class="manga-meta-label">Выходит</span>
                    <span class="manga-meta-val">${manga.aired_on_formatted || '—'}</span>
                </div>
            </div>

            <!-- 5. Genres / Publishers -->
            <div class="manga-genres-scroll">
                ${(manga.genres || []).map(g => `<span class="manga-genre-pill">${g}</span>`).join('')}
                ${(manga.publishers || []).map(p => `<span class="manga-genre-pill publisher">${p}</span>`).join('')}
            </div>

            <!-- 6. Description -->
            ${descText ? `
                <div class="manga-desc-section">
                    <div class="manga-desc-text ${isLongDesc ? 'collapsed' : ''}" id="manga-desc-${manga.id}">
                        ${descText}
                    </div>
                    ${isLongDesc ? `<div class="manga-desc-toggle" onclick="toggleMangaDesc('${manga.id}', this)">Развернуть</div>` : ''}
                </div>
            ` : ''}

            <!-- 7. В списках -->
            ${totalInLists > 0 ? `
                <div class="manga-section">
                    <div class="manga-section-header">
                        <div class="manga-section-title">В списках</div>
                        <div class="manga-section-meta">Всего: ${totalInLists.toLocaleString()}</div>
                    </div>
                    <div class="manga-in-lists-bar">
                        <div class="bar-seg seg-planned" style="flex: ${plannedCount || 0.01};" title="Запланировано: ${plannedCount}"></div>
                        <div class="bar-seg seg-completed" style="flex: ${completedCount || 0.01};" title="Прочитано: ${completedCount}"></div>
                        <div class="bar-seg seg-watching" style="flex: ${readingCount || 0.01};" title="Читаю: ${readingCount}"></div>
                        <div class="bar-seg seg-dropped" style="flex: ${droppedCount || 0.01};" title="Брошено: ${droppedCount}"></div>
                        <div class="bar-seg seg-onhold" style="flex: ${onHoldCount || 0.01};" title="Отложено: ${onHoldCount}"></div>
                    </div>
                    <div class="manga-in-lists-legend">
                        <div class="legend-item"><span class="dot dot-planned"></span> <span class="label">Запланировано:</span> <span class="val">${plannedCount.toLocaleString()}</span></div>
                        <div class="legend-item"><span class="dot dot-completed"></span> <span class="label">Прочитано:</span> <span class="val">${completedCount.toLocaleString()}</span></div>
                        <div class="legend-item"><span class="dot dot-watching"></span> <span class="label">Читаю:</span> <span class="val">${readingCount.toLocaleString()}</span></div>
                        <div class="legend-item"><span class="dot dot-dropped"></span> <span class="label">Брошено:</span> <span class="val">${droppedCount.toLocaleString()}</span></div>
                        <div class="legend-item"><span class="dot dot-onhold"></span> <span class="label">Отложено:</span> <span class="val">${onHoldCount.toLocaleString()}</span></div>
                    </div>
                </div>
            ` : ''}

            <!-- 8. Персонажи -->
            ${characters.length > 0 ? `
                <div class="manga-section">
                    <div class="manga-section-header">
                        <div class="manga-section-title">
                            Персонажи <span class="manga-count-pill">${manga.characters_total || characters.length}</span>
                        </div>
                        <i class="ti ti-chevron-right section-chevron"></i>
                    </div>
                    <div class="manga-characters-scroll">
                        ${characters.map(c => {
                            const cImg = c.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(c.image) : c.image) : '';
                            return `
                                <div class="manga-character-card" onclick="openCharacterModal(${c.id})">
                                    <div class="manga-character-avatar-wrap">
                                        ${cImg ? `<img src="${cImg}" alt="${c.name}" class="manga-character-avatar" loading="lazy">` : `<div class="manga-character-avatar placeholder"><i class="ti ti-user"></i></div>`}
                                    </div>
                                    <div class="manga-character-name" title="${c.name}">${c.name}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 9. Связанное -->
            ${related.length > 0 ? `
                <div class="manga-section">
                    <div class="manga-section-header">
                        <div class="manga-section-title">
                            Связанное (${manga.related_total || related.length})
                        </div>
                        <i class="ti ti-chevron-right section-chevron"></i>
                    </div>
                    <div class="manga-related-list">
                        ${related.map(r => {
                            const clickFn = r.is_anime ? `openAnimeModal(${r.id})` : `openMangaModal(${r.id})`;
                            const rImg = r.image ? (typeof buildImgUrl === 'function' ? buildImgUrl(r.image) : r.image) : '';
                            return `
                                <div class="manga-related-item" onclick="${clickFn}">
                                    <div class="manga-related-thumb-wrap">
                                        ${rImg ? `<img src="${rImg}" alt="${r.name}" class="manga-related-thumb" loading="lazy">` : `<div class="manga-related-thumb placeholder"><i class="ti ti-book"></i></div>`}
                                    </div>
                                    <div class="manga-related-info">
                                        <div class="manga-related-title">${r.name}</div>
                                        <div class="manga-related-meta">${r.meta_text || r.relation || ''}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}



