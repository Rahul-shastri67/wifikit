# 🚀 WifiKit

> Stream your phone camera to any device over local WiFi — **no internet required**.

WifiKit is a lightweight, real-time video streaming application that enables seamless camera sharing between devices on the same network using **WebRTC**. Built with the MERN stack, it focuses on speed, simplicity, and zero external dependency.

---

## ✨ Features

* 📡 **Real-time streaming** over local WiFi (no internet needed)
* 📱 **Phone to desktop camera streaming**
* 🔄 Front / rear camera toggle
* 📊 Live FPS and resolution stats
* 🔗 QR code + manual room code pairing
* ⏱️ Auto-expiring sessions (1 hour)
* 🎯 Low latency via WebRTC (peer-to-peer connection)

---

## 🛠️ Tech Stack

* **MongoDB** — Session storage with auto-expiry
* **Express.js** — Backend API & session handling
* **React (Vite)** — Frontend UI (mobile + desktop)
* **Node.js + Socket.io** — Real-time signaling server
* **WebRTC** — Peer-to-peer video streaming

---

## 📁 Project Structure

```
wifikit/
├── server/              # Express + Socket.io backend
│   ├── index.js
│   └── models/
│       └── Session.js
│
└── client/              # React frontend (Vite)
    └── src/
        ├── pages/
        │   ├── Home.jsx
        │   ├── Desktop.jsx
        │   └── Mobile.jsx
        └── socket.js
```

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/wifikit.git
cd wifikit
```

### 2️⃣ Backend setup

```bash
cd server
npm install
npm run dev
```

### 3️⃣ Frontend setup

```bash
cd client
npm install
npm run dev
```

---

## 🌐 Usage

1. Ensure both devices are on the **same WiFi network**
2. Open on laptop:

```
http://<your-laptop-ip>:3000
```

3. Click **"View Stream"**
4. Scan the QR code using your phone
5. Tap **START** on mobile
6. 🎉 Live stream starts instantly

---

## 🔐 Environment Variables

Create a `.env` file in the `server/` directory:

```
MONGO_URI=mongodb://localhost:27017/wifikit
PORT=5000
```

---

## 🧠 How It Works

* A session is created on the server (MongoDB)
* Socket.io handles signaling between devices
* WebRTC establishes a **direct peer-to-peer connection**
* Video stream flows over LAN with minimal latency

---

## 📸 Screenshots (Optional)

*Add screenshots here for better presentation*

---

## 🚀 Future Improvements

* 🔒 Authentication system
* 🌍 Remote streaming via TURN servers
* 📹 Recording functionality
* 📦 PWA support

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📄 License

This project is licensed under the MIT License.

---

## 💡 Author

**Rahul Shastri**
Feel free to connect and contribute 🚀
