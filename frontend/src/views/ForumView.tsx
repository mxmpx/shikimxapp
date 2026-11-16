import React, { useState, useEffect } from 'react'
import { ForumTopic } from '../types/anime'
import { fetchForumTopics } from '../api/client'

const FORUM_CATEGORIES = [
  { id: 'all', label: 'Все темы' },
  { id: 'animanga', label: 'Аниме и Манга' },
  { id: 'news', label: 'Новости' },
  { id: 'critiques', label: 'Рецензии' },
  { id: 'collections', label: 'Коллекции' },
  { id: 'articles', label: 'Статьи' },
  { id: 'offtopic', label: 'Офтопик' },
]

export function ForumView() {
  const [selectedForum, setSelectedForum] = useState('all')
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadTopics = async (
    forumId = selectedForum,
    pageNum = 1,
    append = false
  ) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchForumTopics(forumId, pageNum, 30)
      if (append) {
        setTopics((prev) => {
          const existingIds = new Set(prev.map((t) => t.id))
          const fresh = data.filter((t) => !existingIds.has(t.id))
          return [...prev, ...fresh]
        })
      } else {
        setTopics(data)
      }
      setHasMore(data.length >= 20)
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    setPage(1)
    loadTopics(selectedForum, 1, false)
  }, [selectedForum])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadTopics(selectedForum, nextPage, true)
  }

  return (
    <div
      style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 60px' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
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
          <i className="ti ti-messages" />
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
            Форум сообщества
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            Обсуждения тайтлов, новости индустрии и рецензии пользователей
          </div>
        </div>
      </div>

      {/* Categories nav */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 12,
          marginBottom: 24,
        }}
      >
        {FORUM_CATEGORIES.map((cat) => {
          const isActive = selectedForum === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedForum(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: isActive
                  ? 'var(--primary-container)'
                  : 'var(--sub-bg)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                border: isActive
                  ? '1px solid rgba(var(--accent-rgb), 0.5)'
                  : '1px solid var(--border-subtle)',
                transition:
                  'background-color 0.18s ease, border-color 0.18s ease',
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Topics list */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 280,
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-loader animate-spin"
            style={{ fontSize: 24, marginRight: 12, color: 'var(--accent)' }}
          />
          <span>Загрузка тем форума...</span>
        </div>
      ) : topics.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-messages-off"
            style={{
              fontSize: 36,
              opacity: 0.35,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>В этой категории пока нет тем</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topics.map((t) => {
              const title = t.title || 'Без названия'
              const author = t.author || 'Пользователь'
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (t.url) window.open(t.url, '_blank')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    cursor: 'pointer',
                    transition:
                      'border-color 0.15s ease, background-color 0.15s ease',
                    gap: 16,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      'rgba(255, 255, 255, 0.16)'
                    e.currentTarget.style.backgroundColor = '#151722'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.backgroundColor = 'var(--card-bg)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'var(--sub-bg)',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      <i className="ti ti-message" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 3,
                          fontSize: 11,
                          color: 'var(--text-dim)',
                        }}
                      >
                        {t.author_avatar && (
                          <img
                            src={t.author_avatar}
                            alt={author}
                            onError={(e) => {
                              ;(e.currentTarget as HTMLElement).style.display = 'none'
                            }}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                            }}
                          />
                        )}
                        <span>{author}</span>
                        <span>•</span>
                        <span
                          style={{
                            fontFamily:
                              'ui-monospace, SFMono-Regular, monospace',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {t.created_at ? t.created_at.slice(0, 10) : ''}
                        </span>
                        {t.forum_name && (
                          <>
                            <span>•</span>
                            <span style={{ color: 'var(--accent)' }}>
                              {t.forum_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-muted)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    <i
                      className="ti ti-message-circle-2"
                      style={{ fontSize: 12 }}
                    />
                    <span>{t.comments_count || 0}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  background: 'var(--sub-bg)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition:
                    'background-color 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loadingMore) {
                    e.currentTarget.style.borderColor =
                      'rgba(99, 102, 241, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    'rgba(255, 255, 255, 0.08)'
                }}
              >
                {loadingMore ? (
                  <>
                    <i
                      className="ti ti-loader animate-spin"
                      style={{ color: 'var(--accent)' }}
                    />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <i
                      className="ti ti-plus"
                      style={{ color: 'var(--accent)' }}
                    />
                    Загрузить ещё темы
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
