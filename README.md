# LiveKit Simple Audio Call

This is a simple audio-only LiveKit calling project using HTML, CSS, JavaScript, and a Node.js token server.

## Features

- Join a LiveKit audio room
- Multiple users can join the same room
- Multiple rooms are supported by room name
- Microphone is enabled by default after joining
- Mute / unmute microphone button
- Leave Call button is hidden before joining
- Leave Call button appears only after the call is connected
- Speaker / ear speaker switching has been removed because mobile browsers cannot reliably force that behavior

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your `.env` file

Copy `.env.example` and rename it to `.env`.

```bash
cp .env.example .env
```

Then add your LiveKit values:

```env
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
PORT=3000
```

### 3. Start the app

```bash
npm start
```

Open:

```txt
http://localhost:3000
```

## How multiple rooms work

Users with the same room name join the same call.

Example:

```txt
Hamza joins test-room1
Ali joins test-room1
```

Both users are in the same call.

Different room names create separate calls:

```txt
User A joins test-room1
User B joins test-room2
```

They are in different rooms.

## Testing on mobile

For microphone access, use HTTPS when testing on real devices, except localhost.

For local network testing, use a tunnel like ngrok:

```bash
ngrok http 3000
```

Then open the HTTPS ngrok URL on your mobile device.
