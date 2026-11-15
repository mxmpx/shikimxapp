import React, { useState } from 'react'
import { AnimeDetail } from '../../types/anime'
import { SectionLabel, StudioBadge, Pill } from '../AnimeModalIcons'

interface AnimeInfoDetailsProps {
  anime: AnimeDetail
}

export function AnimeInfoDetails({ anime }: AnimeInfoDetailsProps) {
  const [showFullDesc, setShowFullDesc] = useState(false)

  return (
    <>
      {/* ── Metadata / Specs Grid (ИНФОРМАЦИЯ О ТАЙТЛЕ) ── */}
      <div
        id="info-section"
        className="reveal-on-scroll stagger-3"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: '20px 24px',
        }}
      >
        {/* Header with Title, Studio Badge and Status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <SectionLabel
              icon="ti ti-info-circle"
              style={{ marginBottom: 0 }}
            >
              ИНФОРМАЦИЯ О ТАЙТЛЕ
            </SectionLabel>
            {anime.studios && anime.studios.length > 0 && (
              <StudioBadge name={anime.studios.join(', ')} />
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <span
              className="live-pulse-dot"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#38bdf8',
                boxShadow: '0 0 8px #38bdf8',
                display: 'inline-block',
              }}
            />
            <span>{anime.status}</span>
          </div>
        </div>

        {/* 2-Column Responsive Specs Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '4px 36px',
          }}
        >
          {/* Column 1 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="info-table-row reveal-item">
              <span className="info-key">Тип:</span>
              <span className="info-val">{anime.kind || 'TV Сериал'}</span>
            </div>
            <div className="info-table-row reveal-item">
              <span className="info-key">Эпизоды:</span>
              <span className="info-val">
                {anime.episodes || anime.episodes_aired || '?'} эп.
                {anime.duration ? ` (по ${anime.duration} мин.)` : ''}
              </span>
            </div>
            <div className="info-table-row reveal-item">
              <span className="info-key">Статус:</span>
              <span className="info-val">{anime.status}</span>
            </div>
            {anime.season && (
              <div className="info-table-row reveal-item">
                <span className="info-key">Сезон:</span>
                <span className="info-val">{anime.season}</span>
              </div>
            )}
            <div className="info-table-row reveal-item">
              <span className="info-key">Выпуск:</span>
              <span className="info-val">
                {anime.aired_on ? `с ${anime.aired_on}` : '—'}
              </span>
            </div>
          </div>

          {/* Column 2 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="info-table-row reveal-item">
              <span className="info-key">Студия:</span>
              <span className="info-val" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {anime.studios && anime.studios.length > 0 ? anime.studios.join(', ') : '—'}
              </span>
            </div>
            {anime.source && (
              <div className="info-table-row reveal-item">
                <span className="info-key">Первоисточник:</span>
                <span className="info-val">{anime.source}</span>
              </div>
            )}
            <div className="info-table-row reveal-item">
              <span className="info-key">Рейтинг:</span>
              <span className="info-val" style={{ color: '#fbbf24', fontWeight: 700 }}>
                {anime.rating || '—'}
              </span>
            </div>
            <div className="info-table-row reveal-item">
              <span className="info-key">Длительность:</span>
              <span className="info-val">{anime.duration ? `${anime.duration} мин.` : '—'}</span>
            </div>
            {anime.franchise && (
              <div className="info-table-row reveal-item">
                <span className="info-key">Франшиза:</span>
                <span className="info-val" style={{ color: 'var(--text-muted)' }}>{anime.franchise}</span>
              </div>
            )}
          </div>
        </div>

        {/* Genres & Themes */}
        {anime.genres && anime.genres.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
              Жанры и тематика
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {anime.genres.map((g) => (
                <Pill key={g}>{g}</Pill>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Synopsis / Description ── */}
      {anime.description && (
        <div
          className="reveal-on-scroll"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '20px 24px',
          }}
        >
          <SectionLabel icon="ti ti-align-left">ОПИСАНИЕ СЮЖЕТА</SectionLabel>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 14.5,
              lineHeight: 1.88,
              maxHeight: showFullDesc ? 'none' : 120,
              overflow: 'hidden',
              position: 'relative',
            }}
            dangerouslySetInnerHTML={{ __html: anime.description }}
          />
          <button
            onClick={() => setShowFullDesc(!showFullDesc)}
            style={{
              marginTop: 10,
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showFullDesc ? '▲ Свернуть описание' : '▼ Читать полностью'}
          </button>
        </div>
      )}
    </>
  )
}
