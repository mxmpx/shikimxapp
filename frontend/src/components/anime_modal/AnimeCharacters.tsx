import React, { useState } from 'react'
import { SectionLabel } from '../AnimeModalIcons'
import { CharacterItem } from '../../types/anime'

interface AnimeCharactersProps {
  characters?: CharacterItem[]
}

export function AnimeCharacters({ characters }: AnimeCharactersProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  if (!characters || characters.length === 0) {
    return null
  }

  return (
    <div
      className="reveal-on-scroll"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <SectionLabel
          icon="ti ti-users"
          style={{ marginBottom: 0 }}
        >
          ПЕРСОНАЖИ И СЭЙЮ
        </SectionLabel>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 999,
            background: 'rgba(var(--accent-rgb), 0.1)',
            border: '1px solid rgba(var(--accent-rgb), 0.22)',
            color: 'var(--accent)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <i className="ti ti-users" style={{ fontSize: 12 }} />
          <span>{characters.length} персонажей</span>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          padding: '16px 8px 18px 8px',
          margin: '-8px -8px 0 -8px',
        }}
      >
        {characters.map((char) => {
          const isHovered = hoveredCard === char.id
          return (
            <div
              key={char.id}
              className="character-card reveal-item"
              style={{
                flexShrink: 0,
                width: 130,
                borderRadius: 16,
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                background: isHovered
                  ? 'var(--card-hover-bg)'
                  : 'var(--card-bg)',
                border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.08)'}`,
                transition:
                  'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered
                  ? '0 8px 24px rgba(0, 0, 0, 0.45)'
                  : 'none',
              }}
              onMouseEnter={() => setHoveredCard(char.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <img
                src={char.image || 'https://shikimori.io/assets/globals/missing_original.jpg'}
                alt={char.name}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  if (target.src !== 'https://shikimori.io/assets/globals/missing_original.jpg') {
                    target.src = 'https://shikimori.io/assets/globals/missing_original.jpg'
                  }
                }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: 106,
                  }}
                >
                  {char.name}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: 6,
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 9.5,
                    fontWeight: 700,
                    background:
                      char.role === 'Главный'
                        ? 'rgba(var(--accent-rgb), 0.18)'
                        : 'rgba(255,255,255,0.06)',
                    color:
                      char.role === 'Главный'
                        ? 'var(--accent)'
                        : 'var(--text-dim)',
                  }}
                >
                  {char.role}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
