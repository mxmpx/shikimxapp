import React from 'react'
import { SectionLabel } from '../AnimeModalIcons'

interface AnimeScreenshotsGalleryProps {
  screenshots?: string[]
  onOpenLightbox: (index: number) => void
}

export function AnimeScreenshotsGallery({
  screenshots,
  onOpenLightbox,
}: AnimeScreenshotsGalleryProps) {
  if (!screenshots || screenshots.length === 0) {
    return null
  }

  return (
    <div className="reveal-on-scroll">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <SectionLabel icon="ti ti-photo">КАДРЫ ИЗ АНИМЕ</SectionLabel>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: 'rgba(var(--accent-rgb), 0.12)',
            color: 'var(--accent)',
            border: '1px solid rgba(var(--accent-rgb), 0.25)',
          }}
        >
          {screenshots.length} кадров
        </span>
      </div>
      <div
        className="screenshots-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {screenshots.map((url, idx) => (
          <div
            key={url}
            onClick={() => onOpenLightbox(idx + 1)}
            style={{
              position: 'relative',
              aspectRatio: '16/9',
              borderRadius: 14,
              overflow: 'hidden',
              cursor: 'zoom-in',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
            className="screenshot-thumb reveal-pop"
          >
            <img
              src={url}
              alt={`Кадр ${idx + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.35s ease',
              }}
            />
            <div
              className="screenshot-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(10, 4, 20, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(var(--accent-rgb), 0.35)',
                  border: '1px solid rgba(var(--accent-rgb), 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 18,
                }}
              >
                <i className="ti ti-arrows-maximize" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
