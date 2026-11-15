import React, { useState, useEffect } from 'react'
import { CatalogItem } from '../types/anime'
import { fetchCatalog } from '../api/client'
import { AnimeCard } from '../components/AnimeCard'

interface CatalogViewProps {
  onOpenAnime: (id: number) => void
}

const GENRES = [
  { id: '', label: 'Все жанры' },
  { id: '1', label: 'Экшен' },
  { id: '2', label: 'Приключения' },
  { id: '4', label: 'Комедия' },
  { id: '8', label: 'Драма' },
  { id: '10', label: 'Фэнтези' },
  { id: '22', label: 'Романтика' },
  { id: '24', label: 'Фантастика' },
  { id: '27', label: 'Сёнен' },
  { id: '37', label: 'Сверхъестественное' },
]

export function CatalogView({ onOpenAnime }: CatalogViewProps) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState('')
  const [order, setOrder] = useState('popularity')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetchCatalog({
      page,
      genre: selectedGenre,
      order,
    })
      .then((data) => {
        setItems(data)
      })
      .finally(() => setLoading(false))
  }, [page, selectedGenre, order])

  return (
    <div
      style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 60px' }}
    >
      {/* Header and Controls */}
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
            Каталог аниме
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            Поиск и фильтрация по жанрам и рейтингу
          </div>
        </div>

        {/* Sort Order Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Сортировка:
          </span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--input-border)'
            }}
          >
            <option value="popularity">По популярности</option>
            <option value="ranked">По рейтингу</option>
            <option value="aired_on">По дате выхода</option>
            <option value="name">По алфавиту</option>
          </select>
        </div>
      </div>

      {/* Genre Pills Bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 12,
          marginBottom: 24,
        }}
      >
        {GENRES.map((g) => {
          const isActive = selectedGenre === g.id
          return (
            <button
              key={g.id}
              onClick={() => {
                setSelectedGenre(g.id)
                setPage(1)
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: isActive
                  ? 'var(--primary-container)'
                  : 'var(--sub-bg)',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                border: isActive
                  ? '1px solid rgba(var(--accent-rgb), 0.5)'
                  : '1px solid var(--border-subtle)',
                transition:
                  'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
              }}
            >
              {g.label}
            </button>
          )
        })}
      </div>

      {/* Grid of Items */}
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
            style={{ fontSize: 24, marginRight: 10, color: 'var(--accent)' }}
          />{' '}
          Загрузка каталога...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          По выбранным фильтрам ничего не найдено
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 18,
          }}
        >
          {items.map((item) => (
            <AnimeCard key={item.id} anime={item} onSelect={onOpenAnime} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          marginTop: 36,
        }}
      >
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: 'var(--sub-bg)',
            color: page <= 1 ? 'var(--text-dim)' : 'var(--text-primary)',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'background-color 0.15s ease',
          }}
        >
          ← Назад
        </button>
        <span
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            fontWeight: 500,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Страница {page}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: 'var(--sub-bg)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'background-color 0.15s ease',
          }}
        >
          Вперед →
        </button>
      </div>
    </div>
  )
}
