// ==================== FRIEND & USER MODAL HANDLERS ====================

async function openFriendModal(userIdOrNick) {
    const modal = document.getElementById('anime-modal');
    const body = document.getElementById('anime-modal-body');
    if (!modal || !body) return;

    if (!modal.classList.contains('hidden') && body.innerHTML.trim() && !body.querySelector('.anime-modal-loader')) {
        if (typeof pushModalState === 'function') pushModalState();
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="anime-modal-loader"><i class="ti ti-loader animate-spin"></i> ' + i18n('friends.load_error') + '</div>';

    try {
        const res = await fetch(`/api/friend/${encodeURIComponent(userIdOrNick)}`);
        if (!res.ok) throw new Error(i18n('friends.load_error'));
        const user = await res.json();
        renderFriendDetail(user);
    } catch (err) {
        body.innerHTML = `<div class="anime-error"><i class="ti ti-alert-circle"></i> ${i18n('friends.load_error')}: ${err.message}</div>`;
    }
}

// Алиас для обратной совместимости
function openUserModal(userIdOrNick) {
    return openFriendModal(userIdOrNick);
}

function renderFriendDetail(user) {
    const body = document.getElementById('anime-modal-body');
    if (!body) return;

    const avatar = user.image || '';
    const isOnline = user.last_online_at && user.last_online_at.includes(new Date().toISOString().slice(0, 10));

    body.innerHTML = `
        <div class="mobile-anime-top-bar" id="mobile-anime-top-bar">
            <button type="button" class="mobile-anime-top-btn" onclick="handleModalBack()" title="Назад">
                <i class="ti ti-arrow-left"></i>
            </button>
            <div class="mobile-anime-top-title" id="mobile-anime-top-title">${user.name || user.nickname}</div>
            <div style="width: 38px;"></div>
        </div>

        <div class="anime-detail-container friend-modal-container" style="padding-top: 64px;">
            <div class="anime-detail-header friend-detail-header">
                <div class="anime-poster-wrapper friend-avatar-wrapper">
                    ${avatar ? `<img src="${avatar}" alt="${user.nickname}" class="friend-avatar-img">` : `<div class="friend-avatar-placeholder"><i class="ti ti-user"></i></div>`}
                    <div class="friend-online-badge ${isOnline ? 'online' : ''}" title="${isOnline ? i18n('friends.online_today') : i18n('friends.last_online') + ' ' + (user.last_online_at || '—')}">
                        <i class="ti ti-circle-filled"></i>
                    </div>
                </div>

                <div class="anime-main-info friend-main-info">
                    <h2 class="anime-title friend-title">${user.name}</h2>
                    <div class="anime-orig-title friend-nickname">@${user.nickname}</div>

                    <div class="anime-info-grid friend-info-grid">
                        <div class="info-item"><span class="label">${i18n('friends.id')}</span> <span>#${user.id}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.sex')}</span> <span>${user.sex || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.age')}</span> <span>${user.age || '—'}</span></div>
                        <div class="info-item"><span class="label">${i18n('friends.last_online')}</span> <span>${user.last_online_at || '—'}</span></div>
                    </div>

                    <div class="friend-stats-summary">
                        <div class="friend-stat-box">
                            <div class="stat-box-title"><i class="ti ti-movie"></i> ${i18n('friends.anime')}</div>
                            <div class="stat-box-values">
                                <span>${i18n('friends.watched')} <b>${user.completed_anime || 0}</b></span>
                                <span>${i18n('friends.watching')} <b>${user.watching_anime || 0}</b></span>
                            </div>
                        </div>
                        <div class="friend-stat-box">
                            <div class="stat-box-title"><i class="ti ti-book"></i> ${i18n('friends.manga')}</div>
                            <div class="stat-box-values">
                                <span>${i18n('friends.read')} <b>${user.completed_manga || 0}</b></span>
                                <span>${i18n('friends.reading')} <b>${user.reading_manga || 0}</b></span>
                            </div>
                        </div>
                    </div>

                    <div class="anime-actions friend-actions">
                        ${user.shikimori_url ? `
                            <a href="${user.shikimori_url}" target="_blank" data-external="true" class="btn-secondary">
                                <i class="ti ti-brand-shikimori"></i> ${i18n('friends.open_shikimori')}
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="anime-description-section friend-about-section">
                <h3><i class="ti ti-id"></i> ${i18n('friends.about')}</h3>
                <div class="anime-description-content">${user.about || i18n('friends.about_empty')}</div>
            </div>
        </div>
    `;
}
