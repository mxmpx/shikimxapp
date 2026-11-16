import React, { useState, useEffect } from 'react'
import { fetchFriends } from '../api/client'

export function FriendsView() {
  const [friends, setFriends] = useState<any[]>([])
  const [clubs, setClubs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'friends' | 'clubs'>('friends')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFriends()
      .then((res) => {
        setFriends(res.friends || [])
        setClubs(res.clubs || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredFriends = friends.filter((f) =>
    (f.nickname || f.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredClubs = clubs.filter((c) =>
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-container">
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
            <i className="ti ti-users" />
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
              Друзья и клубы
            </h2>
            <div
              style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}
            >
              Ваш круг общения и сообщества на Shikimori
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
            id="friends-search"
            name="friends_search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'friends' ? 'Поиск друзей...' : 'Поиск клубов...'
            }
            aria-label={
              activeTab === 'friends' ? 'Поиск друзей' : 'Поиск клубов'
            }
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
              padding: '0 14px 0 34px',
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

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 14,
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => setActiveTab('friends')}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border:
              activeTab === 'friends'
                ? '1px solid rgba(var(--accent-rgb), 0.5)'
                : '1px solid var(--border-subtle)',
            background:
              activeTab === 'friends'
                ? 'var(--primary-container)'
                : 'var(--sub-bg)',
            color:
              activeTab === 'friends'
                ? 'var(--text-primary)'
                : 'var(--text-muted)',
            fontWeight: 500,
            fontSize: 12.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            transition: 'background-color 0.18s ease, border-color 0.18s ease',
          }}
        >
          <i className="ti ti-user-check" />
          <span>Друзья</span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-dim)',
              background: 'rgba(255,255,255,0.06)',
              padding: '1px 6px',
              borderRadius: 4,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {friends.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('clubs')}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border:
              activeTab === 'clubs'
                ? '1px solid rgba(var(--accent-rgb), 0.5)'
                : '1px solid var(--border-subtle)',
            background:
              activeTab === 'clubs'
                ? 'var(--primary-container)'
                : 'var(--sub-bg)',
            color:
              activeTab === 'clubs'
                ? 'var(--text-primary)'
                : 'var(--text-muted)',
            fontWeight: 500,
            fontSize: 12.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            transition: 'background-color 0.18s ease, border-color 0.18s ease',
          }}
        >
          <i className="ti ti-circles-relation" />
          <span>Клубы</span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-dim)',
              background: 'rgba(255,255,255,0.06)',
              padding: '1px 6px',
              borderRadius: 4,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {clubs.length}
          </span>
        </button>
      </div>

      {/* Content */}
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
          Загрузка...
        </div>
      ) : activeTab === 'friends' ? (
        filteredFriends.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--text-dim)',
            }}
          >
            <i
              className="ti ti-users"
              style={{
                fontSize: 36,
                opacity: 0.3,
                marginBottom: 12,
                display: 'block',
              }}
            />
            <div>Друзья не найдены</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
              gap: 12,
            }}
          >
            {filteredFriends.map((f, index) => {
              const avatar =
                f.avatar ||
                f.image ||
                (f.image && (f.image.x160 || f.image.x80)) ||
                ''
              const name = f.nickname || f.name || ''
              return (
                <a
                  key={f.id || index}
                  href={`https://shikimori.io/${name}`}
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
                    e.currentTarget.style.borderColor =
                      'rgba(255, 255, 255, 0.16)'
                    e.currentTarget.style.boxShadow =
                      '0 8px 24px rgba(0, 0, 0, 0.45)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      flexShrink: 0,
                    }}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <i className="ti ti-user" style={{ fontSize: 20 }} />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name}
                    </div>
                    {f.last_online_at && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-dim)',
                          marginTop: 2,
                          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        В сети: {f.last_online_at.slice(0, 10)}
                      </div>
                    )}
                  </div>

                  <i
                    className="ti ti-external-link"
                    style={{ fontSize: 13, color: 'var(--text-dim)' }}
                  />
                </a>
              )
            })}
          </div>
        )
      ) : /* Clubs tab */
      filteredClubs.length === 0 ? (
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filteredClubs.map((c, index) => {
            const logo = c.logo || c.image || ''
            return (
              <a
                key={c.id || index}
                href={`https://shikimori.io/clubs/${c.id}`}
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
                  e.currentTarget.style.borderColor =
                    'rgba(255, 255, 255, 0.16)'
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px rgba(0, 0, 0, 0.45)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.borderColor = 'var(--card-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    flexShrink: 0,
                  }}
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt={c.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <i
                        className="ti ti-circles-relation"
                        style={{ fontSize: 20 }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </div>
                </div>

                <i
                  className="ti ti-external-link"
                  style={{ fontSize: 13, color: 'var(--text-dim)' }}
                />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
