import React, { useState, useEffect } from 'react'
import { CritiqueItem } from '../types/anime'
import { fetchCritiques } from '../api/client'

interface CritiquesViewProps {
  onOpenAnime: (id: number) => void
  onOpenManga?: (id: number) => void
}

export function CritiquesView({
  onOpenAnime,
  onOpenManga,
}: CritiquesViewProps) {
  const [critiques, setCritiques] = useState<CritiqueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadCritiques = async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchCritiques(pageNum, 30)
      if (append) {
        setCritiques((prev) => {
          const existingIds = new Set(prev.map((c) => c.id))
          const fresh = data.filter((c) => !existingIds.has(c.id))
          return [...prev, ...fresh]
        })
      } else {
        setCritiques(data)
      }
      setHasMore(data.length >= 10)
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadCritiques(1, false)
  }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadCritiques(nextPage, true)
  }

  return (
    <div className="page-container">
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
          <i className="ti ti-pencil" />
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
            Рецензии и отзывы
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            Разборы произведений и мнения участников сообщества
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
          Загрузка рецензий...
        </div>
      ) : critiques.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-pencil"
            style={{
              fontSize: 36,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Рецензии пока не найдены</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {critiques.map((c) => {
              const linkedAnimeId =
                c.linked && c.linked.type === 'Anime' && c.linked.id
                  ? c.linked.id
                  : null
              const linkedMangaId =
                c.linked && c.linked.type === 'Manga' && c.linked.id
                  ? c.linked.id
                  : null
              const linkedTitle = c.linked?.russian || c.linked?.name || ''
              const animeImg = c.image || ''
              return (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 14,
                    padding: '16px 18px',
                    display: 'flex',
                    gap: 16,
                    transition: 'border-color 0.15s ease',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      'rgba(255, 255, 255, 0.16)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                  }}
                >
                  {/* Anime / Manga Poster (if present) */}
                  {animeImg && (
                    <div
                      onClick={() => {
                        if (linkedAnimeId) onOpenAnime(linkedAnimeId)
                        else if (linkedMangaId && onOpenManga)
                          onOpenManga(linkedMangaId)
                      }}
                      style={{
                        width: 74,
                        height: 106,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flexShrink: 0,
                        cursor:
                          linkedAnimeId || linkedMangaId
                            ? 'pointer'
                            : 'default',
                        position: 'relative',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <img
                        src={animeImg}
                        alt={c.title}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement
                          if (target.src !== 'https://shikimori.io/assets/globals/missing_original.jpg') {
                            target.src = 'https://shikimori.io/assets/globals/missing_original.jpg'
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {c.title || 'Рецензия'}
                        </span>

                        {linkedAnimeId && linkedTitle && (
                          <span
                            onClick={() => onOpenAnime(linkedAnimeId)}
                            style={{
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: 'var(--primary-container)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--accent)',
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                            title="Открыть аниме"
                          >
                            {linkedTitle}
                          </span>
                        )}

                        {linkedMangaId && linkedTitle && (
                          <span
                            onClick={() =>
                              onOpenManga
                                ? onOpenManga(linkedMangaId)
                                : window.open(
                                    `https://shikimori.io/mangas/${linkedMangaId}`,
                                    '_blank'
                                  )
                            }
                            style={{
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: 'var(--primary-container)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--accent)',
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                            title="Открыть мангу"
                          >
                            {linkedTitle}
                          </span>
                        )}

                        {c.comments_count !== undefined &&
                          c.comments_count > 0 && (
                            <span
                              style={{
                                fontSize: 11.5,
                                color: 'var(--text-dim)',
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, monospace',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              <i
                                className="ti ti-message"
                                style={{ fontSize: 11 }}
                              />{' '}
                              {c.comments_count}
                            </span>
                          )}
                      </div>

                      <a
                        href={
                          (c.url || `https://shikimori.io/forum/critiques/${c.id}`).replace(
                            'shikimori.one',
                            'shikimori.io'
                          )
                        }
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Читать на Shikimori: ${c.title || 'рецензия'}`}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--accent)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          flexShrink: 0,
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: 'rgba(var(--accent-rgb), 0.08)',
                          minHeight: 32,
                        }}
                      >
                        Читать на Shikimori{' '}
                        <i
                          className="ti ti-external-link"
                          style={{ fontSize: 11 }}
                        />
                      </a>
                    </div>

                    {/* Excerpt */}
                    {c.snippet && (
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--text-muted)',
                          lineHeight: 1.5,
                          marginBottom: 10,
                          maxHeight: 64,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {c.snippet.replace(/\[\/?\w+.*?\]/g, '')}
                      </div>
                    )}

                    {/* Author Meta */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 11.5,
                        color: 'var(--text-dim)',
                      }}
                    >
                      {c.author && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <i
                            className="ti ti-user"
                            style={{ fontSize: 11, color: 'var(--text-muted)' }}
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
                      )}
                      {c.date && (
                        <span
                          style={{
                            fontFamily:
                              'ui-monospace, SFMono-Regular, monospace',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          • {c.date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
                    Загрузить ещё рецензии
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
