const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const os = require('os');
const Session = require('./models/Session');

const app = express();
const server = http.createServer(app);

// Allowed Origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://YOUR_PROJECT.vercel.app', // <-- Isko baad me apne Vercel URL se replace karna
];

// Express CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      return callback(new Error(`Socket CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/wifikit';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err.message));

function getLocalIP() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return 'localhost';
}

function makeRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get('/', (req, res) => {
  res.send('🚀 WifiKit Backend Running');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WifiKit API Running',
  });
});

app.get('/api/ip', (req, res) => {
  res.json({ ip: getLocalIP() });
});

app.post('/api/sessions', async (req, res) => {
  try {
    const sessionId = makeRoomCode();
    const session = new Session({ sessionId });

    await session.save();

    res.json({ sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.id.toUpperCase(),
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
      });
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await Session.deleteOne({
      sessionId: req.params.id.toUpperCase(),
    });

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

const activeRooms = new Map();

io.on('connection', (socket) => {
  socket.on('join', ({ room, role }) => {
    socket.join(room);

    socket.data.room = room;
    socket.data.role = role;

    if (!activeRooms.has(room)) {
      activeRooms.set(room, new Set());
    }

    activeRooms.get(room).add(socket.id);

    socket.to(room).emit('peer-joined', { role });
  });

  socket.on('offer', ({ room, offer }) => {
    socket.to(room).emit('offer', offer);
  });

  socket.on('answer', ({ room, answer }) => {
    socket.to(room).emit('answer', answer);
  });

  socket.on('ice', ({ room, candidate }) => {
    socket.to(room).emit('ice', candidate);
  });

  socket.on('camera-switch', ({ room, facing }) => {
    socket.to(room).emit('camera-switched', { facing });
  });

  socket.on('stream-status', ({ room, active }) => {
    socket.to(room).emit('stream-status', { active });
  });

  socket.on('disconnect', () => {
    const { room, role } = socket.data;

    if (room) {
      const members = activeRooms.get(room);

      if (members) {
        members.delete(socket.id);

        if (members.size === 0) {
          activeRooms.delete(room);
        }
      }

      socket.to(room).emit('peer-left', { role });
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WifiKit Server Running on Port ${PORT}`);
});