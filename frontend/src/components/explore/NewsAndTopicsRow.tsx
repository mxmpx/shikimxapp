import React from 'react'
import { NewsTopic, FeedTopic } from '../../types/anime'

interface NewsAndTopicsRowProps {
  news: NewsTopic[]
  hotTopics: FeedTopic[]
  onNavigateTab?: (tab: string) => void
}

export function NewsAndTopicsRow({
  news,
  hotTopics,
  onNavigateTab,
}: NewsAndTopicsRowProps) {
  if (news.length === 0 && hotTopics.length === 0) return null

  return (
    <section style={{ marginBottom: 40 }} className="reveal-slide-up">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
          gap: 16,
        }}
      >
        {/* News Block */}
        {news.length > 0 && (
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-card, 14px)',
              padding: '18px 20px',
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                <i className="ti ti-news" style={{ color: 'var(--text-dim)' }} />
                <span>Новости индустрии</span>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('forum')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Все новости →
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {news.slice(0, 5).map((n) => (
                <a
                  key={n.id}
                  href={
                    (n.url || `https://shikimori.io/forum/news/${n.id}`).replace(
                      'shikimori.one',
                      'shikimori.io'
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'transparent',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  {n.image && (
                    <img
                      src={n.image}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLElement).style.display = 'none'
                      }}
                      style={{
                        width: 54,
                        height: 38,
                        objectFit: 'cover',
                        borderRadius: 6,
                        flexShrink: 0,
                        background: '#111218',
                      }}
                    />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.35,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        marginTop: 3,
                      }}
                    >
                      {[
                        n.author,
                        n.date,
                        n.comments_count !== undefined
                          ? `${n.comments_count} комм.`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Hot Topics */}
        {hotTopics.length > 0 && (
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-card, 14px)',
              padding: '18px 20px',
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                <i className="ti ti-flame" style={{ color: 'var(--text-dim)' }} />
                <span>Темы дня</span>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('forum')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Форум →
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hotTopics.slice(0, 5).map((t) => (
                <a
                  key={t.id}
                  href={
                    (t.url || `https://shikimori.io/forum/animanga/${t.id}`).replace(
                      'shikimori.one',
                      'shikimori.io'
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'transparent',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--subtle-hover-bg)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      marginTop: 3,
                    }}
                  >
                    {[
                      t.author,
                      t.comments_count !== undefined
                        ? `${t.comments_count} ответов`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
