import React, { useEffect, useRef } from 'react'
import { UserProfile } from '../types/anime'

interface StatsModalProps {
  userProfile: UserProfile | null
  onClose: () => void
}

export function StatsModal({ userProfile, onClose }: StatsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const stats = userProfile?.stats

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const animeStatuses = [
    {
      key: 'watching',
      label: 'Смотрю',
      color: '#38bdf8',
      icon: 'ti-player-play',
    },
    {
      key: 'completed',
      label: 'Просмотрено',
      color: '#4ade80',
      icon: 'ti-check',
    },
    {
      key: 'planned',
      label: 'В планах',
      color: '#a78bfa',
      icon: 'ti-calendar-time',
    },
    {
      key: 'on_hold',
      label: 'Отложено',
      color: '#fbbf24',
      icon: 'ti-player-pause',
    },
    { key: 'dropped', label: 'Брошено', color: '#f87171', icon: 'ti-x' },
    {
      key: 'rewatching',
      label: 'Пересматриваю',
      color: '#ec4899',
      icon: 'ti-repeat',
    },
  ]

  const mangaStatuses = [
    {
      key: 'watching',
      label: 'Читаю',
      color: '#38bdf8',
      icon: 'ti-player-play',
    },
    {
      key: 'completed',
      label: 'Прочитано',
      color: '#4ade80',
      icon: 'ti-check',
    },
    {
      key: 'planned',
      label: 'В планах',
      color: '#a78bfa',
      icon: 'ti-calendar-time',
    },
    {
      key: 'on_hold',
      label: 'Отложено',
      color: '#fbbf24',
      icon: 'ti-player-pause',
    },
    { key: 'dropped', label: 'Брошено', color: '#f87171', icon: 'ti-x' },
    {
      key: 'rereading',
      label: 'Перечитываю',
      color: '#ec4899',
      icon: 'ti-repeat',
    },
  ]

  const getAnimeCount = (key: string) => {
    if (!stats?.statuses?.anime) return 0
    const item = stats.statuses.anime.find((s: any) => s.name === key)
    return item ? item.size : 0
  }

  const getMangaCount = (key: string) => {
    if (!stats?.statuses?.manga) return 0
    const item = stats.statuses.manga.find((s: any) => s.name === key)
    return item ? item.size : 0
  }

  const totalAnime = animeStatuses.reduce(
    (acc, s) => acc + getAnimeCount(s.key),
    0
  )
  const totalManga = mangaStatuses.reduce(
    (acc, s) => acc + getMangaCount(s.key),
    0
  )

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
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
              <i className="ti ti-chart-bar" />
            </div>
            <div>
              <h3
                id="stats-modal-title"
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                Статистика просмотров
              </h3>
              <div
                style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}
              >
                {userProfile
                  ? `Пользователь: ${userProfile.nickname}`
                  : 'Общая статистика'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Закрыть статистику просмотров"
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
          {/* Anime Stats */}
          <div
            style={{
              background: 'var(--subtle-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                <i
                  className="ti ti-device-tv"
                  style={{ color: 'var(--accent)' }}
                />
                <span>Аниме</span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-dim)',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Всего: {totalAnime}
              </span>
            </div>

            {/* Multi-segment progress bar */}
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
                display: 'flex',
                marginBottom: 14,
              }}
            >
              {totalAnime > 0 ? (
                animeStatuses.map((s) => {
                  const count = getAnimeCount(s.key)
                  if (!count) return null
                  const widthPct = (count / totalAnime) * 100
                  return (
                    <div
                      key={s.key}
                      style={{ width: `${widthPct}%`, background: s.color }}
                      title={`${s.label}: ${count}`}
                    />
                  )
                })
              ) : (
                <div
                  style={{ width: '100%', background: 'rgba(255,255,255,0.1)' }}
                />
              )}
            </div>

            {/* Grid of stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 8,
              }}
            >
              {animeStatuses.map((s) => {
                const count = getAnimeCount(s.key)
                return (
                  <div
                    key={s.key}
                    style={{
                      background: 'var(--sub-bg)',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: s.color,
                        }}
                      />
                      <span>{s.label}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Manga Stats */}
          <div
            style={{
              background: 'var(--subtle-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                <i className="ti ti-book" style={{ color: 'var(--accent)' }} />
                <span>Манга</span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-dim)',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Всего: {totalManga}
              </span>
            </div>

            {/* Multi-segment progress bar */}
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
                display: 'flex',
                marginBottom: 14,
              }}
            >
              {totalManga > 0 ? (
                mangaStatuses.map((s) => {
                  const count = getMangaCount(s.key)
                  if (!count) return null
                  const widthPct = (count / totalManga) * 100
                  return (
                    <div
                      key={s.key}
                      style={{ width: `${widthPct}%`, background: s.color }}
                      title={`${s.label}: ${count}`}
                    />
                  )
                })
              ) : (
                <div
                  style={{ width: '100%', background: 'rgba(255,255,255,0.1)' }}
                />
              )}
            </div>

            {/* Grid of stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 8,
              }}
            >
              {mangaStatuses.map((s) => {
                const count = getMangaCount(s.key)
                return (
                  <div
                    key={s.key}
                    style={{
                      background: 'var(--sub-bg)',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: s.color,
                        }}
                      />
                      <span>{s.label}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
