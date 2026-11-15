import React, { useState, useEffect } from 'react'
import { MangaItem } from '../types/anime'
import { fetchRanobeCatalog } from '../api/client'

interface RanobeViewProps {
  onOpenManga: (id: number) => void
}

export function RanobeView({ onOpenManga }: RanobeViewProps) {
  const [items, setItems] = useState<MangaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [order, setOrder] = useState('ranked')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetchRanobeCatalog(page, status, order, searchQuery)
      .then((data) => setItems(data))
      .finally(() => setLoading(false))
  }, [page, status, order, searchQuery])

  return (
    <div
      style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 60px' }}
    >
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
            <i className="ti ti-notebook" />
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
              Каталог ранобэ
            </h2>
            <div
              style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}
            >
              Японские новеллы и иллюстрированные романы
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск ранобэ..."
            aria-label="Поиск ранобэ"
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
            aria-label="Фильтр по статусу ранобэ"
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
            aria-label="Сортировка ранобэ"
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
          <span>Загрузка каталога ранобэ...</span>
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
            className="ti ti-notebook"
            style={{
              fontSize: 36,
              opacity: 0.35,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Ранобэ не найдено по заданным критериям</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 18,
          }}
        >
          {items.map((ranobe) => (
            <div
              key={ranobe.id}
              role="button"
              tabIndex={0}
              aria-label={`Открыть ранобэ: ${ranobe.russian || ranobe.name}`}
              onClick={() => onOpenManga(ranobe.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenManga(ranobe.id)
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
                  src={ranobe.image}
                  alt={ranobe.russian || ranobe.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {ranobe.score ? (
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
                    <span>{Number(ranobe.score).toFixed(1)}</span>
                  </div>
                ) : null}
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
                  title={ranobe.russian || ranobe.name}
                >
                  {ranobe.russian || ranobe.name}
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
                  <span>{ranobe.volumes ? `${ranobe.volumes} том.` : '—'}</span>
                  <span>{ranobe.chapters ? `${ranobe.chapters} гл.` : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
