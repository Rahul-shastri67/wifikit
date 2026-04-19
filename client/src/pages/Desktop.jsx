import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import socket from '../socket'

const iceConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export default function Desktop() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const pcRef = useRef(null)

  const [session, setSession] = useState(null)
  const [mobileUrl, setMobileUrl] = useState('')
  const [status, setStatus] = useState('idle')
  const [streamActive, setStreamActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState('environment')
  const [stats, setStats] = useState({ fps: 0, resolution: '' })
  const statsTimer = useRef(null)

const serverBase = `https://192.168.31.233:3000`

  async function createSession() {
    setStatus('creating')
    try {
      const res = await fetch(`${serverBase}/api/sessions`, { method: 'POST' })
      const data = await res.json()
      setSession(data.sessionId)

      const url = `https://192.168.31.233:3000/mobile?room=${data.sessionId}`
      setMobileUrl(url)
      setStatus('waiting')
    } catch {
      setStatus('error')
    }
  }

  const buildPeerConnection = useCallback((roomId) => {
    const pc = new RTCPeerConnection(iceConfig)
    pcRef.current = pc

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0]
        setStreamActive(true)
        startStatsPolling(pc)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice', { room: roomId, candidate: event.candidate })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStreamActive(false)
        setStatus('waiting')
        stopStatsPolling()
      }
    }

    return pc
  }, [])

  function startStatsPolling(pc) {
    statsTimer.current = setInterval(async () => {
      const reports = await pc.getStats()
      reports.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const fps = Math.round(report.framesPerSecond || 0)
          const w = report.frameWidth || 0
          const h = report.frameHeight || 0
          setStats({ fps, resolution: w && h ? `${w}×${h}` : '' })
        }
      })
    }, 1000)
  }

  function stopStatsPolling() {
    clearInterval(statsTimer.current)
    setStats({ fps: 0, resolution: '' })
  }

  useEffect(() => {
    createSession()
  }, [])

  useEffect(() => {
    if (!session) return

    socket.connect()
    socket.emit('join', { room: session, role: 'viewer' })

    socket.on('peer-joined', async ({ role }) => {
      if (role === 'streamer') {
        setStatus('connecting')
      }
    })

    socket.on('offer', async (offer) => {
      const pc = buildPeerConnection(session)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', { room: session, answer })
      setStatus('streaming')
    })

    socket.on('ice', async (candidate) => {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      }
    })

    socket.on('camera-switched', ({ facing }) => {
      setCameraFacing(facing)
    })

    socket.on('stream-status', ({ active }) => {
      setStreamActive(active)
    })

    socket.on('peer-left', () => {
      setStatus('waiting')
      setStreamActive(false)
      stopStatsPolling()
      if (videoRef.current) videoRef.current.srcObject = null
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
    })

    return () => {
      socket.off('peer-joined')
      socket.off('offer')
      socket.off('ice')
      socket.off('camera-switched')
      socket.off('stream-status')
      socket.off('peer-left')
      socket.disconnect()
      if (pcRef.current) pcRef.current.close()
      stopStatsPolling()
      if (session) {
        fetch(`${serverBase}/api/sessions/${session}`, { method: 'DELETE' })
      }
    }
  }, [session, buildPeerConnection])

  const statusLabel = {
    idle: 'Initializing...',
    creating: 'Creating session...',
    waiting: 'Waiting for phone...',
    connecting: 'Phone connected, starting stream...',
    streaming: 'Streaming',
    error: 'Error - please refresh'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => navigate('/')}>
            ← Back
          </button>
          <div className="logo">Wifi<span>Kit</span></div>
        </div>

        <div className="row">
          {status === 'streaming' && streamActive ? (
            <span className="badge badge-green"><span className="dot dot-green" />Live</span>
          ) : status === 'waiting' ? (
            <span className="badge badge-muted"><span className="dot dot-muted" />Waiting</span>
          ) : (
            <span className="badge badge-muted">{statusLabel[status]}</span>
          )}
          {session && (
            <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>
              Room: <strong style={{ color: 'var(--text)' }}>{session}</strong>
            </span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 0 }}>
        <div style={{ flex: 1, position: 'relative', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: streamActive ? 'block' : 'none'
            }}
          />

          {!streamActive && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              {(status === 'waiting' || status === 'creating') && session ? (
                <div>
                  <p style={{ fontSize: 15, marginBottom: 24, color: 'var(--text)' }}>
                    Scan this QR code on your phone
                  </p>
                  <div style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 16,
                    display: 'inline-block',
                    marginBottom: 20
                  }}>
                    <QRCodeSVG value={mobileUrl} size={180} />
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
                    Or open on your phone:
                  </p>
                  <p style={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: 'var(--accent)',
                    marginTop: 6,
                    wordBreak: 'break-all',
                    maxWidth: 320
                  }}>
                    {mobileUrl}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 15 }}>{statusLabel[status]}</p>
              )}
            </div>
          )}

          {streamActive && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap'
            }}>
              {stats.resolution && (
                <span className="badge badge-muted" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}>
                  {stats.resolution}
                </span>
              )}
              {stats.fps > 0 && (
                <span className="badge badge-muted" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}>
                  {stats.fps} fps
                </span>
              )}
              <span className="badge badge-muted" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}>
                {cameraFacing === 'environment' ? '📷 Rear' : '🤳 Front'}
              </span>
            </div>
          )}
        </div>

        {session && (
          <div style={{
            width: 260,
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div>
              <p className="label">Room Code</p>
              <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, fontFamily: 'monospace', color: 'var(--accent)' }}>
                {session}
              </p>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            <div>
              <p className="label">Connection</p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>{statusLabel[status]}</p>
            </div>

            {streamActive && (
              <>
                <div>
                  <p className="label">Camera</p>
                  <p style={{ fontSize: 13 }}>
                    {cameraFacing === 'environment' ? 'Rear camera' : 'Front camera'}
                  </p>
                </div>
                {stats.resolution && (
                  <div>
                    <p className="label">Video</p>
                    <p style={{ fontSize: 13 }}>{stats.resolution} · {stats.fps} fps</p>
                  </div>
                )}
              </>
            )}

            <div className="divider" style={{ margin: '4px 0' }} />

            <div>
              <p className="label">QR Code</p>
              <div style={{
                background: '#fff',
                borderRadius: 8,
                padding: 10,
                display: 'inline-block'
              }}>
                <QRCodeSVG value={mobileUrl} size={120} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
