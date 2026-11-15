import React from 'react'
import { MxSelect } from '../MxSelect'
import { SectionLabel, StarIcon, STATUS_OPTIONS } from '../AnimeModalIcons'

interface AnimeListTrackerProps {
  userStatus: string
  setUserStatus: (status: string) => void
  userEpisode: number
  setUserEpisode: (ep: number | ((prev: number) => number)) => void
  totalEpisodes: number
  userRating: number
  setUserRating: (rating: number) => void
  hoverRating: number
  setHoverRating: (rating: number) => void
  userNote: string
  setUserNote: (note: string) => void
  savedSuccess: boolean
  onSaveRate: () => void
  onDeleteRate: () => void
}

export function AnimeListTracker({
  userStatus,
  setUserStatus,
  userEpisode,
  setUserEpisode,
  totalEpisodes,
  userRating,
  setUserRating,
  hoverRating,
  setHoverRating,
  userNote,
  setUserNote,
  savedSuccess,
  onSaveRate,
  onDeleteRate,
}: AnimeListTrackerProps) {
  return (
    <div
      className="reveal-on-scroll stagger-3"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <SectionLabel icon="ti ti-bookmark">МОЙ СПИСОК</SectionLabel>

      {/* Status Dropdown */}
      <MxSelect
        label="Статус просмотра"
        icon="ti ti-bookmark"
        value={userStatus}
        onChange={setUserStatus}
        options={STATUS_OPTIONS}
        flex="1 1 100%"
        minWidth="100%"
      />

      {/* Episode Stepper */}
      <div>
        <div
          style={{
            color: 'var(--text-dim)',
            fontSize: 11,
            marginBottom: 6,
            fontWeight: 500,
          }}
        >
          Прогресс серий
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setUserEpisode((prev) => Math.max(0, prev - 1))}
            aria-label="Уменьшить просмотренные серии"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: '1px solid rgba(var(--accent-rgb), 0.28)',
              background: 'rgba(var(--accent-rgb), 0.1)',
              color: 'var(--accent)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ti ti-minus" />
          </button>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 10px',
              borderRadius: 9,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <i
              className="ti ti-eye"
              style={{ fontSize: 13, color: 'var(--accent)' }}
            />
            <span>{userEpisode}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
              / {totalEpisodes} эп.
            </span>
          </div>
          <button
            onClick={() =>
              setUserEpisode((prev) => Math.min(totalEpisodes, prev + 1))
            }
            aria-label="Увеличить просмотренные серии"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: '1px solid rgba(var(--accent-rgb), 0.28)',
              background: 'rgba(var(--accent-rgb), 0.1)',
              color: 'var(--accent)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ti ti-plus" />
          </button>
        </div>
      </div>

      {/* 10 Stars Rating */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: 'var(--text-dim)',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            Моя оценка
          </span>
          <span
            style={{
              color: '#ffd700',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <StarIcon filled={true} size={14} />
            {hoverRating || userRating || '—'} / 10
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const isStarFilled = n <= (hoverRating || userRating)
            return (
              <button
                key={n}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setUserRating(n === userRating ? 0 : n)}
                aria-label={`Оценить на ${n} из 10`}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                  transition: 'transform 0.15s ease',
                  transform:
                    n === (hoverRating || userRating)
                      ? 'scale(1.25)'
                      : 'scale(1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StarIcon filled={isStarFilled} size={18} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Personal Note */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              color: 'var(--text-dim)',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            Личная заметка
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
            ↕ можно растягивать
          </span>
        </div>
        <textarea
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          rows={3}
          placeholder="Ваши заметки или черновик отзыва..."
          style={{
            width: '100%',
            minHeight: 68,
            maxHeight: 240,
            padding: '10px 12px',
            borderRadius: 10,
            fontFamily: 'inherit',
            fontSize: 12.5,
            lineHeight: 1.55,
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            color: 'var(--text-primary)',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSaveRate}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            background: savedSuccess
              ? 'rgba(74, 222, 128, 0.18)'
              : 'rgba(var(--accent-rgb), 0.14)',
            border: `1px solid ${savedSuccess ? 'rgba(74, 222, 128, 0.4)' : 'rgba(var(--accent-rgb), 0.3)'}`,
            color: savedSuccess ? '#4ade80' : 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.25s ease',
          }}
        >
          <i
            className={savedSuccess ? 'ti ti-check' : 'ti ti-device-floppy'}
            style={{ fontSize: 14 }}
          />
          <span>{savedSuccess ? 'Сохранено' : 'Сохранить'}</span>
        </button>
        <button
          onClick={onDeleteRate}
          aria-label="Удалить оценку из списка"
          title="Удалить из списка"
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 14,
            cursor: 'pointer',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.22)',
            color: 'rgba(248, 113, 113, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  )
}
