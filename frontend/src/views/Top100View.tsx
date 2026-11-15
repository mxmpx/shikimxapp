import React, { useState, useEffect, useRef } from 'react'
import { CatalogItem } from '../types/anime'
import { fetchTop100, Top100Type } from '../api/client'
import { AnimeCard } from '../components/AnimeCard'

interface Top100ViewProps {
  onOpenAnime: (id: number) => void
  onOpenManga?: (id: number) => void
}

const TOP_TABS: { id: Top100Type; label: string; icon: string }[] = [
  { id: 'anime', label: 'Аниме', icon: 'ti-movie' },
  { id: 'ongoing', label: 'Онгоинги', icon: 'ti-player-play' },
  { id: 'movie', label: 'Фильмы', icon: 'ti-clapperboard' },
  { id: 'manga', label: 'Манга', icon: 'ti-book-2' },
]

export function Top100View({ onOpenAnime, onOpenManga }: Top100ViewProps) {
  const cacheRef = useRef<Partial<Record<Top100Type, CatalogItem[]>>>({})
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<Top100Type>('anime')

  const loadData = (targetType: Top100Type, forceRefresh = false) => {
    const cached = cacheRef.current[targetType]
    if (!forceRefresh && cached && cached.length > 0) {
      setItems(cached)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTop100(targetType, 100)
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data) && data.length > 0) {
          cacheRef.current[targetType] = data
          setItems(data)
          setError(null)
        } else {
          setItems([])
          setError(
            'Не удалось загрузить рейтинг. Проверьте соединение или повторите попытку.'
          )
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Ошибка загрузки Топ-100:', err)
        setError('Произошла ошибка при загрузке. Попробуйте снова.')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }

  useEffect(() => {
    const cleanup = loadData(type)
    return () => {
      if (cleanup) cleanup()
    }
  }, [type])

  const openItem = (id: number) => {
    if (type === 'manga') {
      if (onOpenManga) {
        onOpenManga(id)
      } else {
        window.open(
          `https://shikimori.one/mangas/${id}`,
          '_blank',
          'noopener,noreferrer'
        )
      }
    } else {
      onOpenAnime(id)
    }
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
            color: '#eab308',
            fontSize: 20,
          }}
        >
          <i className="ti ti-trophy" />
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
            Топ-100 лучших
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            Рейтинг составлен по оценкам сотен тысяч зрителей Shikimori
          </div>
        </div>
      </div>

      {/* Type tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {TOP_TABS.map((tab) => {
          const isActive = type === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: isActive
                  ? 'var(--primary-container)'
                  : 'var(--sub-bg)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                border: isActive
                  ? '1px solid rgba(var(--accent-rgb), 0.5)'
                  : '1px solid var(--border-subtle)',
                transition:
                  'background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease',
              }}
            >
              <i className={`ti ${tab.icon}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 300,
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-loader animate-spin"
            style={{ fontSize: 24, marginRight: 12, color: 'var(--accent)' }}
          />
          <span>Загрузка Топ-100...</span>
        </div>
      ) : error ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-alert-triangle"
            style={{
              fontSize: 36,
              color: '#f87171',
              opacity: 0.85,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div
            style={{
              color: 'var(--text-primary)',
              fontWeight: 500,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {error}
          </div>
          <button
            onClick={() => loadData(type, true)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              background: 'var(--primary-container)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <i className="ti ti-refresh" />
            Повторить попытку
          </button>
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
            className="ti ti-trophy-off"
            style={{
              fontSize: 36,
              opacity: 0.35,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Рейтинг пока недоступен</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 18,
          }}
        >
          {items.map((anime, idx) => {
            const rank = anime.rank || idx + 1
            const isTop1 = rank === 1
            const isTop2 = rank === 2
            const isTop3 = rank === 3
            return (
              <div key={`${type}_${anime.id}`} style={{ position: 'relative' }}>
                <AnimeCard anime={anime} onSelect={openItem} />
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: isTop1
                      ? '#eab308'
                      : isTop2
                        ? '#94a3b8'
                        : isTop3
                          ? '#b45309'
                          : 'rgba(10, 11, 15, 0.88)',
                    color: isTop1 || isTop2 ? '#0a0b0f' : '#ffffff',
                    border:
                      isTop1 || isTop2 || isTop3
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.12)',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontVariantNumeric: 'tabular-nums',
                    zIndex: 5,
                    pointerEvents: 'none',
                  }}
                >
                  #{rank}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
