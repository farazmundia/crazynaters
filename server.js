const express = require("express");
const cors = require("cors");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
app.use(express.static("public"));
app.use(cors());

const API_KEY = "APIRGoZhiE4LMoN";
const API_SECRET = "1yFzWJ9pZZaaXtPjOmpn4ouRA0NarFyt1SedHsUsCeg";

app.get("/getToken", async (req, res) => {

  const room = req.query.room;
  const username = req.query.username;

  if (!room || !username) {
    return res.status(400).send("Missing room or username");
  }

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: username
  });

  at.addGrant({
    roomJoin: true,
    room: room,
    canPublish: true,
    canSubscribe: true
  });

  const token = await at.toJwt();

  res.send(token);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});