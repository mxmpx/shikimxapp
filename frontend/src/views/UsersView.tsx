import React, { useState, useEffect } from 'react'
import { UserSearchItem } from '../types/anime'
import { fetchUsersSearch } from '../api/client'

function UserCard({ user }: { user: UserSearchItem; index: number }) {
  const [imgError, setImgError] = useState(false)
  const avatar = user.avatar || ''
  const hasValidAvatar = Boolean(
    avatar && !imgError && !avatar.includes('missing')
  )
  const initial = (user.nickname || 'U').trim().charAt(0).toUpperCase()

  return (
    <a
      href={user.url || `https://shikimori.one/${user.nickname}`}
      target="_blank"
      rel="noreferrer"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 14,
        padding: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textDecoration: 'none',
        color: 'inherit',
        transition:
          'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
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
      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          overflow: 'hidden',
          background: hasValidAvatar ? 'rgba(255, 255, 255, 0.04)' : '#1a1d28',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hasValidAvatar ? (
          <img
            src={avatar}
            alt={user.nickname}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              color: 'var(--text-muted)',
              fontWeight: 600,
              fontSize: 16,
              userSelect: 'none',
            }}
          >
            {initial}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.nickname}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            marginTop: 2,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ID: {user.id}
        </div>
        {user.last_online_at && (
          <div
            style={{
              fontSize: 10.5,
              color: 'var(--text-dim)',
              marginTop: 2,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Визит: {user.last_online_at.slice(0, 10)}
          </div>
        )}
      </div>

      <i
        className="ti ti-external-link"
        style={{ fontSize: 13, color: 'var(--text-dim)' }}
      />
    </a>
  )
}

export function UsersView() {
  const [users, setUsers] = useState<UserSearchItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadUsers = async (query = '', pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchUsersSearch(query, pageNum, 60)
      if (append) {
        setUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id))
          const fresh = data.filter((u) => !existingIds.has(u.id))
          return [...prev, ...fresh]
        })
      } else {
        setUsers(data)
      }
      setHasMore(data.length >= 25)
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
      loadUsers(search, 1, false)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadUsers(search, nextPage, true)
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
            <i className="ti ti-user" />
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
              Пользователи
            </h2>
            <div
              style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}
            >
              Поиск анимешников и профилей участников сообщества
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
            id="users-search"
            name="users_search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по никнейму..."
            aria-label="Поиск по никнейму"
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
          Загрузка пользователей...
        </div>
      ) : users.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-user"
            style={{
              fontSize: 36,
              opacity: 0.3,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Пользователи не найдены</div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {users.map((u, index) => (
              <UserCard key={u.id} user={u} index={index} />
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
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
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
                    Загрузить ещё пользователей
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
