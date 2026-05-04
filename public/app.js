const LiveKit = window.LivekitClient;

let room = null;
let localAudioTrack = null;
let micMuted = false;
let loudSpeakerEnabled = false;
let currentRoomName = "";

function $(id) {
  return document.getElementById(id);
}

document.addEventListener("DOMContentLoaded", () => {
  const joinForm = $("joinForm");
  const joinBtn = $("joinBtn");
  const leaveBtn = $("leaveBtn");
  const micBtn = $("micBtn");
  const speakerBtn = $("speakerBtn");

  loadRoomFromUrl();
  resetUI();

  if (joinForm) {
    joinForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await joinCall();
    });
  } else if (joinBtn) {
    joinBtn.addEventListener("click", joinCall);
  }

  if (leaveBtn) leaveBtn.addEventListener("click", leaveCall);
  if (micBtn) micBtn.addEventListener("click", toggleMicrophone);
  if (speakerBtn) speakerBtn.addEventListener("click", toggleSpeaker);
});

function loadRoomFromUrl() {
  const roomNameInput = $("roomName");
  const params = new URLSearchParams(window.location.search);
  const roomFromUrl = params.get("room");

  if (roomNameInput && roomFromUrl) {
    roomNameInput.value = roomFromUrl;
  }
}

async function joinCall() {
  const usernameInput = $("username");
  const roomNameInput = $("roomName");
  const username = usernameInput?.value.trim();
  const roomName = roomNameInput?.value.trim();

  if (!username || !roomName) {
    alert("Please enter your name and room name.");
    return;
  }

  try {
    currentRoomName = roomName;
    setStatus("Getting token...");
    setButtonsLoading(true);

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

    room = new LiveKit.Room({
      adaptiveStream: true,
      dynacast: true,
    });

    setupRoomEvents();

    await room.connect(data.livekitUrl, data.token);

    // Mic is ON by default after joining.
    localAudioTrack = await LiveKit.createLocalAudioTrack({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    });

    await room.localParticipant.publishTrack(localAudioTrack);
    micMuted = false;
    loudSpeakerEnabled = false;

    setStatus(`Connected to ${roomName}`);
    setConnectedUI(true);
    renderParticipants();
  } catch (error) {
    console.error(error);
    setStatus("Connection failed");
    setConnectedUI(false);
    alert(error.message || "Unable to join call");
  } finally {
    setButtonsLoading(false);
  }
}

function setupRoomEvents() {
  if (!room) return;

  room.on(LiveKit.RoomEvent.ParticipantConnected, renderParticipants);
  room.on(LiveKit.RoomEvent.ParticipantDisconnected, renderParticipants);
  room.on(LiveKit.RoomEvent.ActiveSpeakersChanged, renderParticipants);

  room.on(LiveKit.RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === LiveKit.Track.Kind.Audio) {
      const audioElement = track.attach();
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.className = "remote-audio";
      document.body.appendChild(audioElement);

      applySpeakerPreferenceToAudio(audioElement);
    }
  });

  room.on(LiveKit.RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((element) => element.remove());
  });

  room.on(LiveKit.RoomEvent.Disconnected, () => {
    cleanupAfterDisconnect();
  });
}

async function toggleMicrophone() {
  const micBtn = $("micBtn");

  if (!localAudioTrack) return;

  micMuted = !micMuted;

  if (micMuted) {
    await localAudioTrack.mute();
    if (micBtn) micBtn.textContent = "Unmute Microphone";
  } else {
    await localAudioTrack.unmute();
    if (micBtn) micBtn.textContent = "Mute Microphone";
  }
}

async function toggleSpeaker() {
  const speakerBtn = $("speakerBtn");
  const deviceHelp = $("deviceHelp");

  loudSpeakerEnabled = !loudSpeakerEnabled;

  if (speakerBtn) {
    speakerBtn.textContent = loudSpeakerEnabled ? "Use Ear Speaker" : "Use Loud Speaker";
  }

  const audios = document.querySelectorAll("audio.remote-audio");

  for (const audio of audios) {
    await applySpeakerPreferenceToAudio(audio);
  }

  if (deviceHelp) {
    if (typeof HTMLMediaElement.prototype.setSinkId !== "function") {
      deviceHelp.textContent = "Your browser does not support direct speaker switching. Use your phone/browser audio output controls.";
    } else {
      deviceHelp.textContent = loudSpeakerEnabled
        ? "Loud speaker mode requested. Browser/device support may vary."
        : "Ear speaker/default audio mode requested. Browser/device support may vary.";
    }
  }
}

