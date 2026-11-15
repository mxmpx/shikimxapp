import React, { useState, useEffect, useMemo } from 'react'
import { CalendarEntry, CalendarDay } from '../types/anime'
import { fetchCalendar } from '../api/client'
import { AnimeCard } from '../components/AnimeCard'

interface CalendarViewProps {
  onOpenAnime: (id: number) => void
}

const DAY_NAMES = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

/** Backend returns a flat list of airing entries — group them by weekday. */
function groupByDay(entries: CalendarEntry[]): CalendarDay[] {
  const buckets = new Map<number, CalendarEntry[]>()

  entries.forEach((entry) => {
    const day = typeof entry.day_of_week === 'number' ? entry.day_of_week : 7
    const list = buckets.get(day)
    if (list) {
      list.push(entry)
    } else {
      buckets.set(day, [entry])
    }
  })

  const days: CalendarDay[] = []

  for (let day = 0; day <= 7; day += 1) {
    const items = buckets.get(day)
    if (!items || items.length === 0) continue

    items.sort((a, b) =>
      (a.time_str || '99:99').localeCompare(b.time_str || '99:99')
    )

    days.push({
      day_of_week: day,
      day_name:
        day === 7 ? 'Скоро' : DAY_NAMES[day] || items[0].day_name || 'Скоро',
      date: items[0].date_str || '',
      items,
    })
  }

  return days
}

export function CalendarView({ onOpenAnime }: CalendarViewProps) {
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCalendar()
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch((err) =>
        setError(err?.message || 'Не удалось загрузить календарь')
      )
      .finally(() => setLoading(false))
  }, [])

  const days = useMemo(() => groupByDay(entries), [entries])

  return (
    <div
      style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px 60px' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
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
          <i className="ti ti-calendar" />
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
            Календарь релизов онгоингов
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            Расписание выхода новых серий аниме текущего сезона по дням недели
          </div>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 300,
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-loader animate-spin"
            style={{ fontSize: 24, marginRight: 12, color: 'var(--accent)' }}
          />
          <span>Загрузка расписания онгоингов...</span>
        </div>
      ) : error ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-alert-triangle"
            style={{
              fontSize: 36,
              opacity: 0.35,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>{error}</div>
        </div>
      ) : days.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--text-dim)',
          }}
        >
          <i
            className="ti ti-calendar-off"
            style={{
              fontSize: 36,
              opacity: 0.35,
              marginBottom: 12,
              display: 'block',
            }}
          />
          <div>Расписание на текущую неделю пока пусто</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {days.map((day) => (
            <section key={day.day_name}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#6366f1',
                  }}
                />
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {day.day_name}
                </h3>
                {day.date && (
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-dim)',
                      fontWeight: 500,
                    }}
                  >
                    {day.date}
                  </span>
                )}
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {day.items.length} релизов
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 18,
                }}
              >
                {day.items.map((entry) => (
                  <div key={entry.id} style={{ position: 'relative' }}>
                    <AnimeCard anime={entry} onSelect={onOpenAnime} />
                    {(entry.next_episode || entry.time_str) && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: 'rgba(10, 11, 15, 0.88)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#e2e8f0',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                          fontVariantNumeric: 'tabular-nums',
                          zIndex: 5,
                          pointerEvents: 'none',
                        }}
                      >
                        {entry.time_str && (
                          <span style={{ color: '#818cf8' }}>
                            {entry.time_str}
                          </span>
                        )}
                        {entry.next_episode && (
                          <span>· {entry.next_episode} сер.</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
