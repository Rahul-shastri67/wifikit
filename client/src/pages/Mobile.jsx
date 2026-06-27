import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import socket from '../socket'

const iceConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export default function Mobile() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const pcRef = useRef(null)
  const streamRef = useRef(null)

  const [room, setRoom] = useState(searchParams.get('room') || '')
  const [roomInput, setRoomInput] = useState('')
  const [step, setStep] = useState(searchParams.get('room') ? 'preview' : 'enter')
  const [facing, setFacing] = useState('environment')
  const [streaming, setStreaming] = useState(false)
  const [viewerReady, setViewerReady] = useState(false)
  const [error, setError] = useState('')
  
const serverBase =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

  async function startCamera(facingMode) {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      return stream
    } catch (err) {
      setError('Camera access denied. Please allow camera permission.')
      return null
    }
  }

  async function joinRoom(roomId) {
    const valid = await fetch(`${serverBase}/api/sessions/${roomId}`)
    if (!valid.ok) {
      setError('Room not found. Check the code and try again.')
      return
    }
    setError('')
    setRoom(roomId)
    setStep('preview')
  }

  const buildPeerConnection = useCallback((roomId, stream) => {
    const pc = new RTCPeerConnection(iceConfig)
    pcRef.current = pc

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice', { room: roomId, candidate: event.candidate })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStreaming(true)
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStreaming(false)
        setViewerReady(false)
      }
    }

    return pc
  }, [])

  async function startStreaming() {
    const stream = streamRef.current
    if (!stream || !room) return

    const pc = buildPeerConnection(room, stream)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('offer', { room, offer })
    socket.emit('stream-status', { room, active: true })
  }

  async function switchCamera() {
    const newFacing = facing === 'environment' ? 'user' : 'environment'
    setFacing(newFacing)

    const newStream = await startCamera(newFacing)
    if (!newStream) return

    if (pcRef.current) {
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
      if (sender) {
        const newTrack = newStream.getVideoTracks()[0]
        await sender.replaceTrack(newTrack)
      }
    }

    socket.emit('camera-switch', { room, facing: newFacing })
  }

  function stopStreaming() {
    socket.emit('stream-status', { room, active: false })
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    setStreaming(false)
    setViewerReady(false)
  }

  useEffect(() => {
    if (step === 'preview' && room) {
      startCamera(facing)

      socket.connect()
      socket.emit('join', { room, role: 'streamer' })

      socket.on('peer-joined', ({ role }) => {
        if (role === 'viewer') setViewerReady(true)
      })

      socket.on('answer', async (answer) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        }
      })

      socket.on('ice', async (candidate) => {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        }
      })

      socket.on('peer-left', () => {
        setViewerReady(false)
        setStreaming(false)
      })
    }

    return () => {
      socket.off('peer-joined')
      socket.off('answer')
      socket.off('ice')
      socket.off('peer-left')
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (pcRef.current) pcRef.current.close()
      socket.disconnect()
    }
  }, [step, room])

  if (step === 'enter') {
    return (
      <div className="page">
        <div className="card">
          <div className="logo" style={{ marginBottom: 4 }}>Wifi<span>Kit</span></div>
          <p className="subtitle">Enter your room code to start streaming</p>

          <div className="stack">
            <div>
              <p className="label">Room Code</p>
              <input
                className="input-field"
                placeholder="e.g. ABC123"
                value={roomInput}
                onChange={e => setRoomInput(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textAlign: 'center', fontSize: 22, fontFamily: 'monospace', letterSpacing: 4 }}
                onKeyDown={e => e.key === 'Enter' && joinRoom(roomInput)}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>
            )}

            <button
              className="btn btn-primary"
              onClick={() => joinRoom(roomInput)}
              disabled={roomInput.length < 4}
            >
              Connect to Room
            </button>

            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100vh',
          objectFit: 'cover',
          transform: facing === 'user' ? 'scaleX(-1)' : 'none'
        }}
      />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '20px 16px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)'
      }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>WifiKit</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', letterSpacing: 2 }}>
            Room: {room}
          </p>
        </div>

        {streaming ? (
          <span className="badge badge-green"><span className="dot dot-green" />Live</span>
        ) : viewerReady ? (
          <span className="badge badge-muted" style={{ background: 'rgba(0,0,0,0.5)' }}>Viewer ready</span>
        ) : (
          <span className="badge badge-muted" style={{ background: 'rgba(0,0,0,0.5)' }}>Waiting for viewer</span>
        )}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 20px 40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)'
          }}
        >
          ✕
        </button>

        {!streaming ? (
          <button
            onClick={startStreaming}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(108,99,255,0.5)'
            }}
          >
            START
          </button>
        ) : (
          <button
            onClick={stopStreaming}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--red)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(239,68,68,0.5)'
            }}
          >
            STOP
          </button>
        )}

        <button
          onClick={switchCamera}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)'
          }}
        >
          🔄
        </button>
      </div>

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.85)',
          borderRadius: 12,
          padding: '16px 24px',
          color: 'var(--red)',
          fontSize: 14,
          textAlign: 'center',
          maxWidth: 280
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
