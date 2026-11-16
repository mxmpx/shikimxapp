import React from 'react'
import { ContinueWatchingItem } from '../../types/anime'

interface ContinueWatchingBannerProps {
  continueList: ContinueWatchingItem[]
  onOpenAnime: (id: number) => void
  onDeleteContinue: (id: number, e: React.MouseEvent) => void
}

export function ContinueWatchingBanner({
  continueList,
  onOpenAnime,
  onDeleteContinue,
}: ContinueWatchingBannerProps) {
  if (continueList.length === 0) return null

  return (
    <section className="reveal-pop" style={{ marginBottom: 36 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(var(--accent-rgb), 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <i className="ti ti-player-play-filled" style={{ fontSize: 16 }} />
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Продолжить просмотр
          </h3>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {continueList.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpenAnime(item.id)}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.5)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <img
              src={item.image}
              alt={item.title}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                if (target.src !== 'https://shikimori.io/assets/globals/missing_original.jpg') {
                  target.src = 'https://shikimori.io/assets/globals/missing_original.jpg'
                }
              }}
              style={{
                width: 44,
                height: 60,
                borderRadius: 8,
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--accent)',
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                Серия {item.episode || 1}
                {item.translation && ` • ${item.translation}`}
              </div>
              {item.duration && item.time ? (
                <div
                  style={{
                    fontSize: 10.5,
                    color: 'var(--text-dim)',
                    marginTop: 2,
                  }}
                >
                  {Math.floor(item.time / 60)} мин. / {Math.floor(item.duration / 60)} мин.
                </div>
              ) : null}
            </div>

            <button
              onClick={(e) => onDeleteContinue(item.id, e)}
              aria-label="Удалить из продолжения просмотра"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: 4,
              }}
              title="Удалить из списка"
            >
              <i className="ti ti-x" style={{ fontSize: 14 }} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
