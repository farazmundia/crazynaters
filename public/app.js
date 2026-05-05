const {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
} = LivekitClient;

let room = null;
let localAudioTrack = null;
let microphoneMuted = false;
let participantsRenderTimer = null;

const usernameInput = document.getElementById("username");
const roomNameInput = document.getElementById("roomName");
const activeRoomText = document.getElementById("activeRoomText");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const micBtn = document.getElementById("micBtn");
const micLabel = document.getElementById("micLabel");
const micIcon = document.getElementById("micIcon");
const statusText = document.getElementById("statusText");
const participantsDiv = document.getElementById("participants");
const participantCount = document.getElementById("participantCount");
const connectionDot = document.getElementById("connectionDot");

if (joinBtn) joinBtn.addEventListener("click", joinCall);
if (leaveBtn) leaveBtn.addEventListener("click", leaveCall);
if (micBtn) micBtn.addEventListener("click", toggleMicrophone);

updateMicButton();

async function joinCall() {
  const username = usernameInput?.value.trim();
  const roomName = roomNameInput?.value.trim();

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
    startParticipantsRenderLoop();
    renderParticipants();
  } catch (error) {
    console.error(error);
    alert(error.message || "Connection failed");
    resetUI();
  }
}

function setupRoomEvents() {
  if (!room) return;

  room.on(RoomEvent.ParticipantConnected, renderParticipants);
  room.on(RoomEvent.ParticipantDisconnected, renderParticipants);
  room.on(RoomEvent.ActiveSpeakersChanged, renderParticipants);
  room.on(RoomEvent.TrackMuted, renderParticipants);
  room.on(RoomEvent.TrackUnmuted, renderParticipants);
  room.on(RoomEvent.ConnectionStateChanged, renderParticipants);

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Audio) {
      const audioElement = track.attach();
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.classList.add("remote-audio");
      document.body.appendChild(audioElement);
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((element) => element.remove());
  });

  room.on(RoomEvent.Disconnected, resetUI);
}

function startParticipantsRenderLoop() {
  stopParticipantsRenderLoop();
  participantsRenderTimer = setInterval(() => {
    if (room) renderParticipants();
  }, 180);
}

function stopParticipantsRenderLoop() {
  if (participantsRenderTimer) {
    clearInterval(participantsRenderTimer);
    participantsRenderTimer = null;
  }
}

async function toggleMicrophone() {
  if (!localAudioTrack) return;

  const nextMutedState = !microphoneMuted;

  try {
    if (nextMutedState) {
      if (typeof localAudioTrack.mute === "function") {
        await localAudioTrack.mute();
      } else if (localAudioTrack.mediaStreamTrack) {
        localAudioTrack.mediaStreamTrack.enabled = false;
      }
    } else {
      if (typeof localAudioTrack.unmute === "function") {
        await localAudioTrack.unmute();
      } else if (localAudioTrack.mediaStreamTrack) {
        localAudioTrack.mediaStreamTrack.enabled = true;
      }
    }

    microphoneMuted = nextMutedState;
    updateMicButton();
    renderParticipants();
  } catch (error) {
    console.error("Microphone toggle failed:", error);
    alert("Could not toggle microphone. Please check browser microphone permission.");
  }
}

function renderParticipants() {
  if (!room || !participantsDiv) return;

  const localIsSpeaking = Boolean(room.localParticipant?.isSpeaking) || getNumericAudioLevel(room.localParticipant) > 0.04;
  const localLevel = getVisualAudioLevel(room.localParticipant, localIsSpeaking);

  const allParticipants = [
    {
      identity: room.localParticipant.identity || "You",
      isLocal: true,
      isSpeaking: localIsSpeaking,
      level: localLevel,
      muted: microphoneMuted,
    },
    ...Array.from(room.remoteParticipants.values()).map((participant) => {
      const isSpeaking = Boolean(participant.isSpeaking) || getNumericAudioLevel(participant) > 0.04;
      return {
        identity: participant.identity,
        isLocal: false,
        isSpeaking,
        level: getVisualAudioLevel(participant, isSpeaking),
        muted: isParticipantMuted(participant),
      };
    }),
  ];

  if (participantCount) {
    participantCount.textContent = String(allParticipants.length);
  }

  if (allParticipants.length === 0) {
    participantsDiv.innerHTML = getEmptyStateMarkup();
    return;
  }

  participantsDiv.innerHTML = allParticipants
    .map((participant) => createParticipantMarkup(participant))
    .join("");
}

