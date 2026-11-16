import React, { useState, useEffect } from 'react'
import { MangaItem } from '../types/anime'
import { fetchMangaCatalog } from '../api/client'

interface MangaViewProps {
  onOpenManga: (id: number) => void
}

export function MangaView({ onOpenManga }: MangaViewProps) {
  const [items, setItems] = useState<MangaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [order, setOrder] = useState('ranked')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetchMangaCatalog(page, status, order, searchQuery)
      .then((data) => setItems(data))
      .finally(() => setLoading(false))
  }, [page, status, order, searchQuery])

  return (
    <div className="page-container">
      {/* Header and Filter Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
            <i className="ti ti-book-2" />
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
              Каталог манги
            </h2>
            <div
              style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}
            >
              Манга, манхва, маньхуа и комиксы
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="search"
            id="manga-filter-search"
            name="manga_search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск манги..."
            aria-label="Поиск манги"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              width: 180,
              transition: 'border-color 0.18s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Фильтр по статусу манги"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Любой статус</option>
            <option value="ongoing">Выходит</option>
            <option value="released">Издано</option>
          </select>

          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            aria-label="Сортировка манги"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ranked">По рейтингу</option>
            <option value="popularity">По популярности</option>
            <option value="name">По алфавиту</option>
          </select>
        </div>
      </div>

      {/* Grid of Manga Cards */}
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
          <span>Загрузка каталога манги...</span>
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
            className="ti ti-book"
            style={{
              fontSize: 36,
              opacity: 0.35,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Манга не найдена по заданным критериям</div>
        </div>
      ) : (
        <div className="responsive-card-grid">
          {items.map((manga) => (
            <div
              key={manga.id}
              role="button"
              tabIndex={0}
              aria-label={`Открыть мангу: ${manga.russian || manga.name}`}
              onClick={() => onOpenManga(manga.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenManga(manga.id)
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                cursor: 'pointer',
                transition:
                  'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)'
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
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '2/3',
                  overflow: 'hidden',
                  background: 'var(--sub-bg)',
                }}
              >
                <img
                  src={manga.image}
                  alt={manga.russian || manga.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {manga.score ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 6px',
                      borderRadius: 6,
                      background: 'rgba(10, 11, 15, 0.88)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#eab308',
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <i className="ti ti-star-filled" style={{ fontSize: 10 }} />
                    <span>{Number(manga.score).toFixed(1)}</span>
                  </div>
                ) : null}
                {manga.kind && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      padding: '2px 6px',
                      borderRadius: 6,
                      background: 'rgba(10, 11, 15, 0.88)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-muted)',
                      fontSize: 10,
                      fontWeight: 500,
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      textTransform: 'uppercase',
                    }}
                  >
                    {manga.kind}
                  </div>
                )}
              </div>
              <div
                style={{
                  padding: '10px 12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={manga.russian || manga.name}
                >
                  {manga.russian || manga.name}
                </span>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11,
                    color: 'var(--text-dim)',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span>{manga.volumes ? `${manga.volumes} том.` : '—'}</span>
                  <span>{manga.chapters ? `${manga.chapters} гл.` : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
