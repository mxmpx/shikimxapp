import React, { useState, useEffect } from 'react'
import { fetchRates } from '../api/client'
import { RateItem } from '../types/anime'

interface RatesViewProps {
  onOpenAnime: (id: number) => void
  onOpenManga?: (id: number) => void
  initialTargetType?: 'Anime' | 'Manga'
  isGuest?: boolean
}

const ANIME_STATUSES = [
  { status: 'watching', label: 'Смотрю' },
  { status: 'planned', label: 'В планах' },
  { status: 'completed', label: 'Просмотрено' },
  { status: 'on_hold', label: 'Отложено' },
  { status: 'dropped', label: 'Брошено' },
  { status: 'rewatching', label: 'Пересматриваю' },
]

const MANGA_STATUSES = [
  { status: 'watching', label: 'Читаю' },
  { status: 'planned', label: 'В планах' },
  { status: 'completed', label: 'Прочитано' },
  { status: 'on_hold', label: 'Отложено' },
  { status: 'dropped', label: 'Брошено' },
  { status: 'rereading', label: 'Перечитываю' },
]

export function RatesView({
  onOpenAnime,
  onOpenManga,
  initialTargetType = 'Anime',
  isGuest = false,
}: RatesViewProps) {
  const [targetType, setTargetType] = useState<'Anime' | 'Manga'>(
    initialTargetType
  )
  const [activeStatus, setActiveStatus] = useState('watching')
  const [rates, setRates] = useState<RateItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isGuest) {
      setLoading(false)
      setRates([])
      return
    }
    setLoading(true)
    fetchRates()
      .then((data) => setRates(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [isGuest])

  const statuses = targetType === 'Anime' ? ANIME_STATUSES : MANGA_STATUSES

  const filteredRates = rates.filter((r) => {
    const isTarget =
      targetType === 'Anime'
        ? r.target_type === 'Anime'
        : r.target_type === 'Manga'
    return isTarget && r.status === activeStatus
  })

  const handleIncrement = async (item: RateItem, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const total =
        targetType === 'Anime'
          ? item.target_data?.episodes
          : item.target_data?.chapters
      const res = await fetch('/api/rate/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_id: item.target_id,
          target_type: item.target_type,
          total_count: total || 0,
        }),
      })
      if (res.ok) {
        setRates((prev) =>
          prev.map((r) =>
            r.target_id === item.target_id && r.target_type === item.target_type
              ? {
                  ...r,
                  [targetType === 'Anime' ? 'episodes' : 'chapters']:
                    (targetType === 'Anime'
                      ? (r.episodes ?? 0)
                      : (r.chapters ?? 0)) + 1,
                }
              : r
          )
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--sub-bg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontSize: 20,
            }}
          >
            <i
              className={
                targetType === 'Anime' ? 'ti ti-movie' : 'ti ti-book-2'
              }
            />
          </div>
          <div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {targetType === 'Anime' ? 'Список аниме' : 'Список манги'}
            </h2>
            <div
              style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}
            >
              Синхронизация статусов и прогресса с профилем Shikimori
            </div>
          </div>
        </div>

        {/* Target Type Selector */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'var(--sub-bg)',
            border: '1px solid var(--border-subtle)',
            padding: 3,
            borderRadius: 8,
          }}
        >
          <button
            onClick={() => setTargetType('Anime')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background:
                targetType === 'Anime'
                  ? 'var(--primary-container)'
                  : 'transparent',
              color:
                targetType === 'Anime'
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background-color 0.18s ease',
            }}
          >
            <i className="ti ti-device-tv" /> Аниме
          </button>
          <button
            onClick={() => setTargetType('Manga')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background:
                targetType === 'Manga'
                  ? 'var(--primary-container)'
                  : 'transparent',
              color:
                targetType === 'Manga'
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background-color 0.18s ease',
            }}
          >
            <i className="ti ti-book" /> Манга
          </button>
        </div>
      </div>

      {/* Status Categories Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 14,
          marginBottom: 24,
          overflowX: 'auto',
        }}
      >
        {statuses.map((s) => {
          const isActive = activeStatus === s.status
          const count = rates.filter((r) => {
            const isTarget =
              targetType === 'Anime'
                ? r.target_type === 'Anime' || !r.target_type
                : r.target_type === 'Manga'
            return isTarget && r.status === s.status
          }).length

          return (
            <button
              key={s.status}
              onClick={() => setActiveStatus(s.status)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: isActive
                  ? '1px solid rgba(var(--accent-rgb), 0.5)'
                  : '1px solid var(--border-subtle)',
                background: isActive
                  ? 'var(--primary-container)'
                  : 'var(--sub-bg)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 500,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                transition:
                  'background-color 0.18s ease, border-color 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{s.label}</span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isGuest ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            maxWidth: 520,
            margin: '20px auto 0',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'var(--primary-container)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 18px',
            }}
          >
            <i className="ti ti-user-circle" />
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            Синхронизация списков Shikimori
          </h3>
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: '0 0 24px',
            }}
          >
            Войдите через официальный аккаунт Shikimori, чтобы получить доступ к своим спискам аниме и манги, отмечать просмотренные серии и выставлять оценки.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'background-color 0.15s ease',
            }}
          >
            <i className="ti ti-brand-shikimori" />
            <span>Войти через Shikimori</span>
          </a>
        </div>
      ) : loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 260,
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-loader animate-spin"
            style={{ fontSize: 24, marginRight: 10, color: 'var(--accent)' }}
          />{' '}
          Загрузка списков...
        </div>
      ) : filteredRates.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-bookmark"
            style={{
              fontSize: 36,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>
            В категории «
            {statuses.find((t) => t.status === activeStatus)?.label}» пока пусто
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))',
            gap: 12,
          }}
        >
          {filteredRates.map((r, index) => {
            const target = r.target_data || ({} as RateItem['target_data'])
            const id = r.target_id || target?.id
            const title = target?.russian || target?.name || ''
            const img = target?.image || ''
            const episodes =
              targetType === 'Anime' ? r.episodes || 0 : r.chapters || 0
            const totalEpisodes =
              targetType === 'Anime'
                ? target?.episodes || '?'
                : target?.chapters || '?'
            const score = r.score || 0

            return (
              <div
                key={`${r.target_type}_${r.target_id}_${r.id || index}`}
                role={id ? 'button' : undefined}
                tabIndex={id ? 0 : undefined}
                aria-label={
                  id
                    ? `Открыть ${targetType === 'Anime' ? 'аниме' : 'мангу'}: ${title}`
                    : undefined
                }
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 14,
                  padding: '14px',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  cursor: id ? 'pointer' : 'default',
                  transition:
                    'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease',
                  position: 'relative',
                }}
                onClick={() => {
                  if (targetType === 'Anime' && id) {
                    onOpenAnime(id)
                  } else if (id) {
                    if (onOpenManga) {
                      onOpenManga(id)
                    } else {
                      window.open(
                        `https://shikimori.io/mangas/${id}`,
                        '_blank'
                      )
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (id && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    if (targetType === 'Anime') {
                      onOpenAnime(id)
                    } else if (onOpenManga) {
                      onOpenManga(id)
                    } else {
                      window.open(
                        `https://shikimori.io/mangas/${id}`,
                        '_blank'
                      )
                    }
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor =
                    'rgba(255, 255, 255, 0.16)'
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px rgba(0, 0, 0, 0.45)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.borderColor = 'var(--card-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Poster */}
                <div
                  style={{
                    width: 58,
                    height: 80,
                    borderRadius: 8,
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'var(--sub-bg)',
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)',
                      }}
                    >
                      <i className="ti ti-movie" style={{ fontSize: 24 }} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: 6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {title}
                  </div>

                  {/* Progress & Score */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {targetType === 'Anime'
                        ? `${episodes} / ${totalEpisodes} эп.`
                        : `${episodes} гл.`}
                    </span>
                    {score > 0 && (
                      <span
                        style={{
                          color: '#ffd700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          fontWeight: 700,
                        }}
                      >
                        <i
                          className="ti ti-star-filled"
                          style={{ fontSize: 11 }}
                        />{' '}
                        {score}
                      </span>
                    )}
                  </div>

                  {/* Action +1 */}
                  {r.target_id && (
                    <button
                      onClick={(e) => handleIncrement(r, e)}
                      aria-label={`Отметить +1 ${targetType === 'Anime' ? 'серию' : 'главу'} для ${title}`}
                      style={{
                        marginTop: 8,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(var(--accent-rgb), 0.3)',
                        background: 'rgba(var(--accent-rgb), 0.12)',
                        color: 'var(--accent)',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Отметить +1 серию"
                    >
                      <i className="ti ti-plus" style={{ fontSize: 11 }} />
                      <span>+1 {targetType === 'Anime' ? 'эп.' : 'гл.'}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
