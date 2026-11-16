import React, { useState, useEffect, useRef } from 'react'
import { AppInfo } from '../types/anime'
import { fetchAboutInfo } from '../api/client'

interface AboutModalProps {
  onClose: () => void
}

export function AboutModal({ onClose }: AboutModalProps) {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAboutInfo().then(setInfo)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const defaultFeatures = [
    'Быстрый поиск аниме и манги с горячей клавишей /',
    'Мульти-агрегатор видеопотоков Kodik и Anicli с выбором озвучки',
    'Синхронизация списков и отметок с профилем Shikimori',
    'Кинотеатральный темный интерфейс с мгновенной навигацией',
    'Расписание онгоингов с таймером до новых эпизодов',
    'Топ-100, Форум, Клубы, Коллекции, Рецензии и Статьи сообщества',
  ]

  const defaultStack = [
    'Python 3.12',
    'Flask',
    'React 18',
    'TypeScript',
    'Vite',
    'Cinema UI CSS',
    'Shikimori API v1/v2',
    'Kodik & Anicli',
  ]

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      ref={modalRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 12, 0.82)',
        backdropFilter: 'blur(16px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(10px, 3vw, 20px)',
        outline: 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: 600,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(90vh, 100dvh)',
        }}
      >
        {/* Banner */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--modal-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 22,
              }}
            >
              <i className="ti ti-brand-shikimori" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3
                  id="about-modal-title"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Shiki MX
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: 'var(--primary-container)',
                    color: 'var(--on-primary-container)',
                    border: '1px solid rgba(var(--accent-rgb), 0.35)',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  }}
                >
                  v{info?.version || '2.0.0'}
                </span>
              </div>
              <div
                style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}
              >
                Производительный клиент базы данных Shikimori
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Закрыть информацию о сайте"
            className="touch-btn"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--subtle-bg)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            {info?.description ||
              'Быстрый и функциональный веб-клиент базы данных Shikimori с интеграцией видеоплееров Kodik/Anicli, строгой кинотеатральной эстетикой и полной поддержкой каталогов, списков и сообщества.'}
          </p>

          {/* Features */}
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i
                className="ti ti-circle-check"
                style={{ color: 'var(--accent)' }}
              />
              <span>Возможности приложения</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(info?.features && info.features.length > 0
                ? info.features
                : defaultFeatures
              ).map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    color: 'var(--text-muted)',
                  }}
                >
                  <i
                    className="ti ti-check"
                    style={{
                      color: 'var(--success, #4ade80)',
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i className="ti ti-code" style={{ color: 'var(--accent)' }} />
              <span>Технологический стек</span>
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(info?.stack && info.stack.length > 0
                ? info.stack
                : defaultStack
              ).map((item, i) => (
                <span
                  key={i}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'var(--sub-bg)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Footer link */}
          <div
            style={{
              paddingTop: 10,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <a
              href="https://shikimori.io"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 8,
                background: 'var(--sub-bg)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <i
                className="ti ti-brand-shikimori"
                style={{ color: 'var(--accent)' }}
              />
              <span>Открыть Shikimori.io</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
