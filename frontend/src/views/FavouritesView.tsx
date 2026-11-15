import React, { useState, useEffect } from 'react'
import { fetchFavourites } from '../api/client'
import { AnimeCard } from '../components/AnimeCard'

interface FavouritesViewProps {
  onOpenAnime: (id: number) => void
  onOpenManga?: (id: number) => void
}

type FavTab = 'animes' | 'mangas' | 'characters' | 'people'

export function FavouritesView({
  onOpenAnime,
  onOpenManga,
}: FavouritesViewProps) {
  const [data, setData] = useState<{
    animes: any[]
    mangas: any[]
    characters: any[]
    people: any[]
  }>({ animes: [], mangas: [], characters: [], people: [] })
  const [activeTab, setActiveTab] = useState<FavTab>('animes')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavourites()
      .then((res) => {
        setData({
          animes: res.animes || [],
          mangas: res.mangas || [],
          characters: res.characters || [],
          people: res.people || [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const TABS: { id: FavTab; label: string; icon: string; count: number }[] = [
    {
      id: 'animes',
      label: 'Аниме',
      icon: 'ti-movie',
      count: data.animes.length,
    },
    {
      id: 'mangas',
      label: 'Манга',
      icon: 'ti-book-2',
      count: data.mangas.length,
    },
    {
      id: 'characters',
      label: 'Персонажи',
      icon: 'ti-sparkles',
      count: data.characters.length,
    },
    {
      id: 'people',
      label: 'Люди (Авторы / Сэйю)',
      icon: 'ti-users',
      count: data.people.length,
    },
  ]

  const currentItems = data[activeTab]

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
            color: '#f43f5e',
            fontSize: 18,
          }}
        >
          <i className="ti ti-heart" />
        </div>
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Избранное
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            Любимые произведения, персонажи и создатели на Shikimori
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 14,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: isActive
                  ? '1px solid rgba(var(--accent-rgb), 0.45)'
                  : '1px solid var(--border-subtle)',
                background: isActive
                  ? 'var(--primary-container)'
                  : 'var(--sub-bg)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition:
                  'background-color 0.18s ease, border-color 0.18s ease',
              }}
            >
              <i
                className={`ti ${t.icon}`}
                style={{
                  fontSize: 14,
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                }}
              />
              <span>{t.label}</span>
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  color: isActive ? '#cbd5e1' : '#64748b',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
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
            style={{ fontSize: 32, marginRight: 10 }}
          />{' '}
          Загрузка избранного...
        </div>
      ) : currentItems.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-heart-off"
            style={{
              fontSize: 48,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>В этой категории пока ничего нет</div>
        </div>
      ) : activeTab === 'animes' || activeTab === 'mangas' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 18,
          }}
        >
          {currentItems.map((item) => (
            <AnimeCard
              key={item.id}
              anime={{
                id: item.id,
                name: item.name || '',
                russian: item.russian || item.name || '',
                image: item.image || item.image_url || '',
                score: item.score,
                kind: activeTab === 'animes' ? 'Аниме' : 'Манга',
              }}
              onSelect={
                activeTab === 'animes'
                  ? onOpenAnime
                  : onOpenManga
                    ? onOpenManga
                    : (id) =>
                        window.open(
                          `https://shikimori.one/mangas/${id}`,
                          '_blank'
                        )
              }
            />
          ))}
        </div>
      ) : (
        /* Characters & People Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {currentItems.map((item) => {
            const img = item.image || item.image_url || ''
            const title = item.russian || item.name || ''
            const orig =
              item.name && item.name !== item.russian ? item.name : ''
            return (
              <a
                key={item.id}
                href={`https://shikimori.one/${activeTab === 'characters' ? 'characters' : 'people'}/${item.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Открыть на Shikimori: ${title}`}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  transition:
                    'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor =
                    'rgba(255, 255, 255, 0.18)'
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px rgba(0, 0, 0, 0.45)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.borderColor = 'var(--card-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div
                  style={{
                    height: 220,
                    overflow: 'hidden',
                    background: 'var(--sub-bg)',
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <i
                        className={`ti ${activeTab === 'characters' ? 'ti-sparkles' : 'ti-user'}`}
                        style={{ fontSize: 36 }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#f1f5f9',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {title}
                  </div>
                  {orig && (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#64748b',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {orig}
                    </div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
