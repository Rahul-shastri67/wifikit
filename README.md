# WifiKit

Stream your phone camera to any device over local WiFi — no internet required.

## Tech Stack

- **MongoDB** — session storage with auto-expiry
- **Express.js** — REST API for session management
- **React** — UI for both desktop viewer and mobile streamer
- **Node.js** — signaling server via Socket.io
- **WebRTC** — peer-to-peer video streaming (zero internet, pure LAN)

## Project Structure

```
wifikit/
├── server/          Express + Socket.io signaling server
│   ├── index.js
│   └── models/
│       └── Session.js
└── client/          React app (Vite)
    └── src/
        ├── pages/
        │   ├── Home.jsx      Landing page
        │   ├── Desktop.jsx   Viewer (laptop/PC)
        │   └── Mobile.jsx    Streamer (phone)
        └── socket.js
```

## Setup

Make sure MongoDB is running locally, then:

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Both your laptop and phone need to be on the **same WiFi network**.

## How it works

1. Open `http://<your-laptop-ip>:3000` on your laptop → click **View Stream**
2. A QR code appears on screen — scan it with your phone
3. Phone opens the mobile streamer page, tap **START**
4. Live camera feed appears on the laptop instantly

## Features

- Front / rear camera toggle
- Real-time FPS and resolution stats on the desktop
- QR code + manual room code pairing
- Start / stop streaming controls
- Sessions auto-expire after 1 hour
- Zero internet dependency — pure LAN WebRTC

## Environment Variables

```env
MONGO_URI=mongodb://localhost:27017/wifikit
PORT=5000
```
