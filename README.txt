
LIVEKIT VIDEO CALL PROJECT

1) Install dependencies
npm install

2) Add your LiveKit credentials in server/server.js

LIVEKIT_API_KEY
LIVEKIT_API_SECRET

wss://livevideo-bn6u0t7w.livekit.cloud
APIZDkuAL5YjZ6S
NRlGNaye8XXBKNZ3tt6j7wJSQN5nkU8Ghf6lWe5naJhB


LIVEKIT_URL=wss://livevideo-bn6u0t7w.livekit.cloud
LIVEKIT_API_KEY=APIZDkuAL5YjZ6S
LIVEKIT_API_SECRET=NRlGNaye8XXBKNZ3tt6j7wJSQN5nkU8Ghf6lWe5naJhB

3) Add your LiveKit WebSocket URL in public/app.js

wss://your-livekit-url

4) Start server
npm start

5) Open browser
http://localhost:3000

Supports:
- Multiple rooms
- Multiple users
- Camera & microphone
- Screen sharing
