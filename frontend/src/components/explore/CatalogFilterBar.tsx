import React from 'react'

interface CatalogFilterBarProps {
  genre: string
  setGenre: (g: string) => void
  season: string
  setSeason: (s: string) => void
  kind: string
  setKind: (k: string) => void
  status: string
  setStatus: (st: string) => void
  score: string
  setScore: (sc: string) => void
  order: string
  setOrder: (o: string) => void
  onRandomAnime: () => void
}

export function CatalogFilterBar({
  genre,
  setGenre,
  season,
  setSeason,
  kind,
  setKind,
  status,
  setStatus,
  score,
  setScore,
  order,
  setOrder,
  onRandomAnime,
}: CatalogFilterBarProps) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i
            className="ti ti-layout-grid"
            style={{ color: 'var(--accent)', fontSize: 20 }}
          />
          <h3
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Каталог аниме
          </h3>
        </div>
        <button
          onClick={onRandomAnime}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-primary)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')
          }
        >
          <i
            className="ti ti-arrows-shuffle"
            style={{ color: 'var(--text-dim)' }}
          />
          <span>Случайное аниме</span>
        </button>
      </div>

      {/* 6 Filter Selects Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
        }}
      >
        {/* Genre */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              marginBottom: 4,
            }}
          >
            Жанр
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              padding: '0 8px',
              fontSize: 12.5,
              outline: 'none',
            }}
          >
            <option value="">Все жанры</option>
            <option value="1">Экшен</option>
            <option value="2">Приключения</option>
            <option value="4">Комедия</option>
            <option value="8">Драма</option>
            <option value="10">Фэнтези</option>
            <option value="22">Романтика</option>
            <option value="24">Фантастика</option>
            <option value="37">Сверхъестественное</option>
          </select>
        </div>

        {/* Season */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              marginBottom: 4,
            }}
          >
            Сезон
          </label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              padding: '0 8px',
              fontSize: 12.5,
              outline: 'none',
            }}
          >
            <option value="">Все сезоны</option>
            <option value="summer_2026">Лето 2026</option>
            <option value="spring_2026">Весна 2026</option>
            <option value="winter_2026">Зима 2026</option>
            <option value="fall_2025">Осень 2025</option>
            <option value="2026">2026 год</option>
            <option value="2025">2025 год</option>
            <option value="2024">2024 год</option>
          </select>
        </div>

        {/* Kind */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              marginBottom: 4,
            }}
          >
            Тип
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              padding: '0 8px',
              fontSize: 12.5,
              outline: 'none',
            }}
          >
            <option value="">Все типы</option>
            <option value="tv">ТВ Сериал</option>
            <option value="movie">Фильм</option>
            <option value="ova">OVA</option>
            <option value="ona">ONA</option>
            <option value="special">Спешл</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              marginBottom: 4,
            }}
          >
            Статус
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              padding: '0 8px',
              fontSize: 12.5,
              outline: 'none',
            }}
          >
            <option value="">Любой статус</option>
            <option value="ongoing">Онгоинг</option>
            <option value="released">Вышло</option>
            <option value="anons">Анонс</option>
          </select>
        </div>

        {/* Min score */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              marginBottom: 4,
            }}
          >
            Мин. оценка
          </label>
          <select
            value={score}
            onChange={(e) => setScore(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              padding: '0 8px',
              fontSize: 12.5,
              outline: 'none',
            }}
          >
            <option value="">Любая</option>
            <option value="8">8+</option>
            <option value="7">7+</option>
            <option value="6">6+</option>
          </select>
        </div>

        {/* Order */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              marginBottom: 4,
            }}
          >
            Сортировка
          </label>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              padding: '0 8px',
              fontSize: 12.5,
              outline: 'none',
            }}
          >
            <option value="popularity">По популярности</option>
            <option value="ranked">По рейтингу</option>
            <option value="aired_on">По дате выхода</option>
            <option value="name">По названию</option>
          </select>
        </div>
      </div>
    </div>
  )
}
