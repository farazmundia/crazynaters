const {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
} = LivekitClient;

let room = null;
let localAudioTrack = null;
let microphoneMuted = false;

const usernameInput = document.getElementById("username");
const roomNameInput = document.getElementById("roomName");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const micBtn = document.getElementById("micBtn");
const statusText = document.getElementById("statusText");
const participantsDiv = document.getElementById("participants");
const participantCount = document.getElementById("participantCount");
const connectionDot = document.getElementById("connectionDot");

joinBtn.addEventListener("click", joinCall);
leaveBtn.addEventListener("click", leaveCall);
micBtn.addEventListener("click", toggleMicrophone);

async function joinCall() {
  const username = usernameInput.value.trim();
  const roomName = roomNameInput.value.trim();

  if (!username || !roomName) {
    alert("Please enter your name and room name.");
    return;
  }

  try {
    joinBtn.disabled = true;
    setStatus("Getting token...");

    const response = await fetch("/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: username, roomName }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Token request failed");
    }

    setStatus("Connecting...");

    room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    setupRoomEvents();

    await room.connect(data.livekitUrl, data.token);

    localAudioTrack = await createLocalAudioTrack({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    });

    await room.localParticipant.publishTrack(localAudioTrack);

    microphoneMuted = false;
    updateConnectedUI(roomName);
    renderParticipants();
  } catch (error) {
    console.error(error);
    alert(error.message || "Connection failed");
    resetUI();
  }
}

function setupRoomEvents() {
  room.on(RoomEvent.ParticipantConnected, renderParticipants);
  room.on(RoomEvent.ParticipantDisconnected, renderParticipants);
  room.on(RoomEvent.ActiveSpeakersChanged, renderParticipants);

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Audio) {
      const audioElement = track.attach();
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      document.body.appendChild(audioElement);
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((element) => element.remove());
  });

  room.on(RoomEvent.Disconnected, resetUI);
}

async function toggleMicrophone() {
  if (!localAudioTrack) return;

  microphoneMuted = !microphoneMuted;
  await localAudioTrack.setMuted(microphoneMuted);

  micBtn.textContent = microphoneMuted ? "Unmute Microphone" : "Mute Microphone";
  micBtn.classList.toggle("muted", microphoneMuted);
}

function renderParticipants() {
  if (!room) return;

  participantsDiv.innerHTML = "";

  const activeSpeakerIds = new Set(
    room.activeSpeakers.map((participant) => participant.identity)
  );

  const allParticipants = [
    {
      identity: room.localParticipant.identity,
      isLocal: true,
      isSpeaking: activeSpeakerIds.has(room.localParticipant.identity),
    },
    ...Array.from(room.remoteParticipants.values()).map((participant) => ({
      identity: participant.identity,
      isLocal: false,
      isSpeaking: activeSpeakerIds.has(participant.identity),
    })),
  ];

  participantCount.textContent = allParticipants.length;

  if (allParticipants.length === 0) {
    participantsDiv.innerHTML = `<div class="empty">No participants yet.</div>`;
    return;
  }

  allParticipants.forEach((participant) => {
    const div = document.createElement("div");
    div.className = `participant ${participant.isSpeaking ? "speaking" : ""}`;
    div.innerHTML = `
      <strong>${escapeHtml(participant.identity)} ${participant.isLocal ? "(You)" : ""}</strong>
      <small>${participant.isSpeaking ? "Speaking" : "Connected"}</small>
    `;
    participantsDiv.appendChild(div);
  });
}

function updateConnectedUI(roomName) {
  setStatus(`Connected to ${roomName}`);
  connectionDot.classList.add("connected");

  usernameInput.disabled = true;
  roomNameInput.disabled = true;

  joinBtn.classList.add("hidden");
  leaveBtn.classList.remove("hidden");
  leaveBtn.disabled = false;

  micBtn.classList.remove("hidden");
  micBtn.textContent = "Mute Microphone";
  micBtn.classList.remove("muted");
}

async function leaveCall() {
  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack = null;
  }

  if (room) {
    room.disconnect();
  }

  resetUI();
}

function resetUI() {
  document.querySelectorAll("audio").forEach((audio) => audio.remove());

  room = null;
  localAudioTrack = null;
  microphoneMuted = false;

  setStatus("Not connected");
  connectionDot.classList.remove("connected");

  usernameInput.disabled = false;
  roomNameInput.disabled = false;

  joinBtn.disabled = false;
  joinBtn.classList.remove("hidden");

  leaveBtn.disabled = true;
  leaveBtn.classList.add("hidden");

  micBtn.classList.add("hidden");
  micBtn.textContent = "Mute Microphone";
  micBtn.classList.remove("muted");

  participantCount.textContent = "0";
  participantsDiv.innerHTML = `<div class="empty">No participants yet.</div>`;
}

function setStatus(message) {
  statusText.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
