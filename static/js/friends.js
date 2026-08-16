function renderFriends(data) {
    if (typeof openFriendModal === 'function') {
        const container = document.getElementById('friends');
        if (!container) return;
        const friends = data.friends || [], clubs = data.clubs || [];

        const buildGrid = (items, isUser = true) => {
            if (!items.length) return '<p style="color: var(--text-muted);">' + i18n('friends.empty') + '</p>';
            return `<div class="media-grid">` + items.map(item => {
                const name = item.nickname || item.name || '';
                const img = typeof buildImgUrl === 'function' ? buildImgUrl(isUser ? (item.avatar || item.image) : (item.logo || item.image)) : (item.avatar || item.image || '');
                const onclickAttr = isUser ? `onclick="event.preventDefault(); openFriendModal('${name}');"` : `onclick="event.preventDefault(); openClubModal(${item.id});"`;
                const url = isUser ? `https://shikimori.io/${name}` : `https://shikimori.io/clubs/${item.id}`;

                return `
                    <a href="${url}" class="media-item" title="${name}" ${onclickAttr}>
                        <img src="${img}" alt="${name}" loading="lazy" class="${isUser ? 'friend-grid-avatar' : 'club-grid-logo'}">
                        <div class="media-title">${name}</div>
                    </a>`;
            }).join('') + `</div>`;
        };

        container.innerHTML = `
            <div class="card media-section">
                <div class="friends-view-header">
                    <h3><i class="ti ti-users"></i> ${i18n('friends.friends')} (${friends.length})</h3>
                </div>
                ${buildGrid(friends, true)}
            </div>

            <div class="card media-section" style="margin-top: 20px;">
                <div class="friends-view-header">
                    <h3><i class="ti ti-building-community"></i> ${i18n('friends.clubs')} (${clubs.length})</h3>
                </div>
                ${buildGrid(clubs, false)}
            </div>
        `;
    }
}