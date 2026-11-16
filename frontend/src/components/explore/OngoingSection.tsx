import React from 'react'
import { OnScreenItem, AnimeUpdateItem, FeedTopic } from '../../types/anime'
import { AnimeCard } from '../AnimeCard'

interface OngoingSectionProps {
  loadingExplore: boolean
  onScreens: OnScreenItem[]
  updates: AnimeUpdateItem[]
  communityContent: FeedTopic[]
  onOpenAnime: (id: number) => void
  onNavigateTab?: (tab: string) => void
}

export function OngoingSection({
  loadingExplore,
  onScreens,
  updates,
  communityContent,
  onOpenAnime,
  onNavigateTab,
}: OngoingSectionProps) {
  return (
    <>
      {/* 1. On-screens / seasonal ongoings */}
      <section style={{ marginBottom: 40 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Онгоинги этого сезона
            </h3>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('calendar')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Расписание выхода серий →
            </button>
          )}
        </div>

        {loadingExplore ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: 'var(--text-dim)',
            }}
          >
            <i
              className="ti ti-loader animate-spin"
              style={{ fontSize: 28, marginRight: 10 }}
            />{' '}
            Загрузка онгоингов...
          </div>
        ) : onScreens.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--text-dim)',
            }}
          >
            <i
              className="ti ti-calendar-off"
              style={{
                fontSize: 36,
                opacity: 0.35,
                marginBottom: 10,
                display: 'block',
              }}
            />
            <div>Список онгоингов пока пуст</div>
          </div>
        ) : (
          <div className="responsive-card-grid">
            {onScreens.slice(0, 16).map((item) => (
              <AnimeCard
                key={item.id}
                anime={{ ...item, status: item.studios || item.kind }}
                onSelect={onOpenAnime}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. Anime updates */}
      {updates.length > 0 && (
        <section style={{ marginBottom: 40 }} className="reveal-slide-up">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <i
              className="ti ti-refresh"
              style={{ color: 'var(--accent)', fontSize: 20 }}
            />
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Обновления каталога
            </h3>
          </div>
          <div className="responsive-card-grid">
            {updates.slice(0, 16).map((item) => (
              <AnimeCard
                key={item.id}
                anime={{
                  ...item,
                  genres: undefined,
                  status: item.genres || item.status,
                }}
                onSelect={onOpenAnime}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. Community materials */}
      {communityContent.length > 0 && (
        <section style={{ marginBottom: 40 }} className="reveal-slide-up">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i
                className="ti ti-article"
                style={{ color: 'var(--accent)', fontSize: 20 }}
              />
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Материалы сообщества
              </h3>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('articles')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Все материалы →
              </button>
            )}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {communityContent.slice(0, 9).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'border-color 0.15s ease, transform 0.15s ease',
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
                {item.tag && (
                  <span
                    style={{
                      alignSelf: 'flex-start',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'rgba(var(--accent-rgb), 0.12)',
                    }}
                  >
                    {item.tag}
                  </span>
                )}
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-dim)',
                    marginTop: 'auto',
                  }}
                >
                  {[
                    item.author,
                    item.date,
                    item.comments_count !== undefined
                      ? `${item.comments_count} комм.`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
