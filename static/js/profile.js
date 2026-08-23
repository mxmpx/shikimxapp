function toggleAbout() {
    const container = document.getElementById('about-container');
    const btn = document.getElementById('toggle-about-btn');
    if (!container || !btn) return;

    if (container.classList.contains('collapsed')) {
        container.classList.remove('collapsed');
        btn.innerText = i18n('profile.collapse');
    } else {
        container.classList.add('collapsed');
        btn.innerText = i18n('profile.expand');
    }
}

async function loadRecentHistory(retries = 2) {
    const container = document.getElementById('recent-history-list');
    if (!container) return;

    try {
        const res = await fetch('/api/tab/history');
        const data = await res.json();
        if (Array.isArray(data)) cachedHistoryData = data;

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); margin: 0;">' + i18n('history.empty') + '</p>';
            return;
        }

        container.innerHTML = data.slice(0, 4).map(renderHistoryItemHtml).join('');
    } catch (err) {
        if (retries > 0) {
            setTimeout(() => loadRecentHistory(retries - 1), 1500);
        } else {
            container.innerHTML = `<p style="color: var(--danger); margin: 0;">${i18n('history.load_error')}</p>`;
        }
    }
}

async function loadProfileFriendsClubs(retries = 2) {
    const container = document.getElementById('profile-friends-clubs-preview');
    if (!container) return;

    try {
        const res = await fetch('/api/tab/friends');
        const data = await res.json();
        const friends = data.friends || [];
        const clubs = data.clubs || [];

        if (!friends.length && !clubs.length) {
            if (retries > 0) {
                setTimeout(() => loadProfileFriendsClubs(retries - 1), 1500);
                return;
            }
            container.innerHTML = '<p style="color: var(--text-muted); margin: 0; font-size: 13px;">' + i18n('friends.empty') + '</p>';
            return;
        }

        let html = '<div class="mini-friends-grid">';
        friends.slice(0, 6).forEach(f => {
            const name = f.nickname || f.name || '';
            html += `<a href="https://shikimori.io/${name}" onclick="event.preventDefault(); openFriendModal('${name}');" class="mini-friend-item" title="${name}">
                <img src="${buildImgUrl(f.avatar || f.image)}" alt="${name}" loading="lazy"><span>${name}</span></a>`;
        });
        clubs.slice(0, 2).forEach(c => {
            const name = c.name || '';
            html += `<a href="https://shikimori.io/clubs/${c.id}" onclick="event.preventDefault(); openClubModal(${c.id});" class="mini-friend-item club" title="${name}">
                <img src="${buildImgUrl(c.logo || c.image)}" alt="${name}" loading="lazy"><span>${name}</span></a>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        if (retries > 0) {
            setTimeout(() => loadProfileFriendsClubs(retries - 1), 1500);
        } else {
            container.innerHTML = `<p style="color: var(--danger); margin: 0; font-size: 13px;">${i18n('friends.load_error')}</p>`;
        }
    }
}