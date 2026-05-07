
const LIVEKIT_URL = "wss://livevideo-bn6u0t7w.livekit.cloud";

let room;
let localTracks = [];
let micEnabled = true;
let camEnabled = true;

async function joinRoom(){

const username = document.getElementById("username").value;
const roomName = document.getElementById("room").value;

if(!username || !roomName){
alert("Enter name and room");
return;
}

const token = await fetch(`/getToken?room=${roomName}&username=${username}`)
.then(res=>res.text());

room = new LivekitClient.Room();

await room.connect(LIVEKIT_URL, token);

localTracks = await LivekitClient.createLocalTracks({
audio:true,
video:true
});

localTracks.forEach(track=>{

room.localParticipant.publishTrack(track);

const el = track.attach();
document.getElementById("videos").appendChild(el);

});

room.on("trackSubscribed",(track)=>{

const el = track.attach();
document.getElementById("videos").appendChild(el);

});

document.getElementById("joinUI").classList.add("hidden");
document.getElementById("meetingUI").classList.remove("hidden");
document.getElementById("roomLabel").innerText = "Room: " + roomName;

}

function leaveRoom(){

if(room){
room.disconnect();
}

location.reload();

}

function toggleMic(){

micEnabled = !micEnabled;

localTracks.forEach(track=>{

if(track.kind === "audio"){
track.enabled = micEnabled;
}

});

}

function toggleCamera(){

camEnabled = !camEnabled;

localTracks.forEach(track=>{

if(track.kind === "video"){
track.enabled = camEnabled;
}

});

}

async function shareScreen(){

const screenTrack = await LivekitClient.createLocalScreenTracks();

screenTrack.forEach(track=>{

room.localParticipant.publishTrack(track);

});

}
