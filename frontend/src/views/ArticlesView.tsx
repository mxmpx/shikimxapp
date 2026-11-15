import React, { useState, useEffect } from 'react'
import { ArticleItem } from '../types/anime'
import { fetchArticles } from '../api/client'

export function ArticlesView() {
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadArticles = async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchArticles(pageNum, 30)
      if (append) {
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.id))
          const fresh = data.filter((a) => !existingIds.has(a.id))
          return [...prev, ...fresh]
        })
      } else {
        setArticles(data)
      }
      setHasMore(data.length >= 15)
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadArticles(1, false)
  }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadArticles(nextPage, true)
  }

  return (
    <div
      style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 60px' }}
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
          <i className="ti ti-file-text" />
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
            Статьи и аналитика
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            Обзоры индустрии и аналитические материалы от редакции и авторов
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
          Загрузка статей...
        </div>
      ) : articles.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-file-text"
            style={{
              fontSize: 36,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Статьи пока не найдены</div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 18,
            }}
          >
            {articles.map((art) => {
              const cover = art.image || ''
              return (
                <a
                  key={art.id}
                  href={art.url || `https://shikimori.one/articles/${art.id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    transition:
                      'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.borderColor =
                      'rgba(255, 255, 255, 0.16)'
                    e.currentTarget.style.boxShadow =
                      '0 8px 24px rgba(0, 0, 0, 0.45)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Banner / Poster */}
                  <div
                    style={{
                      height: 150,
                      background: cover
                        ? `linear-gradient(to bottom, transparent 30%, rgba(10, 11, 15, 0.95)), url(${cover}) center/cover no-repeat`
                        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(10, 11, 15, 0.95) 100%)',
                      position: 'relative',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    {art.date && (
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: 'rgba(10, 11, 15, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {art.date}
                      </span>
                    )}
                    {art.comments_count !== undefined &&
                      art.comments_count > 0 && (
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: 'rgba(10, 11, 15, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#eab308',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontFamily:
                              'ui-monospace, SFMono-Regular, monospace',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <i
                            className="ti ti-message"
                            style={{ fontSize: 10 }}
                          />
                          {art.comments_count}
                        </span>
                      )}
                  </div>

                  {/* Body Content */}
                  <div
                    style={{
                      padding: '16px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <h4
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#fff',
                        margin: '0 0 8px',
                        lineHeight: 1.35,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {art.title}
                    </h4>

                    {art.snippet && (
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--text-muted)',
                          lineHeight: 1.5,
                          marginBottom: 14,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {art.snippet.replace(/\[\/?\w+.*?\]/g, '')}
                      </div>
                    )}

                    {/* Author Meta */}
                    <div
                      style={{
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'var(--text-dim)',
                        paddingTop: 10,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {art.author ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <i
                            className="ti ti-user"
                            style={{ fontSize: 12, color: 'var(--text-muted)' }}
                          />
                          <span
                            style={{
                              fontWeight: 500,
                              color: 'var(--text-muted)',
                            }}
                          >
                            {art.author}
                          </span>
                        </div>
                      ) : (
                        <span>Редакция</span>
                      )}

                      <span
                        style={{
                          color: 'var(--accent)',
                          fontWeight: 500,
                          fontSize: 11.5,
                        }}
                      >
                        Читать{' '}
                        <i
                          className="ti ti-arrow-right"
                          style={{ fontSize: 11 }}
                        />
                      </span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 36 }}>
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
                    'background-color 0.18s ease, border-color 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loadingMore) {
                    e.currentTarget.style.borderColor = 'var(--accent)'
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
                    Загрузить ещё статьи
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
