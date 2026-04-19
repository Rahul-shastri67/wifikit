import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
        <div className="logo">Wifi<span>Kit</span></div>
        <p className="subtitle">Stream your phone camera to any device on your WiFi</p>

        <div className="stack">
          <button className="btn btn-primary" onClick={() => navigate('/desktop')}>
            🖥️ &nbsp; View Stream on This Device
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/mobile')}>
            📱 &nbsp; Stream From This Phone
          </button>
        </div>

        <div className="divider" />

        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          No internet needed · Works over local WiFi only
        </p>
      </div>
    </div>
  )
}
