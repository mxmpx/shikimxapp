import React from 'react'
import { OnScreenItem } from '../../types/anime'

interface SeasonalHeroBannerProps {
  featuredAnime: OnScreenItem | { id: number; russian: string; name: string; image?: string; score?: string | number }
  onOpenAnime: (id: number) => void
  onRandomAnime: () => void
}

export function SeasonalHeroBanner({
  featuredAnime,
  onOpenAnime,
  onRandomAnime,
}: SeasonalHeroBannerProps) {
  return (
    <div
      className="reveal-pop"
      style={{
        borderRadius: 'var(--radius-card, 14px)',
        minHeight: 280,
        background: 'var(--hero-banner-bg, #111218)',
        border: '1px solid var(--card-border)',
        marginBottom: 36,
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {featuredAnime.image && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '58%',
            backgroundImage: `url(${featuredAnime.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 25%, #000 80%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 25%, #000 80%)',
            opacity: 0.65,
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(10, 11, 15, 0.85) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 40px)',
          maxWidth: 620,
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
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            Сезонный хит
          </span>
          {featuredAnime.score && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--accent-gold, #eab308)',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <i className="ti ti-star-filled" style={{ fontSize: 11 }} />
              <span>{Number(featuredAnime.score).toFixed(1)}</span>
            </span>
          )}
        </div>

        <h2
          style={{
            fontSize: 'clamp(20px, 3.5vw, 30px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 10px',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
          }}
        >
          {featuredAnime.russian || featuredAnime.name}
        </h2>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 13.5,
            lineHeight: 1.6,
            margin: '0 0 24px',
            maxWidth: 520,
          }}
        >
          Синхронизация списков Shikimori, мульти-агрегатор озвучек и
          встроенный плеер для непрерывного просмотра.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => onOpenAnime(featuredAnime.id)}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#ffffff',
              color: '#0a0b0f',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <i className="ti ti-player-play-filled" style={{ fontSize: 13 }} />
            <span>Смотреть тайтл</span>
          </button>

          <button
            onClick={onRandomAnime}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
            }}
          >
            <i
              className="ti ti-arrows-shuffle"
              style={{ fontSize: 14, color: 'var(--text-dim)' }}
            />
            <span>Случайное аниме</span>
          </button>
        </div>
      </div>
    </div>
  )
}
