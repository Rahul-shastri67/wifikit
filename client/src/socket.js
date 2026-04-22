import { io } from 'socket.io-client'

const isPhone = window.location.hostname !== 'localhost'
const serverUrl = isPhone 
  ? 'https://192.168.31.233:3000' 
  : 'https://localhost:3000'

const socket = io(serverUrl, {
  autoConnect: false,
  transports: ['websocket'],
  secure: true
})

export default socket