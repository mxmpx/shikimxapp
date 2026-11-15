import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Неизвестная ошибка' }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI ErrorBoundary поймал ошибку:', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          style={{
            maxWidth: 620,
            margin: '60px auto',
            padding: '0 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 16px',
              borderRadius: 16,
              background: 'rgba(248, 113, 113, 0.12)',
              border: '1px solid rgba(248, 113, 113, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              fontSize: 26,
            }}
          >
            <i className="ti ti-alert-triangle" />
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            Что-то пошло не так
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--text-dim)',
              lineHeight: 1.6,
              margin: '0 0 18px',
            }}
          >
            Этот раздел не смог отрисоваться. Попробуйте обновить страницу —
            остальное приложение продолжает работать.
          </p>
          {this.state.message && (
            <pre
              style={{
                fontSize: 11.5,
                color: 'var(--text-muted)',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 10,
                padding: '10px 12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: '0 0 18px',
              }}
            >
              {this.state.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent-btn-bg)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Обновить страницу
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
