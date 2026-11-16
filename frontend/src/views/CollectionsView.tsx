import React, { useState, useEffect } from 'react'
import { CollectionItem } from '../types/anime'
import { fetchCollections } from '../api/client'

export function CollectionsView() {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadCollections = async (query = '', pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchCollections(query, pageNum, 60)
      if (append) {
        setCollections((prev) => {
          const existingIds = new Set(prev.map((c) => c.id))
          const fresh = data.filter((c) => !existingIds.has(c.id))
          return [...prev, ...fresh]
        })
      } else {
        setCollections(data)
      }
      setHasMore(data.length >= 25)
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
    const timer = setTimeout(() => {
      loadCollections(search, 1, false)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadCollections(search, nextPage, true)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <i className="ti ti-layout-grid" />
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
              Коллекции пользователей
            </h2>
            <div
              style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}
            >
              Тематические подборки аниме и манги от участников сообщества
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <i
            className="ti ti-search"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
              fontSize: 14,
            }}
          />
          <input
            type="search"
            id="collections-search"
            name="collections_search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск коллекций..."
            aria-label="Поиск коллекций"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            style={{
              width: '100%',
              height: 38,
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '0 14px 0 36px',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.18s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          />
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
          Загрузка коллекций...
        </div>
      ) : collections.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-layout-grid"
            style={{
              fontSize: 36,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Коллекции пока не найдены</div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))',
              gap: 14,
            }}
          >
            {collections.map((c) => {
              const cover = c.image || ''
              return (
                <a
                  key={c.id}
                  href={
                    (c.url || `https://shikimori.io/collections/${c.id}`).replace(
                      'shikimori.one',
                      'shikimori.io'
                    )
                  }
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
                  {/* Cover Banner */}
                  <div
                    style={{
                      height: 140,
                      background: cover
                        ? `linear-gradient(to bottom, transparent 40%, rgba(10, 11, 15, 0.95)), url(${cover}) center/cover no-repeat`
                        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(10, 11, 15, 0.95) 100%)',
                      position: 'relative',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    {c.date && (
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
                        {c.date}
                      </span>
                    )}
                    {c.comments_count !== undefined && c.comments_count > 0 && (
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
                          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <i className="ti ti-message" style={{ fontSize: 10 }} />
                        {c.comments_count}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div
                    style={{
                      padding: '16px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: '0 0 10px',
                        lineHeight: 1.35,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {c.title}
                    </h3>

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
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {c.author ? (
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
                            {c.author}
                          </span>
                        </div>
                      ) : (
                        <span>Сообщество</span>
                      )}

                      <span
                        style={{
                          color: 'var(--accent)',
                          fontWeight: 500,
                          fontSize: 11.5,
                        }}
                      >
                        Открыть{' '}
                        <i
                          className="ti ti-external-link"
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
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
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
                    Загрузить ещё коллекции
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