function createParticipantMarkup(participant) {
  const safeIdentity = escapeHtml(participant.identity || "Guest");
  const initials = getInitials(safeIdentity);
  const waveMarkup = getWaveMarkup(participant.level, participant.isSpeaking && !participant.muted);

  return `
    <div class="participant-row ${participant.isSpeaking ? "active" : ""} ${participant.isLocal ? "local" : ""}">
      <div class="avatar">${initials}</div>
      <div class="participant-meta">
        <div class="participant-name">${safeIdentity}</div>
        <div class="participant-subline">
          ${participant.isLocal ? `<span class="you-badge">You</span>` : `<span class="live-badge">Connected</span>`}
          ${participant.muted ? `<span class="muted-badge">Muted</span>` : ``}
        </div>
      </div>
      ${waveMarkup}
    </div>
  `;
}

function getWaveMarkup(level, active) {
  const bars = createWaveHeights(level).map((height) => `<span style="height:${height}px"></span>`).join("");
  return `<div class="voice-wave ${active ? "active" : ""}" aria-label="Voice activity">${bars}</div>`;
}

function createWaveHeights(level) {
  const base = 6;
  const amplified = Math.max(0, Math.min(1, level));
  const values = [0.45, 0.82, 1, 0.72, 0.4];

  return values.map((factor, index) => {
    const pulse = Math.sin((Date.now() / 140) + index) * 1.4;
    const height = base + amplified * 18 * factor + Math.max(0, pulse);
    return Math.round(height);
  });
}

function updateConnectedUI(roomName) {
  setStatus("Connected");
  activeRoomText.textContent = roomName;
  connectionDot?.classList.add("connected");

  if (usernameInput) usernameInput.disabled = true;
  if (roomNameInput) roomNameInput.disabled = true;

  joinBtn?.classList.add("hidden");
  if (leaveBtn) {
    leaveBtn.classList.remove("hidden");
    leaveBtn.disabled = false;
  }
  micBtn?.classList.remove("hidden");
  updateMicButton();
}

async function leaveCall() {
  stopParticipantsRenderLoop();

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
  stopParticipantsRenderLoop();

  room = null;
  localAudioTrack = null;
  microphoneMuted = false;

  setStatus("Not connected");
  if (activeRoomText) activeRoomText.textContent = "Not joined yet";
  connectionDot?.classList.remove("connected");

  if (usernameInput) usernameInput.disabled = false;
  if (roomNameInput) roomNameInput.disabled = false;

  if (joinBtn) {
    joinBtn.disabled = false;
    joinBtn.classList.remove("hidden");
  }

  if (leaveBtn) {
    leaveBtn.disabled = true;
    leaveBtn.classList.add("hidden");
  }

  micBtn?.classList.add("hidden");
  updateMicButton();

  if (participantCount) participantCount.textContent = "0";
  if (participantsDiv) participantsDiv.innerHTML = getEmptyStateMarkup();
}

function updateMicButton() {
  if (!micBtn || !micLabel || !micIcon) return;

  micBtn.classList.toggle("muted", microphoneMuted);
  micBtn.setAttribute("aria-label", microphoneMuted ? "Unmute Microphone" : "Mute Microphone");
  micLabel.textContent = microphoneMuted ? "Unmute" : "Mute";
  micIcon.innerHTML = microphoneMuted ? getMicOffIcon() : getMicOnIcon();
}

function isParticipantMuted(participant) {
  if (!participant?.audioTrackPublications) return false;

  for (const publication of participant.audioTrackPublications.values()) {
    if (typeof publication.isMuted === "boolean") {
      return publication.isMuted;
    }
  }

  return false;
}

function getNumericAudioLevel(participant) {
  if (!participant || typeof participant.audioLevel !== "number") return 0;
  if (!Number.isFinite(participant.audioLevel)) return 0;
  return Math.max(0, Math.min(1, participant.audioLevel));
}

function getVisualAudioLevel(participant, isSpeaking) {
  const actualLevel = getNumericAudioLevel(participant);
  if (actualLevel > 0) return actualLevel;
  return isSpeaking ? 0.55 : 0.02;
}

function setStatus(message) {
  if (statusText) statusText.textContent = message;
}

function getInitials(name) {
  const clean = String(name).trim();
  if (!clean) return "?";
  const words = clean.split(/\s+/).slice(0, 2);
  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

function getEmptyStateMarkup() {
  return `
    <div class="empty-state">
      <div class="empty-icon">🎙️</div>
      <strong>No participants yet</strong>
      <span>Join a room to start the audio call.</span>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMicOnIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <path d="M12 19v2"></path>
      <path d="M8 21h8"></path>
    </svg>
  `;
}

function getMicOffIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path>
      <path d="M15 7V6a3 3 0 0 0-5.72-1.24"></path>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2"></path>
      <path d="M19 10v2c0 1.1-.25 2.15-.7 3.08"></path>
      <path d="M12 19v2"></path>
      <path d="M8 21h8"></path>
      <path d="M3 3l18 18"></path>
    </svg>
  `;
}
