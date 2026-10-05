import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#fff', fontFamily: 'monospace', background: '#17181a', minHeight: '100dvh' }}>
          <h2 style={{ color: '#d2ff62' }}>Ocurrió un error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff9a8a', fontSize: 13 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => { location.hash = 'inicio'; location.reload() }}
            style={{ marginTop: 14, background: '#d2ff62', color: '#182a0c', border: 0, borderRadius: 10, padding: '10px 16px', fontWeight: 700 }}
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
