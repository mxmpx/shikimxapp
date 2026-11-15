import React from 'react'
import { AnimeCommunityData } from '../../types/anime'
import { SectionLabel } from '../AnimeModalIcons'

interface AnimeCommunitySectionProps {
  community: AnimeCommunityData | null
}

export function AnimeCommunitySection({ community }: AnimeCommunitySectionProps) {
  return (
    <>
      {/* ── Friends / Community Watchers Status ── */}
      <div
        className="reveal-on-scroll"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <SectionLabel icon="ti ti-users">
          {community?.is_authorized && community.friends.length > 0
            ? 'У ДРУЗЕЙ'
            : 'СМОТРЯТ НА SHIKIMORI'}
        </SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {community?.is_authorized && community.friends.length === 0 && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-dim)',
                padding: '2px 4px',
              }}
            >
              Никто из друзей ещё не добавил этот тайтл
            </div>
          )}

          {(
            community?.is_authorized && community.friends.length > 0
              ? community.friends
              : (community?.community_watchers || [])
          ).map((fr) => (
            <a
              key={fr.id}
              href={`https://shikimori.one/${encodeURIComponent(fr.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="reveal-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--card-border)',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
              }}
              title={`Открыть профиль ${fr.name} на Shikimori`}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <img
                  src={fr.avatar}
                  alt={fr.name}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid rgba(var(--accent-rgb), 0.35)',
                  }}
                />
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {fr.name}
                </span>
              </div>
              <span
                style={{
                  color: fr.status_color || '#38bdf8',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {fr.status}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── In Favorites / Community Members Grid ── */}
      {community?.favorites && community.favorites.length > 0 && (
        <div
          className="reveal-on-scroll"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                color: '#818cf8',
                fontWeight: 800,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              В СПИСКАХ
            </span>
            {community.total_favorites ? (
              <span
                style={{
                  color: '#d97706',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                ({community.total_favorites})
              </span>
            ) : null}
          </div>
          <div
            className="stagger-children"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 8,
              marginTop: 2,
            }}
          >
            {community.favorites.map((u) => (
              <a
                key={u.id}
                href={`https://shikimori.one/${encodeURIComponent(u.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="favorite-avatar reveal-pop"
                style={{
                  aspectRatio: '1/1',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  transition: 'all 0.18s ease',
                  display: 'block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                  e.currentTarget.style.transform = 'scale(1.08)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                title={`${u.name} (${u.status})`}
              >
                <img
                  src={u.avatar}
                  alt={u.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
