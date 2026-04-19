import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Desktop from './pages/Desktop'
import Mobile from './pages/Mobile'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/desktop" element={<Desktop />} />
      <Route path="/mobile" element={<Mobile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
