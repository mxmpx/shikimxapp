import React from 'react'
import { SectionLabel } from '../AnimeModalIcons'

interface RelatedItem {
  id: number
  name: string
  kind: string
  relation?: string
  image: string
}

interface AnimeRelatedTimelineProps {
  related?: RelatedItem[]
}

export function relationColor(rel?: string) {
  if (rel === 'Сиквел') {
    return {
      bg: 'rgba(209,153,255,0.16)',
      fg: '#d199ff',
      border: 'rgba(209,153,255,0.3)',
    }
  }
  if (rel === 'Приквел') {
    return {
      bg: 'rgba(56,189,248,0.16)',
      fg: '#38bdf8',
      border: 'rgba(56,189,248,0.3)',
    }
  }
  if (rel === 'Основное') {
    return {
      bg: 'rgba(74,222,128,0.16)',
      fg: '#4ade80',
      border: 'rgba(74,222,128,0.3)',
    }
  }
  return {
    bg: 'rgba(251,191,36,0.16)',
    fg: '#fbbf24',
    border: 'rgba(251,191,36,0.3)',
  }
}

export function AnimeRelatedTimeline({ related }: AnimeRelatedTimelineProps) {
  if (!related || related.length === 0) {
    return null
  }

  return (
    <div className="reveal-on-scroll">
      <SectionLabel icon="ti ti-git-fork">
        ХРОНОЛОГИЯ И СВЯЗАННЫЕ ТАЙТЛЫ
      </SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {related.map((item, idx) => {
          const rc = relationColor(item.relation)
          const isMain = item.relation === 'Основное'
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 38,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: idx === 0 ? 0 : 2,
                    flex: '0 0 12px',
                    background: 'rgba(var(--accent-rgb), 0.25)',
                  }}
                />
                <div
                  style={{
                    width: isMain ? 14 : 10,
                    height: isMain ? 14 : 10,
                    borderRadius: '50%',
                    background: isMain
                      ? '#6366f1'
                      : 'rgba(255, 255, 255, 0.2)',
                    border: isMain
                      ? '2px solid #818cf8'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    width: idx === (related.length || 1) - 1 ? 0 : 2,
                    flex: 1,
                    minHeight: 14,
                    background: 'rgba(var(--accent-rgb), 0.25)',
                  }}
                />
              </div>

              <div
                className="timeline-card reveal-slide-left"
                style={{
                  flex: 1,
                  minWidth: 0,
                  maxWidth: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 16px 10px 10px',
                  margin: '4px 0',
                  borderRadius: 14,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  background: isMain
                    ? 'rgba(var(--accent-rgb), 0.12)'
                    : 'var(--card-bg)',
                  border: isMain
                    ? '1px solid rgba(var(--accent-rgb), 0.35)'
                    : '1px solid var(--card-border)',
                  transition: 'all 0.18s ease',
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
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
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      fontWeight: isMain ? 700 : 600,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      color: 'var(--text-dim)',
                      fontSize: 11,
                      marginTop: 3,
                    }}
                  >
                    {item.kind}
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                    background: rc.bg,
                    color: rc.fg,
                    border: `1px solid ${rc.border}`,
                  }}
                >
                  {item.relation || 'Основное'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
