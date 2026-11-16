import React, { useState, useEffect } from 'react'
import { ClubItem } from '../types/anime'
import { fetchPopularClubs } from '../api/client'

function ClubCard({ club }: { club: ClubItem; index: number }) {
  const [imgError, setImgError] = useState(false)
  const logo = club.logo || ''

  return (
    <a
      href={club.url || `https://shikimori.one/clubs/${club.id}`}
      target="_blank"
      rel="noreferrer"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 14,
        padding: '16px',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        textDecoration: 'none',
        color: 'inherit',
        transition:
          'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.45)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.borderColor = 'var(--card-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {logo && !imgError ? (
          <img
            src={logo}
            alt={club.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <i
            className="ti ti-circles-relation"
            style={{ fontSize: 22, color: 'var(--accent)' }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {club.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
            color: 'var(--text-dim)',
          }}
        >
          {club.members_label && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <i
                className="ti ti-users"
                style={{ color: 'var(--text-muted)' }}
              />
              {club.members_label}
            </span>
          )}
          {club.is_censored && (
            <span style={{ color: '#f87171', fontWeight: 600 }}>18+</span>
          )}
          <span
            style={{
              color: 'var(--accent)',
              marginLeft: 'auto',
              fontWeight: 500,
              fontSize: 11.5,
            }}
          >
            Открыть{' '}
            <i className="ti ti-external-link" style={{ fontSize: 11 }} />
          </span>
        </div>
      </div>
    </a>
  )
}

export function ClubsView() {
  const [clubs, setClubs] = useState<ClubItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadClubs = async (query = '', pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchPopularClubs(query, pageNum, 60)
      if (append) {
        setClubs((prev) => {
          const existingIds = new Set(prev.map((c) => c.id))
          const fresh = data.filter((c) => !existingIds.has(c.id))
          return [...prev, ...fresh]
        })
      } else {
        setClubs(data)
      }
      setHasMore(data.length >= 30)
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    setPage(1)
    const timer = setTimeout(() => {
      loadClubs(search, 1, false)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadClubs(search, nextPage, true)
  }

  return (
    <div
      style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 60px' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
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
              <i className="ti ti-circles-relation" />
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
                Клубы сообщества
              </h2>
              <div
                style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}
              >
                Объединения по интересам, любимым франшизам и обсуждениям
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <i
            className="ti ti-search"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
              fontSize: 14,
            }}
          />
          <input
            type="search"
            id="clubs-search"
            name="clubs_search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск клубов..."
            aria-label="Поиск клубов"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            style={{
              width: '100%',
              height: 38,
              borderRadius: 8,
              background: 'var(--input-bg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '0 14px 0 36px',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.18s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          />
        </div>
      </div>

      {/* Clubs Grid */}
      {loading ? (
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
            style={{ fontSize: 24, marginRight: 10, color: 'var(--accent)' }}
          />{' '}
          Загрузка клубов...
        </div>
      ) : clubs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-circles-relation"
            style={{
              fontSize: 36,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Клубы не найдены</div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {clubs.map((club, index) => (
              <ClubCard key={club.id} club={club} index={index} />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 36 }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  background: 'var(--sub-bg)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition:
                    'background-color 0.18s ease, border-color 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loadingMore) {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    'rgba(255, 255, 255, 0.08)'
                }}
              >
                {loadingMore ? (
                  <>
                    <i
                      className="ti ti-loader animate-spin"
                      style={{ color: 'var(--accent)' }}
                    />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <i
                      className="ti ti-plus"
                      style={{ color: 'var(--accent)' }}
                    />
                    Загрузить ещё клубы
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
