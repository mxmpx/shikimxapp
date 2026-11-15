import React, { useState, useEffect, useRef } from 'react'
import { UserProfile } from '../../types/anime'
import { TabKey } from './NavigationTabs'

interface UserMenuProps {
  userProfile: UserProfile | null
  theme: string
  setTheme: (t: string) => void
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  onOpenStats: () => void
  onOpenSettings: () => void
  onOpenAbout: () => void
  onOpenRatesWithType: (type: 'Anime' | 'Manga') => void
}

export function UserMenu({
  userProfile,
  theme,
  setTheme,
  activeTab,
  setActiveTab,
  onOpenStats,
  onOpenSettings,
  onOpenAbout,
  onOpenRatesWithType,
}: UserMenuProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Forum button */}
      <button
        onClick={() => setActiveTab('forum')}
        aria-label="Форум и обсуждения"
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: activeTab === 'forum' ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          transition: 'all 0.15s ease',
        }}
        title="Форум и обсуждения"
      >
        <i className="ti ti-messages" />
      </button>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={
          theme === 'dark'
            ? 'Переключить на светлую тему'
            : 'Переключить на тёмную тему'
        }
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          transition: 'all 0.15s ease',
        }}
        title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
      >
        <i className={theme === 'dark' ? 'ti ti-sun' : 'ti ti-moon'} />
      </button>

      {/* Profile Menu Dropdown */}
      {userProfile ? (
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            aria-expanded={userMenuOpen}
            aria-label="Меню профиля пользователя"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--subtle-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 20,
              padding: '4px 10px 4px 4px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <img
              src={userProfile.avatar}
              alt={userProfile.nickname}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--accent)',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {userProfile.nickname}
            </span>
            <i
              className="ti ti-caret-down"
              style={{ fontSize: 12, opacity: 0.6 }}
            />
          </button>

          {userMenuOpen && (
            <div
              className="reveal-pop"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 220,
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
              {/* User info banner */}
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--border-sub)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <img
                  src={userProfile.avatar}
                  alt={userProfile.nickname}
                  style={{ width: 34, height: 34, borderRadius: '50%' }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {userProfile.nickname}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    ID: {userProfile.id}
                  </div>
                </div>
              </div>

              <div
                style={{
                  height: 1,
                  background: 'var(--border-sub)',
                  margin: '4px 6px',
                }}
              />

              {/* Lists & Favourites */}
              <button
                onClick={() => {
                  onOpenRatesWithType('Anime')
                  setUserMenuOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-movie" style={{ color: 'var(--accent)' }} />
                <span>Список аниме</span>
              </button>

              <button
                onClick={() => {
                  onOpenRatesWithType('Manga')
                  setUserMenuOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-book-2" style={{ color: 'var(--accent)' }} />
                <span>Список манги</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('favourites')
                  setUserMenuOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-heart" style={{ color: '#f87171' }} />
                <span>Избранное</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('friends')
                  setUserMenuOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-users" style={{ color: '#38bdf8' }} />
                <span>Друзья</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('history')
                  setUserMenuOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-history" style={{ color: '#fbbf24' }} />
                <span>История</span>
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  onOpenStats()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-chart-bar" style={{ color: '#4ade80' }} />
                <span>Статистика</span>
              </button>

              <div
                style={{
                  height: 1,
                  background: 'var(--border-sub)',
                  margin: '4px 6px',
                }}
              />

              {/* Settings & About */}
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  onOpenSettings()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-settings" />
                <span>Настройки</span>
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  onOpenAbout()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-info-circle" />
                <span>О сайте</span>
              </button>

              <div
                style={{
                  height: 1,
                  background: 'var(--border-sub)',
                  margin: '4px 6px',
                }}
              />

              {/* Logout */}
              <a
                href="/logout"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  color: '#f87171',
                  textDecoration: 'none',
                  fontSize: 12.5,
                  fontWeight: 600,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <i className="ti ti-logout" />
                <span>Выйти из аккаунта</span>
              </a>
            </div>
          )}
        </div>
      ) : (
        <a
          href="/login"
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            background: '#ffffff',
            color: '#0a0b0f',
            fontSize: 12.5,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <i className="ti ti-login" />
          <span>Войти</span>
        </a>
      )}
    </div>
  )
}
