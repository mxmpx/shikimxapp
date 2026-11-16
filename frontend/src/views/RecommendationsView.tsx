import React, { useState, useEffect } from 'react'
import { CatalogItem } from '../types/anime'
import { fetchRecommendations } from '../api/client'
import { AnimeCard } from '../components/AnimeCard'

interface RecommendationsViewProps {
  onOpenAnime: (id: number) => void
}

export function RecommendationsView({ onOpenAnime }: RecommendationsViewProps) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadRecommendations = async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchRecommendations(pageNum, 36)
      if (append) {
        setItems((prev) => {
          const existingIds = new Set(prev.map((a) => a.id))
          const fresh = data.filter((a) => !existingIds.has(a.id))
          return [...prev, ...fresh]
        })
      } else {
        setItems(data)
      }
      setHasMore(data.length >= 18)
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadRecommendations(1, false)
  }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadRecommendations(nextPage, true)
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
          <i className="ti ti-thumb-up" />
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
            Рекомендации аниме
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            Подборки на основе ваших оценок и популярных тайтлов
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
          Подбор рекомендаций...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-thumb-up"
            style={{
              fontSize: 36,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Рекомендации пока не найдены</div>
        </div>
      ) : (
        <>
          <div className="responsive-card-grid">
            {items.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} onSelect={onOpenAnime} />
            ))}
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
                    Загрузить ещё
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
