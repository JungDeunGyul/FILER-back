const express = require("express");
const router = express.Router();

let clientTeamJoinRequestSSE = [];

const sendUserDataToClients = (
  targetUserData,
  messageTargetUserId,
  action,
  notification,
) => {
  const client = clientTeamJoinRequestSSE.find((client) => {
    return client.loginUserId === messageTargetUserId.toString();
  });

  if (client) {
    const message = {
      action,
      userData: targetUserData,
      notification,
    };
    client.write(`data: ${JSON.stringify(message)}\n\n`);
  }
};

router.get("/:loginUserId", (req, res) => {
  const loginUserId = req.params.loginUserId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.loginUserId = loginUserId;

  clientTeamJoinRequestSSE.push(res);

  req.on("close", () => {
    clientTeamJoinRequestSSE = clientTeamJoinRequestSSE.filter(
      (client) => client !== res,
    );
  });
});

module.exports = { router, sendUserDataToClients };
