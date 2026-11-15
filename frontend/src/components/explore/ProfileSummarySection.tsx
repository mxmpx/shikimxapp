import React from 'react'
import { UserProfile } from '../../types/anime'

interface ProfileSummarySectionProps {
  userProfile?: UserProfile | null
  onNavigateTab?: (tab: string) => void
}

export function ProfileSummarySection({
  userProfile,
  onNavigateTab,
}: ProfileSummarySectionProps) {
  if (!userProfile) return null

  return (
    <section className="reveal-slide-up" style={{ marginTop: 40 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {/* Info Card */}
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <i
              className="ti ti-id"
              style={{ color: 'var(--accent)', fontSize: 20 }}
            />
            <h4
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Информация
            </h4>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>ID:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {userProfile.id}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Никнейм:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {userProfile.nickname}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Links */}
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i
                className="ti ti-chart-bar"
                style={{ color: 'var(--accent)', fontSize: 20 }}
              />
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Статистика просмотров
              </h4>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('rates')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Списки →
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: 13,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => onNavigateTab && onNavigateTab('rates')}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                Просмотрено аниме:
              </span>
              <span style={{ fontWeight: 700, color: '#4ade80' }}>
                {userProfile.stats?.statuses?.anime?.find(
                  (s: any) => s.name === 'completed'
                )?.size || 0}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => onNavigateTab && onNavigateTab('rates')}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                Смотрю аниме:
              </span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                {userProfile.stats?.statuses?.anime?.find(
                  (s: any) => s.name === 'watching'
                )?.size || 0}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => onNavigateTab && onNavigateTab('rates')}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                Прочитано манги:
              </span>
              <span style={{ fontWeight: 700, color: '#a78bfa' }}>
                {userProfile.stats?.statuses?.manga?.find(
                  (s: any) => s.name === 'completed'
                )?.size || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
