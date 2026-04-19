import { io } from 'socket.io-client'

const socket = io('https://192.168.31.233:3000', {
  autoConnect: false,
  transports: ['websocket'],
  secure: true
})

export default socket