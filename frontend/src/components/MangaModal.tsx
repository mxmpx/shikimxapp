import React, { useEffect, useMemo, useState } from 'react'
import { MangaItem, UserRate } from '../types/anime'
import { fetchMangaDetails, updateUserRate } from '../api/client'

interface MangaModalProps {
  mangaId: number
  onClose: () => void
  onOpenAnime?: (id: number) => void
}

const MANGA_STATUSES = [
  { status: 'watching', label: 'Читаю' },
  { status: 'planned', label: 'В планах' },
  { status: 'completed', label: 'Прочитано' },
  { status: 'on_hold', label: 'Отложено' },
  { status: 'dropped', label: 'Брошено' },
  { status: 'rereading', label: 'Перечитываю' },
]

function stripHtml(html?: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\/?\w+[^\]]*\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function MangaModal({ mangaId, onClose, onOpenAnime }: MangaModalProps) {
  const [manga, setManga] = useState<MangaItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'info' | 'characters' | 'related'>('info')

  const [status, setStatus] = useState('planned')
  const [chapters, setChapters] = useState(0)
  const [volumes, setVolumes] = useState(0)
  const [score, setScore] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    setTab('info')
    fetchMangaDetails(mangaId)
      .then((data) => {
        if (!mounted) return
        setManga(data)
        const rate = data.user_rate as UserRate | null | undefined
        if (rate) {
          setStatus(rate.status || 'planned')
          setChapters(rate.chapters || 0)
          setVolumes(rate.volumes || 0)
          setScore(rate.score || 0)
          setNote(rate.text || '')
        }
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Не удалось загрузить мангу')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [mangaId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const description = useMemo(
    () => stripHtml(manga?.description),
    [manga?.description]
  )

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const ok = await updateUserRate(
        mangaId,
        status,
        0,
        score,
        note,
        'Manga',
        chapters,
        volumes
      )
      if (ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setSaveError('Не удалось сохранить. Возможно, требуется авторизация.')
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const totalChapters = Number(manga?.chapters) || 0
  const totalVolumes = Number(manga?.volumes) || 0

  return (
    <div
      className="modal-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manga-modal-title"
      style={{
        position: 'fixed',
        top: 'var(--header-height, 56px)',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 'calc(100dvh - var(--header-height, 56px))',
        zIndex: 1000,
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(28px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Floating Close Button */}
      <button
        onClick={onClose}
        aria-label="Закрыть окно манги"
        title="Закрыть (Esc)"
        style={{
          position: 'absolute',
          top: 18,
          right: 28,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'var(--subtle-bg)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 60,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.18s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
          e.currentTarget.style.transform = 'none'
        }}
      >
        <i className="ti ti-x" style={{ fontSize: 18 }} />
      </button>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '24px 24px 60px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Left Column Skeleton */}
              <div style={{ width: 'min(240px, 100%)', margin: '0 auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  className="mx-skeleton"
                  style={{
                    borderRadius: 12,
                    aspectRatio: '2/3',
                    width: '100%',
                  }}
                />
                <div
                  className="mx-skeleton"
                  style={{
                    borderRadius: 12,
                    height: 180,
                    width: '100%',
                  }}
                />
              </div>

              {/* Right Column Skeleton */}
              <div style={{ flex: 1, minWidth: 'min(300px, 100%)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div
                    className="mx-skeleton"
                    style={{
                      height: 32,
                      width: '60%',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  />
                  <div
                    className="mx-skeleton"
                    style={{
                      height: 18,
                      width: '35%',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div
                  className="mx-skeleton"
                  style={{
                    height: 40,
                    width: 280,
                    borderRadius: 10,
                  }}
                />
                <div
                  className="mx-skeleton"
                  style={{
                    height: 240,
                    borderRadius: 14,
                    width: '100%',
                  }}
                />
              </div>
            </div>
          </div>
        ) : error || !manga ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: 'var(--text-dim)',
            }}
          >
            <i
              className="ti ti-alert-triangle"
              style={{
                fontSize: 36,
                opacity: 0.4,
                display: 'block',
                marginBottom: 12,
              }}
            />
            <div>{error || 'Манга не найдена'}</div>
          </div>
        ) : (
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '24px 24px 60px',
            }}
          >
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Poster + facts */}
              <div style={{ width: 'min(240px, 100%)', margin: '0 auto', flexShrink: 0 }}>
                <div
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid var(--card-border)',
                    background: '#10121a',
                    aspectRatio: '2/3',
                  }}
                >
                  {manga.image ? (
                    <img
                      src={manga.image}
                      alt={manga.russian || manga.name}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
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
                        color: 'var(--text-dim)',
                      }}
                    >
                      <i className="ti ti-book" style={{ fontSize: 44 }} />
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    fontSize: 12.5,
                  }}
                >
                  {[
                    ['Тип', manga.kind],
                    ['Статус', manga.status],
                    ['Томов', totalVolumes || '—'],
                    ['Глав', totalChapters || '—'],
                    ['Выход', manga.aired_on_formatted || manga.aired_on],
                    ['Издатели', (manga.publishers || []).join(', ')],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div
                        key={label as string}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <span style={{ color: 'var(--text-dim)' }}>
                          {label}
                        </span>
                        <span
                          style={{
                            color: 'var(--text-primary)',
                            textAlign: 'right',
                            fontWeight: 500,
                            fontFamily:
                              'ui-monospace, SFMono-Regular, monospace',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                </div>

                {manga.shikimori_url && (
                  <a
                    href={manga.shikimori_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--sub-bg)',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    <i className="ti ti-external-link" /> Открыть на Shikimori
                  </a>
                )}
              </div>

              {/* Main */}
              <div style={{ flex: 1, minWidth: 'min(280px, 100%)' }}>
                <h2
                  id="manga-modal-title"
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    margin: '0 0 4px',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {manga.russian || manga.name}
                </h2>
                {manga.name &&
                  manga.russian &&
                  manga.name !== manga.russian && (
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-dim)',
                        marginBottom: 10,
                      }}
                    >
                      {manga.name}
                    </div>
                  )}

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 18,
                  }}
                >
                  {manga.score && manga.score !== '—' && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(10, 11, 15, 0.88)',
                        color: '#eab308',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <i
                        className="ti ti-star-filled"
                        style={{ fontSize: 10 }}
                      />{' '}
                      {manga.score}
                    </span>
                  )}
                  {(manga.genres || []).map((g) => (
                    <span
                      key={g}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'var(--sub-bg)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)',
                        fontSize: 11.5,
                      }}
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* Rate editor */}
                <div
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 14,
                    padding: '16px',
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                    }}
                  >
                    <i
                      className="ti ti-checklist"
                      style={{ color: 'var(--accent)' }}
                    />{' '}
                    Мой прогресс
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 10,
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--text-dim)',
                      }}
                    >
                      Статус
                      <select
                        id="manga-status-select"
                        name="manga_status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={inputStyle}
                      >
                        {MANGA_STATUSES.map((s) => (
                          <option key={s.status} value={s.status}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      htmlFor="manga-chapters-input"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--text-dim)',
                      }}
                    >
                      Глав прочитано
                      <input
                        id="manga-chapters-input"
                        name="chapters_read"
                        type="number"
                        min={0}
                        max={totalChapters || undefined}
                        value={chapters}
                        onChange={(e) =>
                          setChapters(Number(e.target.value) || 0)
                        }
                        style={inputStyle}
                      />
                    </label>
                    <label
                      htmlFor="manga-volumes-input"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--text-dim)',
                      }}
                    >
                      Томов прочитано
                      <input
                        id="manga-volumes-input"
                        name="volumes_read"
                        type="number"
                        min={0}
                        max={totalVolumes || undefined}
                        value={volumes}
                        onChange={(e) =>
                          setVolumes(Number(e.target.value) || 0)
                        }
                        style={inputStyle}
                      />
                    </label>
                    <label
                      htmlFor="manga-score-input"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--text-dim)',
                      }}
                    >
                      Оценка (0–10)
                      <input
                        id="manga-score-input"
                        name="score"
                        type="number"
                        min={0}
                        max={10}
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value) || 0)}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                  <textarea
                    id="manga-note-textarea"
                    name="note"
                    aria-label="Заметка или отзыв о манге"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Заметка или отзыв..."
                    rows={3}
                    style={{
                      ...inputStyle,
                      width: '100%',
                      height: 'auto',
                      marginTop: 10,
                      padding: '8px 10px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--accent-btn-bg)',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: 12.5,
                        cursor: saving ? 'default' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: 'var(--accent-btn-shadow)',
                      }}
                    >
                      <i
                        className={
                          saving
                            ? 'ti ti-loader animate-spin'
                            : 'ti ti-device-floppy'
                        }
                      />
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    {saved && (
                      <span
                        style={{
                          color: 'var(--success, #4ade80)',
                          fontSize: 12.5,
                          fontWeight: 500,
                        }}
                      >
                        Сохранено
                      </span>
                    )}
                    {saveError && (
                      <span
                        style={{
                          color: 'var(--danger, #f87171)',
                          fontSize: 12,
                        }}
                      >
                        {saveError}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  {[
                    { id: 'info', label: 'Описание', icon: 'ti-file-text' },
                    {
                      id: 'characters',
                      label: `Персонажи (${manga.characters?.length || 0})`,
                      icon: 'ti-users',
                    },
                    {
                      id: 'related',
                      label: `Связанное (${manga.related?.length || 0})`,
                      icon: 'ti-link',
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id as any)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border:
                          tab === t.id
                            ? '1px solid rgba(var(--accent-rgb), 0.5)'
                            : '1px solid var(--border-subtle)',
                        background:
                          tab === t.id
                            ? 'var(--primary-container)'
                            : 'var(--sub-bg)',
                        color:
                          tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                        fontSize: 12.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition:
                          'background-color 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      <i className={`ti ${t.icon}`} /> {t.label}
                    </button>
                  ))}
                </div>

                {tab === 'info' && (
                  <div
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.7,
                      color: 'var(--text-muted)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {description || 'Описание отсутствует.'}
                  </div>
                )}

                {tab === 'characters' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {(manga.characters || []).map((ch) => (
                      <div
                        key={ch.id}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 12,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            aspectRatio: '2/3',
                            background: 'rgba(255,255,255,0.03)',
                          }}
                        >
                          {ch.image ? (
                            <img
                              src={ch.image}
                              alt={ch.russian || ch.name}
                              loading="lazy"
                              decoding="async"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : null}
                        </div>
                        <div style={{ padding: '8px 10px' }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {ch.russian || ch.name}
                          </div>
                          {ch.role && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: 'var(--text-dim)',
                                marginTop: 2,
                              }}
                            >
                              {ch.role}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'related' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {(manga.related || []).map((rel) => (
                      <div
                        key={`${rel.id}_${rel.relation}`}
                        onClick={() => {
                          if (rel.is_anime && onOpenAnime) onOpenAnime(rel.id)
                          else
                            window.open(
                              `https://shikimori.io/mangas/${rel.id}`,
                              '_blank',
                              'noopener,noreferrer'
                            )
                        }}
                        style={{
                          display: 'flex',
                          gap: 10,
                          padding: 10,
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 74,
                            borderRadius: 8,
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: 'rgba(255,255,255,0.04)',
                          }}
                        >
                          {rel.image ? (
                            <img
                              src={rel.image}
                              alt={rel.name}
                              loading="lazy"
                              decoding="async"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : null}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {rel.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: 'var(--text-dim)',
                              marginTop: 4,
                            }}
                          >
                            {rel.meta_text || rel.relation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 34,
  borderRadius: 8,
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text-primary)',
  padding: '0 8px',
  fontSize: 12.5,
  outline: 'none',
}
