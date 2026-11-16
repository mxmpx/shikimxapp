import React from 'react'
import { CatalogItem } from '../types/anime'

interface AnimeCardProps {
  anime: CatalogItem
  onSelect: (id: number) => void
}

export function AnimeCard({ anime, onSelect }: AnimeCardProps) {
  const title = anime.russian || anime.name
  const year = anime.year || ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(anime.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(anime.id)
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-card, 14px)',
        overflow: 'hidden',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        cursor: 'pointer',
        transition:
          'border-color 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease',
        position: 'relative',
      }}
      className="reveal-pop motion-reduce:transform-none motion-reduce:transition-none"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'var(--card-hover-border)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.45)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.borderColor = 'var(--card-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Poster with 2/3 aspect ratio */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '2/3',
          overflow: 'hidden',
          background: 'var(--sub-bg)',
        }}
      >
        <img
          src={
            anime.image ||
            'https://shikimori.io/assets/globals/missing_original.jpg'
          }
          alt={title}
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement
            if (
              target.src !==
              'https://shikimori.io/assets/globals/missing_original.jpg'
            ) {
              target.src =
                'https://shikimori.io/assets/globals/missing_original.jpg'
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Score Badge */}
        {anime.score ? (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              borderRadius: 6,
              background: 'rgba(10, 11, 15, 0.85)',
              backdropFilter: 'blur(6px)',
              border:
                '1px solid var(--accent-gold-border, rgba(234, 179, 8, 0.3))',
              color: 'var(--score-color, #eab308)',
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <i className="ti ti-star-filled" style={{ fontSize: 10.5 }} />
            <span>{Number(anime.score).toFixed(1)}</span>
          </div>
        ) : null}

        {/* Kind badge */}
        {anime.kind && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              padding: '2px 7px',
              borderRadius: 4,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            {anime.kind}
          </div>
        )}
      </div>

      {/* Info Block */}
      <div
        style={{
          padding: '10px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 34,
          }}
          title={title}
        >
          {title}
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-dim)',
            marginTop: 'auto',
          }}
        >
          <span>
            {year || (anime.episodes ? `${anime.episodes} эп.` : 'Онгоинг')}
          </span>
          {anime.status && (
            <span
              style={{
                color:
                  anime.status === 'Онгоинг'
                    ? 'var(--accent)'
                    : 'var(--text-dim)',
              }}
            >
              {anime.status}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
