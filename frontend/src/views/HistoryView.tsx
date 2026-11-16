import React, { useState, useEffect } from 'react'
import { fetchHistory } from '../api/client'

interface HistoryViewProps {
  onOpenAnime: (id: number) => void
}

export function HistoryView({ onOpenAnime }: HistoryViewProps) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 32px 60px' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 28,
        }}
      >
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
          <i className="ti ti-history" />
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
            История активности
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            Хронология ваших просмотров и изменений в списках
          </div>
        </div>
      </div>

      {loading ? (
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
          Загрузка истории...
        </div>
      ) : history.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-history"
            style={{
              fontSize: 36,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>История активности пока пуста</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((item) => {
            const target = item.target || {}
            const title =
              target.russian || target.name || item.description || 'Действие'
            const img =
              target.image || (target.image && target.image.preview) || ''
            const isAnime = item.target_type === 'Anime' || !item.target_type
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleString('ru-RU')
              : ''

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    'rgba(255, 255, 255, 0.16)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--card-border)'
                }}
              >
                {/* Poster */}
                {img ? (
                  <img
                    src={img}
                    alt={title}
                    onError={(e) => {
                      const targetEl = e.currentTarget as HTMLImageElement
                      if (targetEl.src !== 'https://shikimori.io/assets/globals/missing_original.jpg') {
                        targetEl.src = 'https://shikimori.io/assets/globals/missing_original.jpg'
                      }
                    }}
                    style={{
                      width: 40,
                      height: 54,
                      borderRadius: 6,
                      objectFit: 'cover',
                      cursor: isAnime && target.id ? 'pointer' : 'default',
                    }}
                    onClick={() =>
                      isAnime && target.id && onOpenAnime(target.id)
                    }
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 54,
                      borderRadius: 6,
                      background: 'var(--sub-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <i className="ti ti-movie" style={{ fontSize: 18 }} />
                  </div>
                )}

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    {isAnime && target.id ? (
                      <span
                        onClick={() => onOpenAnime(target.id)}
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = 'var(--accent)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = 'var(--text-primary)')
                        }
                      >
                        {title}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {title}
                      </span>
                    )}

                    {item.description && (
                      <span
                        style={{
                          fontSize: 11.5,
                          color: 'var(--text-muted)',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '2px 7px',
                          borderRadius: 4,
                          fontWeight: 500,
                        }}
                      >
                        {item.description}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-dim)',
                      marginTop: 4,
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {dateStr && <span>{dateStr}</span>}
                  </div>
                </div>

                {isAnime && target.id && (
                  <button
                    onClick={() => onOpenAnime(target.id)}
                    aria-label={`Смотреть: ${title}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'var(--primary-container)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'background-color 0.18s ease',
                    }}
                  >
                    <i className="ti ti-player-play" style={{ fontSize: 12 }} />
                    <span>Смотреть</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