async function applySpeakerPreferenceToAudio(audioElement) {
  if (typeof audioElement.setSinkId !== "function") {
    return;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((device) => device.kind === "audiooutput");

    if (!outputs.length) return;

    const loudSpeakerDevice = outputs.find((device) => {
      const label = device.label.toLowerCase();
      return label.includes("speaker") || label.includes("loud");
    });

    const earDevice = outputs.find((device) => {
      const label = device.label.toLowerCase();
      return label.includes("ear") || label.includes("receiver") || label.includes("default");
    });

    const selectedDevice = loudSpeakerEnabled
      ? loudSpeakerDevice || outputs[0]
      : earDevice || outputs[0];

    await audioElement.setSinkId(selectedDevice.deviceId);
  } catch (error) {
    console.warn("Speaker switch not supported or blocked:", error);
  }
}

async function leaveCall() {
  cleanupAfterDisconnect();
}

function cleanupAfterDisconnect() {
  if (room) {
    room.disconnect();
  }

  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack = null;
  }

  document.querySelectorAll("audio.remote-audio").forEach((audio) => audio.remove());

  room = null;
  micMuted = false;
  loudSpeakerEnabled = false;
  currentRoomName = "";

  resetUI();
}

function renderParticipants() {
  const participantsDiv = $("participants");
  const participantCount = $("participantCount");

  if (!participantsDiv) return;

  participantsDiv.innerHTML = "";

  if (!room) {
    participantsDiv.innerHTML = '<div class="empty">No participants yet.</div>';
    if (participantCount) participantCount.textContent = "0";
    return;
  }

  const activeSpeakerIds = new Set(room.activeSpeakers.map((p) => p.identity));
  let count = 0;

  addParticipantToUI(room.localParticipant.identity, true, activeSpeakerIds.has(room.localParticipant.identity));
  count += 1;

  room.remoteParticipants.forEach((participant) => {
    addParticipantToUI(participant.identity, false, activeSpeakerIds.has(participant.identity));
    count += 1;
  });

  if (participantCount) participantCount.textContent = String(count);
}

function addParticipantToUI(name, isLocal, isSpeaking) {
  const participantsDiv = $("participants");
  if (!participantsDiv) return;

  const div = document.createElement("div");
  div.className = `participant ${isSpeaking ? "speaking" : ""}`;

  div.innerHTML = `
    <span>${escapeHtml(name)} ${isLocal ? "(You)" : ""}</span>
    <small>${isSpeaking ? "Speaking" : "Connected"}</small>
  `;

  participantsDiv.appendChild(div);
}

function setConnectedUI(isConnected) {
  const usernameInput = $("username");
  const roomNameInput = $("roomName");
  const joinBtn = $("joinBtn");
  const leaveBtn = $("leaveBtn");
  const micBtn = $("micBtn");
  const speakerBtn = $("speakerBtn");
  const connectionDot = $("connectionDot");

  if (usernameInput) usernameInput.disabled = isConnected;
  if (roomNameInput) roomNameInput.disabled = isConnected;

  if (joinBtn) joinBtn.classList.toggle("hidden", isConnected);
  if (leaveBtn) leaveBtn.classList.toggle("hidden", !isConnected);

  if (micBtn) {
    micBtn.disabled = !isConnected;
    micBtn.textContent = "Mute Microphone";
  }

  if (speakerBtn) {
    speakerBtn.disabled = !isConnected;
    speakerBtn.textContent = "Use Loud Speaker";
  }

  if (connectionDot) {
    connectionDot.classList.toggle("online", isConnected);
    connectionDot.classList.toggle("offline", !isConnected);
  }
}

function resetUI() {
  setStatus("Not connected");
  setConnectedUI(false);
  renderParticipants();
}

function setButtonsLoading(isLoading) {
  const joinBtn = $("joinBtn");
  if (!joinBtn) return;

  joinBtn.disabled = isLoading;
  joinBtn.textContent = isLoading ? "Joining..." : "Join Call";
}

function setStatus(message) {
  const statusText = $("statusText");
  if (statusText) statusText.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
