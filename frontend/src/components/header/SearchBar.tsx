import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CatalogItem } from '../../types/anime'
import { searchAnime } from '../../api/client'
import { appConfig } from '../../config/appConfig'

interface SearchBarProps {
  onOpenAnime: (id: number) => void
}

export function SearchBar({ onOpenAnime }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([])
  const [searchFocused, setSearchFocused] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileSearchOpen(false)
      }
      window.addEventListener('keydown', handleEscape)
      return () => {
        window.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }
  }, [mobileSearchOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInputActive =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable

      const targetKey = appConfig.search.hotkey || '/'
      if (
        (e.key === targetKey ||
          (targetKey === '/' &&
            (e.code === 'Slash' || e.code === 'NumpadDivide'))) &&
        !isInputActive
      ) {
        e.preventDefault()
        setSearchFocused(true)
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchAnime(searchQuery.trim())
        setSearchResults(results)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 280)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Mobile Search Trigger Icon */}
      <div className="mobile-only">
        <button
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Поиск аниме и манги"
          className="touch-btn"
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--subtle-bg)',
            border: '1px solid var(--subtle-border)',
            color: 'var(--text-primary)',
            fontSize: 18,
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className="ti ti-search" />
        </button>
      </div>

      {/* Mobile Fullscreen Search Overlay Portaled into Body */}
      {mobileSearchOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="mobile-search-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Полноэкранный поиск"
          >
            {/* Top Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderBottom: '1px solid var(--modal-border)',
                background: 'var(--header-bg)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <button
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Закрыть поиск"
                className="touch-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-arrow-left" />
              </button>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--accent)',
                  borderRadius: 12,
                  padding: '8px 12px',
                }}
              >
                <i className="ti ti-search" style={{ color: 'var(--accent)', fontSize: 16, flexShrink: 0 }} />
                <input
                  ref={mobileInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск аниме, манги..."
                  aria-label="Поисковый запрос"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 16,
                    padding: 0,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Очистить"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: 4,
                      flexShrink: 0,
                    }}
                  >
                    <i className="ti ti-x" style={{ fontSize: 16 }} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="touch-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  flexShrink: 0,
                }}
              >
                Отмена
              </button>
            </div>

          {/* Results List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {isSearching && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 14 }}>
                Поиск...
              </div>
            )}
            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Ничего не найдено по запросу «{searchQuery}»
              </div>
            )}
            {searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onOpenAnime(item.id)
                  setMobileSearchOpen(false)
                }}
                className="touch-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  marginBottom: 8,
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement
                    if (target.src !== 'https://shikimori.io/assets/globals/missing_original.jpg') {
                      target.src = 'https://shikimori.io/assets/globals/missing_original.jpg'
                    }
                  }}
                  style={{
                    width: 40,
                    height: 56,
                    borderRadius: 8,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.russian || item.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <span>{item.kind || 'Аниме'}</span>
                    {item.score ? (
                      <span style={{ color: 'var(--accent-gold, #ffd700)', fontWeight: 600 }}>
                        ★ {item.score}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Desktop Search Bar */}
      <search
        role="search"
        ref={searchContainerRef}
        className="desktop-only"
        style={{
          position: 'relative',
          width: searchFocused ? 380 : 300,
          maxWidth: '100%',
          transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: searchFocused ? 'var(--input-focus-bg)' : 'var(--input-bg)',
          border: `1px solid ${searchFocused ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 20,
          padding: '6px 12px 6px 14px',
          transition: 'all 0.18s ease',
        }}
      >
        <i
          className="ti ti-search"
          style={{
            fontSize: 14,
            color: searchFocused ? 'var(--accent)' : 'var(--text-dim)',
          }}
        />
        <input
          ref={searchInputRef}
          type="search"
          id="global-header-search"
          name="q"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          placeholder="Поиск по базе аниме и манги..."
          aria-label="Поиск по базе аниме и манги"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 12.5,
            padding: 0,
          }}
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Очистить поисковый запрос"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        ) : (
          <kbd
            style={{
              fontSize: 10,
              padding: '2px 5px',
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-dim)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            /
          </kbd>
        )}
      </div>

      {searchFocused && (searchResults.length > 0 || isSearching) && (
        <div
          className="reveal-pop"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'var(--modal-bg)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
            maxHeight: 400,
            overflowY: 'auto',
            padding: '8px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {isSearching ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
              Поиск...
            </div>
          ) : (
            searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onOpenAnime(item.id)
                  setSearchFocused(false)
                }}
                className="reveal-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement
                    if (target.src !== 'https://shikimori.io/assets/globals/missing_original.jpg') {
                      target.src = 'https://shikimori.io/assets/globals/missing_original.jpg'
                    }
                  }}
                  style={{
                    width: 32,
                    height: 44,
                    borderRadius: 6,
                    objectFit: 'cover',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.russian || item.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    <span>{item.kind || 'Аниме'}</span>
                    {item.score ? (
                      <span style={{ color: '#ffd700' }}>★ {item.score}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </search>
    </>
  )
}
