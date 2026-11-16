import React, { useState, useEffect, useRef } from 'react'
import { fetchSettings, saveSettings } from '../api/client'

interface SettingsModalProps {
  theme: string
  setTheme: (t: string) => void
  onClose: () => void
  onOpenAbout: () => void
}

const COLOR_PRESETS = [
  { id: 'theme', name: 'По теме', color: '' },
  { id: 'cinema', name: 'Кинозал', color: '#0a0b0f' },
  { id: 'obsidian', name: 'Обсидиан', color: '#101116' },
  { id: 'midnight', name: 'Полночь', color: '#0c101c' },
  { id: 'graphite', name: 'Графит', color: '#14161f' },
  { id: 'charcoal', name: 'Уголь', color: '#121318' },
]

export function SettingsModal({
  theme,
  setTheme,
  onClose,
  onOpenAbout,
}: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [bgMode, setBgMode] = useState<'color' | 'image'>(() => {
    return (
      (localStorage.getItem('shikimx_bg_mode') as 'color' | 'image') || 'color'
    )
  })
  const [bgColor, setBgColor] = useState<string>(() => {
    return localStorage.getItem('shikimx_bg_color') || ''
  })
  const [bgImageUrl, setBgImageUrl] = useState<string>(() => {
    return localStorage.getItem('shikimx_bg_image') || ''
  })
  const [navbarView, setNavbarView] = useState<'full' | 'icons' | 'titles'>(
    () => {
      return (
        (localStorage.getItem('shikimx_navbar_view') as
          'full' | 'icons' | 'titles') || 'full'
      )
    }
  )
  const [hydrated, setHydrated] = useState(false)

  // Escape key handler and focus trap initialization
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Load settings from the server (per-user, falls back to guest session)
  useEffect(() => {
    fetchSettings()
      .then((s) => {
        if (!s || typeof s !== 'object') return
        const bg = s.background
        if (bg && typeof bg === 'object') {
          if (bg.mode === 'image') setBgMode('image')
          else if (bg.mode === 'color') setBgMode('color')
          if (typeof bg.color === 'string' && bg.color) setBgColor(bg.color)
          if (typeof bg.image === 'string' && bg.image) setBgImageUrl(bg.image)
        }
        if (
          s.navbar_view === 'full' ||
          s.navbar_view === 'icons' ||
          s.navbar_view === 'titles'
        ) {
          setNavbarView(s.navbar_view)
        }
      })
      .catch(() => {
        /* оффлайн / гость — используем localStorage */
      })
      .finally(() => setHydrated(true))
  }, [])

  // Persist settings to the backend once server state has been hydrated
  useEffect(() => {
    if (!hydrated) return
    saveSettings({
      background: { mode: bgMode, color: bgColor, image: bgImageUrl },
      navbar_view: navbarView,
    }).catch(() => {
      /* сохраняем хотя бы локально */
    })
  }, [hydrated, bgMode, bgColor, bgImageUrl, navbarView])

  // Apply background changes
  useEffect(() => {
    if (bgMode === 'color') {
      if (bgColor) {
        document.body.style.backgroundColor = bgColor
        document.body.style.backgroundImage = 'none'
      } else {
        document.body.style.backgroundColor = ''
        document.body.style.backgroundImage = ''
      }
      localStorage.setItem('shikimx_bg_mode', 'color')
      localStorage.setItem('shikimx_bg_color', bgColor)
    } else {
      if (bgImageUrl) {
        document.body.style.backgroundImage = `url(${bgImageUrl})`
        document.body.style.backgroundSize = 'cover'
        document.body.style.backgroundAttachment = 'fixed'
        document.body.style.backgroundPosition = 'center'
      }
      localStorage.setItem('shikimx_bg_mode', 'image')
      localStorage.setItem('shikimx_bg_image', bgImageUrl)
    }
  }, [bgMode, bgColor, bgImageUrl])

  const handleResetBg = () => {
    setBgColor('')
    setBgImageUrl('')
    setBgMode('color')
    document.body.style.backgroundColor = ''
    document.body.style.backgroundImage = ''
    localStorage.removeItem('shikimx_bg_mode')
    localStorage.removeItem('shikimx_bg_color')
    localStorage.removeItem('shikimx_bg_image')
  }

  const handleNavbarViewChange = (mode: 'full' | 'icons' | 'titles') => {
    setNavbarView(mode)
    localStorage.setItem('shikimx_navbar_view', mode)
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      ref={modalRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 12, 0.82)',
        backdropFilter: 'blur(16px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        outline: 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--modal-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--sub-bg)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                fontSize: 18,
              }}
            >
              <i className="ti ti-settings" />
            </div>
            <div>
              <h3
                id="settings-modal-title"
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                Настройки
              </h3>
              <div
                style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}
              >
                Персонализация внешнего вида и навигации
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Закрыть настройки"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--subtle-bg)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Quick theme toggle */}
          <div
            style={{
              background: 'var(--subtle-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--sub-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: 'var(--accent)',
                }}
              >
                <i
                  className={
                    theme === 'dark' ? 'ti ti-moon-stars' : 'ti ti-sun'
                  }
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Тема оформления
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Текущая: {theme === 'dark' ? 'Тёмная' : 'Светлая'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 6,
                background: 'rgba(0,0,0,0.2)',
                padding: 4,
                borderRadius: 10,
              }}
            >
              <button
                onClick={() => setTheme('dark')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background:
                    theme === 'dark' ? 'var(--accent-btn-bg)' : 'transparent',
                  color: theme === 'dark' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="ti ti-moon" /> Тёмная
              </button>
              <button
                onClick={() => setTheme('light')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background:
                    theme === 'light' ? 'var(--accent-btn-bg)' : 'transparent',
                  color: theme === 'light' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="ti ti-sun" /> Светлая
              </button>
            </div>
          </div>

          {/* Background customizer */}
          <div
            style={{
              background: 'var(--subtle-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i
                  className="ti ti-palette"
                  style={{ color: 'var(--accent)', fontSize: 18 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Фон сайта
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                    Цветовые оттенки или фото-обои
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  background: 'rgba(0,0,0,0.2)',
                  padding: 3,
                  borderRadius: 8,
                }}
              >
                <button
                  onClick={() => setBgMode('color')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background:
                      bgMode === 'color'
                        ? 'var(--accent-btn-bg)'
                        : 'transparent',
                    color: bgMode === 'color' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Цвет
                </button>
                <button
                  onClick={() => setBgMode('image')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background:
                      bgMode === 'image'
                        ? 'var(--accent-btn-bg)'
                        : 'transparent',
                    color: bgMode === 'image' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Фото
                </button>
              </div>
            </div>

            {bgMode === 'color' ? (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  {COLOR_PRESETS.map((p) => {
                    const isSelected =
                      (!p.color && !bgColor) || bgColor === p.color
                    return (
                      <button
                        key={p.id}
                        onClick={() => setBgColor(p.color)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 8,
                          border: isSelected
                            ? '2px solid var(--accent)'
                            : '1px solid var(--border-subtle)',
                          background: p.color || 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: isSelected
                            ? '0 4px 12px rgba(0, 0, 0, 0.45)'
                            : 'none',
                        }}
                      >
                        {isSelected && (
                          <i
                            className="ti ti-check"
                            style={{ fontSize: 12, color: 'var(--accent)' }}
                          />
                        )}
                        <span>{p.name}</span>
                      </button>
                    )
                  })}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <label
                    htmlFor="settings-custom-bgcolor"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <input
                      id="settings-custom-bgcolor"
                      name="bg_color"
                      aria-label="Выбор цвета фона"
                      type="color"
                      value={bgColor || '#0a0b0f'}
                      onChange={(e) => setBgColor(e.target.value)}
                      style={{
                        width: 28,
                        height: 28,
                        border: 'none',
                        borderRadius: 6,
                        background: 'none',
                        cursor: 'pointer',
                      }}
                    />
                    <span>Свой цвет ({bgColor || 'по умолчанию'})</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleResetBg}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <i className="ti ti-rotate-clockwise" /> Сбросить
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <label htmlFor="settings-bg-image-url" style={{ display: 'none' }}>
                  Ссылка на фоновое изображение
                </label>
                <input
                  id="settings-bg-image-url"
                  name="bg_image_url"
                  aria-label="Ссылка на фоновое изображение"
                  type="url"
                  placeholder="Вставьте ссылку на фоновое изображение (https://...)"
                  value={bgImageUrl}
                  onChange={(e) => setBgImageUrl(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: 8,
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)',
                    padding: '0 12px',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleResetBg}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <i className="ti ti-rotate-clockwise" /> Сбросить обои
                </button>
              </div>
            )}
          </div>

          {/* Navigation bar view options */}
          <div
            style={{
              background: 'var(--subtle-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <i
                className="ti ti-layout-navbar"
                style={{ color: 'var(--accent)', fontSize: 18 }}
              />
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Стиль навигации в шапке
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                  Формат отображения вкладок и кнопок
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              {[
                { id: 'full', label: 'Иконка + Текст', sub: 'Классический' },
                { id: 'icons', label: 'Только иконки', sub: 'Компактный' },
                { id: 'titles', label: 'Только текст', sub: 'Минимализм' },
              ].map((item) => {
                const isSelected = navbarView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavbarViewChange(item.id as any)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 10,
                      border: isSelected
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border-subtle)',
                      background: isSelected
                        ? 'var(--primary-container)'
                        : 'var(--subtle-bg)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>
                      {item.sub}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* About app link button */}
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenAbout()
            }}
            aria-label="Открыть подробную информацию о сайте Shiki MX"
            style={{
              background: 'rgba(var(--accent-rgb), 0.08)',
              border: '1px solid rgba(var(--accent-rgb), 0.25)',
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                'rgba(var(--accent-rgb), 0.14)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                'rgba(var(--accent-rgb), 0.08)')
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <i
                className="ti ti-info-circle"
                style={{ color: 'var(--accent)', fontSize: 20 }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  О сайте Shiki MX
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                  Версия, возможности и технологический стек
                </div>
              </div>
            </div>
            <i
              className="ti ti-chevron-right"
              style={{ color: 'var(--accent)' }}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
