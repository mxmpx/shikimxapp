import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TabKey, TAB_CONFIG } from '../header/NavigationTabs'

interface MobileNavSheetProps {
  isOpen: boolean
  onClose: () => void
  activeTab: TabKey
  onSelectTab: (tab: TabKey) => void
  onOpenSettings?: () => void
  onOpenAbout?: () => void
  onOpenStats?: () => void
}

const SHEET_GROUPS = [
  {
    title: 'Каталог',
    items: [
      { id: 'catalog-anime' as TabKey, label: 'Аниме', icon: 'ti-player-play' },
      { id: 'top100' as TabKey, label: 'Топ 100', icon: 'ti-trophy' },
      { id: 'catalog-manga' as TabKey, label: 'Манга', icon: 'ti-book-2' },
      { id: 'catalog-ranobe' as TabKey, label: 'Ранобэ', icon: 'ti-notebook' },
    ],
  },
  {
    title: 'Сообщество',
    items: [
      { id: 'forum' as TabKey, label: 'Форум', icon: 'ti-messages' },
      { id: 'clubs' as TabKey, label: 'Клубы', icon: 'ti-circles-relation' },
      { id: 'collections' as TabKey, label: 'Коллекции', icon: 'ti-layout-grid' },
      { id: 'critiques' as TabKey, label: 'Рецензии', icon: 'ti-pencil' },
      { id: 'articles' as TabKey, label: 'Статьи', icon: 'ti-file-text' },
      { id: 'users' as TabKey, label: 'Пользователи', icon: 'ti-user' },
    ],
  },
  {
    title: 'Разное',
    items: [
      { id: 'recommendations' as TabKey, label: 'Рекомендации', icon: 'ti-thumb-up' },
      { id: 'calendar' as TabKey, label: 'Календарь', icon: 'ti-calendar' },
    ],
  },
  {
    title: 'Личное',
    items: [
      { id: 'rates' as TabKey, label: 'Мои списки', icon: 'ti-list-check' },
      { id: 'favourites' as TabKey, label: 'Избранное', icon: 'ti-heart' },
      { id: 'friends' as TabKey, label: 'Друзья', icon: 'ti-users' },
      { id: 'history' as TabKey, label: 'История', icon: 'ti-history' },
    ],
  },
]

export function MobileNavSheet({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenAbout,
  onOpenStats,
}: MobileNavSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="mobile-sheet-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Все разделы сайта"
    >
      <div
        className="mobile-sheet-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-sheet-handle" />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--modal-border)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Все разделы
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть меню"
            className="touch-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Scrollable Groups */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {SHEET_GROUPS.map((grp) => (
            <div key={grp.title}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-dim)',
                  marginBottom: 10,
                }}
              >
                {grp.title}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                }}
              >
                {grp.items.map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id)
                        onClose()
                      }}
                      className="touch-btn"
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: isActive
                          ? 'rgba(var(--accent-rgb), 0.16)'
                          : 'var(--subtle-bg)',
                        border: `1px solid ${
                          isActive
                            ? 'rgba(var(--accent-rgb), 0.35)'
                            : 'var(--card-border)'
                        }`,
                        color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <i
                        className={`ti ${item.icon}`}
                        style={{
                          fontSize: 17,
                          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Quick Settings & Info actions */}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--modal-border)' }}>
            <div
              style={{
                display: 'flex',
                gap: 8,
              }}
            >
              {onOpenSettings && (
                <button
                  onClick={() => {
                    onOpenSettings()
                    onClose()
                  }}
                  className="touch-btn"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'var(--subtle-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-settings" />
                  <span>Настройки</span>
                </button>
              )}
              {onOpenStats && (
                <button
                  onClick={() => {
                    onOpenStats()
                    onClose()
                  }}
                  className="touch-btn"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'var(--subtle-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-chart-bar" />
                  <span>Статистика</span>
                </button>
              )}
              {onOpenAbout && (
                <button
                  onClick={() => {
                    onOpenAbout()
                    onClose()
                  }}
                  className="touch-btn"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'var(--subtle-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-info-circle" />
                  <span>О сайте</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
