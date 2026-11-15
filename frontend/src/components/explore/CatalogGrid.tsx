import React from 'react'
import { CatalogItem } from '../../types/anime'
import { AnimeCard } from '../AnimeCard'

interface CatalogGridProps {
  catalogLoading: boolean
  catalogItems: CatalogItem[]
  catalogPage: number
  onLoadMore: () => void
  onOpenAnime: (id: number) => void
}

export function CatalogGrid({
  catalogLoading,
  catalogItems,
  onLoadMore,
  onOpenAnime,
}: CatalogGridProps) {
  if (catalogLoading && catalogItems.length === 0) {
    return (
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
        Загрузка каталога...
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 18,
        }}
      >
        {catalogItems.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            onSelect={onOpenAnime}
          />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 24,
        }}
      >
        <button
          onClick={onLoadMore}
          disabled={catalogLoading}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: '1px solid rgba(var(--accent-rgb), 0.4)',
            background: 'var(--accent-btn-bg)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {catalogLoading ? (
            <>
              <i className="ti ti-loader animate-spin" /> Загрузка...
            </>
          ) : (
            <>
              <i className="ti ti-refresh" /> Загрузить ещё
            </>
          )}
        </button>
      </div>
    </div>
  )
}
