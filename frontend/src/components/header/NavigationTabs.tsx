import React, { useState, useEffect, useRef } from 'react'
import { appConfig } from '../../config/appConfig'

export type TabKey =
  | 'profile'
  | 'catalog-anime'
  | 'top100'
  | 'catalog-manga'
  | 'catalog-ranobe'
  | 'forum'
  | 'clubs'
  | 'collections'
  | 'critiques'
  | 'articles'
  | 'users'
  | 'recommendations'
  | 'calendar'
  | 'rates'
  | 'favourites'
  | 'friends'
  | 'history'

interface NavigationTabsProps {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
}

export const TAB_CONFIG: Record<TabKey, { label: string; icon: string }> =
  (appConfig.tabs as any) || {
    profile: { label: 'Главная', icon: 'ti-home' },
    'catalog-anime': { label: 'Аниме', icon: 'ti-player-play' },
    top100: { label: 'Топ 100', icon: 'ti-trophy' },
    'catalog-manga': { label: 'Манга', icon: 'ti-book-2' },
    'catalog-ranobe': { label: 'Ранобэ', icon: 'ti-notebook' },
    forum: { label: 'Форум', icon: 'ti-messages' },
    clubs: { label: 'Клубы', icon: 'ti-circles-relation' },
    collections: { label: 'Коллекции', icon: 'ti-layout-grid' },
    critiques: { label: 'Рецензии', icon: 'ti-pencil' },
    articles: { label: 'Статьи', icon: 'ti-file-text' },
    users: { label: 'Пользователи', icon: 'ti-user' },
    recommendations: { label: 'Рекомендации', icon: 'ti-thumb-up' },
    calendar: { label: 'Календарь', icon: 'ti-calendar' },
    rates: { label: 'Списки', icon: 'ti-list-check' },
    favourites: { label: 'Избранное', icon: 'ti-heart' },
    friends: { label: 'Друзья', icon: 'ti-users' },
    history: { label: 'История', icon: 'ti-history' },
  }

const MENU_GROUPS = [
  {
    category: 'КАТАЛОГ',
    items: [
      { id: 'catalog-anime' as TabKey, label: 'Аниме', icon: 'ti-player-play' },
      { id: 'top100' as TabKey, label: 'Топ 100', icon: 'ti-trophy' },
      { id: 'catalog-manga' as TabKey, label: 'Манга', icon: 'ti-book-2' },
      { id: 'catalog-ranobe' as TabKey, label: 'Ранобэ', icon: 'ti-notebook' },
    ],
  },
  {
    category: 'СООБЩЕСТВО',
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
    category: 'РАЗНОЕ',
    items: [
      { id: 'recommendations' as TabKey, label: 'Рекомендации', icon: 'ti-thumb-up' },
      { id: 'calendar' as TabKey, label: 'Календарь', icon: 'ti-calendar' },
    ],
  },
]

export function NavigationTabs({ activeTab, setActiveTab }: NavigationTabsProps) {
  const [mainMenuOpen, setMainMenuOpen] = useState(false)
  const mainMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mainMenuRef.current && !mainMenuRef.current.contains(e.target as Node)) {
        setMainMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMainMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const currentTabInfo = TAB_CONFIG[activeTab] || TAB_CONFIG.profile

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 20px)' }}>
      {/* Brand */}
      <div
        onClick={() => {
          setActiveTab('profile')
          setMainMenuOpen(false)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 15,
          }}
        >
          <i className={`ti ${appConfig.brand.logoIcon || 'ti-device-tv'}`} />
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          {appConfig.brand.name}{' '}
          <span style={{ color: 'var(--accent)' }}>{appConfig.brand.suffix}</span>
        </span>
      </div>

      {/* Main Menu Dropdown (Desktop only - mobile uses bottom nav sheet) */}
      <div ref={mainMenuRef} className="desktop-only" style={{ position: 'relative' }}>
        <button
          onClick={() => setMainMenuOpen((prev) => !prev)}
          aria-expanded={mainMenuOpen}
          aria-label={`${currentTabInfo.label} — главное меню разделов`}
          style={{
            padding: '6px 14px',
            borderRadius: 10,
            border: '1px solid var(--subtle-border)',
            background: mainMenuOpen
              ? 'rgba(var(--accent-rgb), 0.16)'
              : 'var(--subtle-bg)',
            color: mainMenuOpen ? 'var(--accent)' : 'var(--text-primary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <i
            className={`ti ${currentTabInfo.icon}`}
            style={{ color: 'var(--accent)' }}
          />
          <span>{currentTabInfo.label}</span>
          <i
            className="ti ti-caret-down"
            style={{
              fontSize: 12,
              opacity: 0.6,
              transform: mainMenuOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>

        {mainMenuOpen && (
          <div
            className="reveal-pop"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: 250,
              background: 'var(--modal-bg)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
              padding: '6px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {/* Главная */}
            <button
              onClick={() => {
                setActiveTab('profile')
                setMainMenuOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background:
                  activeTab === 'profile'
                    ? 'rgba(var(--accent-rgb), 0.15)'
                    : 'transparent',
                color:
                  activeTab === 'profile'
                    ? 'var(--accent)'
                    : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--text-primary)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color =
                  activeTab === 'profile'
                    ? 'var(--accent)'
                    : 'var(--text-muted)')
              }
            >
              <i className="ti ti-home" />
              <span>Главная</span>
            </button>

            {MENU_GROUPS.map((group) => (
              <React.Fragment key={group.category}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: 'var(--text-dim)',
                    padding: '8px 12px 4px',
                    letterSpacing: '0.05em',
                  }}
                >
                  {group.category}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      setMainMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background:
                        activeTab === item.id
                          ? 'rgba(var(--accent-rgb), 0.15)'
                          : 'transparent',
                      color:
                        activeTab === item.id
                          ? 'var(--accent)'
                          : 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = 'var(--text-primary)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color =
                        activeTab === item.id
                          ? 'var(--accent)'
                          : 'var(--text-muted)')
                    }
                  >
                    <i className={`ti ${item.icon}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
