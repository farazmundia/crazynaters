# LiveKit Audio Call Project

This is a simple audio-only calling app using:

- HTML
- CSS
- JavaScript
- Node.js
- Express
- LiveKit

Users can join the same room and talk with each other. First 2 users can join, and later more users can join by using the same room name.

---

## 1. Requirements

Install these first:

- Node.js
- npm
- LiveKit Cloud account

You can create a LiveKit Cloud project here:

https://cloud.livekit.io/

---

## 2. Project files

```txt
livekit-audio-call/
  server.js
  package.json
  .env.example
  README.md
  public/
    index.html
    style.css
    app.js
```

---

## 3. Setup steps

### Step 1: Extract ZIP file

Extract the project ZIP file.

Then open the folder in VS Code or your terminal.

```bash
cd livekit-audio-call
```

---

### Step 2: Install dependencies

```bash
npm install
```

---

### Step 3: Create `.env` file

Copy `.env.example` and rename the copied file to `.env`.

Then add your real LiveKit values:

```env
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
PORT=3000

wss://crazynaters-7dx23rhk.livekit.cloud
APIRGoZhiE4LMoN
1yFzWJ9pZZaaXtPjOmpn4ouRA0NarFyt1SedHsUsCeg
LIVEKIT_URL=wss://crazynaters-7dx23rhk.livekit.cloud
LIVEKIT_API_KEY=APIRGoZhiE4LMoN
LIVEKIT_API_SECRET=1yFzWJ9pZZaaXtPjOmpn4ouRA0NarFyt1SedHsUsCeg

LIVEKIT_URL=wss://crazynaters-7dx23rhk.livekit.cloud
LIVEKIT_API_KEY=APIRGoZhiE4LMoN
LIVEKIT_API_SECRET=1yFzWJ9pZZaaXtPjOmpn4ouRA0NarFyt1SedHsUsCeg

```

You can find these values in your LiveKit Cloud project dashboard.

---

### Step 4: Start the project

```bash
npm start
```

You should see something like:

```txt
Server running at http://localhost:3000
```

---

### Step 5: Open in browser

Open this URL:

```txt
http://localhost:3000
```

---

## 4. How to test with 2 users

### User 1

Open one browser tab:

- Name: User 1
- Room name: test-room
- Click: Join Call

### User 2

Open another browser tab, another browser, or another device:

- Name: User 2
- Room name: test-room
- Click: Join Call

Both users must use the same room name.

---

## 5. How more users can join later

Any new user can join the same call by entering the same room name.

Example:

```txt
test-room
```

So User 3, User 4, User 5, etc. can join the same room.

---

## 6. Important security note

This project is simple for learning.

For production, do not let anyone generate tokens freely. You should protect `/get-token` with login/authentication so only allowed users can join rooms.

Never put your LiveKit API secret inside frontend JavaScript.

---

## 7. Common issues

### Microphone permission not showing

Use Chrome and allow microphone permission when the browser asks.

---

### Users cannot hear each other

Check these things:

1. Both users joined the same room name.
2. Microphone permission is allowed.
3. LiveKit URL, API key, and API secret are correct in `.env`.
4. Try using two different browsers or devices.

---

### Error: LiveKit environment variables are missing

Your `.env` file may be missing or incorrectly named.

Correct filename:

```txt
.env
```

Not:

```txt
.env.txt
```

---

### Error when running npm start

Make sure dependencies are installed:

```bash
npm install
```

Then run again:

```bash
npm start
```
