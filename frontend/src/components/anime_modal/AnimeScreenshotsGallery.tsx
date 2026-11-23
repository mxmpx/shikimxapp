import React, { useState, useEffect } from 'react'
import { SectionLabel } from '../AnimeModalIcons'

interface AnimeScreenshotsGalleryProps {
  screenshots?: string[]
  onOpenLightbox: (index: number) => void
}

const DESKTOP_LIMIT = 12
const MOBILE_LIMIT = 3

export function AnimeScreenshotsGallery({
  screenshots,
  onOpenLightbox,
}: AnimeScreenshotsGalleryProps) {
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768
    }
    return false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 768px)')
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches)
    }
    setIsMobile(mql.matches)
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    } else {
      mql.addListener(onChange)
      return () => mql.removeListener(onChange)
    }
  }, [])

  if (!screenshots || screenshots.length === 0) {
    return null
  }

  const initialLimit = isMobile ? MOBILE_LIMIT : DESKTOP_LIMIT
  const hasMore = screenshots.length > initialLimit
  const visibleScreenshots =
    expanded || !hasMore ? screenshots : screenshots.slice(0, initialLimit)

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
          {hasMore && !expanded
            ? `${initialLimit} из ${screenshots.length} кадров`
            : `${screenshots.length} кадров`}
        </span>
      </div>
      <div
        className="screenshots-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
          gap: 12,
        }}
      >
        {visibleScreenshots.map((url, idx) => (
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
              src={url.replace('/system/screenshots/original/', '/system/screenshots/x332/')}
              alt={`Кадр ${idx + 1}`}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                if (target.src !== url) {
                  target.src = url
                } else {
                  const parent = target.parentElement
                  if (parent) parent.style.display = 'none'
                }
              }}
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

      {hasMore && (
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'var(--sub-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
          >
            <i
              className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`}
              style={{ fontSize: 15 }}
            />
            <span>
              {expanded
                ? 'Свернуть кадры'
                : `Показать все кадры (${screenshots.length})`}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
