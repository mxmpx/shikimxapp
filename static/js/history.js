function renderHistoryItemHtml(item) {
    const target = item.target || {};
    const title = target.russian || target.name || '';
    const imgUrl = target.image ? buildImgUrl(target.image) : '';
    const targetUrl = target.url ? (target.url.startsWith('http') ? target.url : 'https://shikimori.io' + target.url) : (target.id ? `https://shikimori.io/animes/${target.id}` : '#');
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    return `
        <div class="history-item">
            ${imgUrl ? `<a href="${targetUrl}" target="_blank"><img src="${imgUrl}" alt="${title}" class="history-thumb" loading="lazy"></a>` : `<div class="history-thumb-placeholder"></div>`}
            <div class="history-info">
                ${title ? `<a href="${targetUrl}" target="_blank" class="history-target">${title}</a>` : ''}
                <div class="history-desc">${item.description || '—'}</div>
            </div>
            <div class="history-date">${dateStr}</div>
        </div>`;
}

function renderHistory(historyList) {
    const container = document.getElementById('history');
    if (!Array.isArray(historyList) || historyList.length === 0) {
        container.innerHTML = '<div class="card"><p style="color: var(--text-muted);">' + i18n('history.empty') + '</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3><i class="ti ti-clock"></i> ${i18n('history.full')}</h3></div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${historyList.map(renderHistoryItemHtml).join('')}
            </div>
        </div>`;
}