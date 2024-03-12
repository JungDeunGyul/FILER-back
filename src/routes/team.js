const express = require("express");
const router = express.Router();

const removeJoinRequest = require("../utils/removeJoinReqest");

const { User } = require("../models/User");
const { Team } = require("../models/Team");
const { Folder } = require("../models/Folder");
const { File } = require("../models/File");

let clientTeamJoinRequestSSE = [];

const sendUserDataToClients = (targetUserData, messageTargetUserId, action) => {
  const client = clientTeamJoinRequestSSE.find((client) => {
    return client.loginUser === messageTargetUserId;
  });

  if (client) {
    const message = {
      action,
      userData: targetUserData,
    };
    client.write(`data: ${JSON.stringify(message)}\n\n`);
  }
};

router.post("/:teamName/createfolder/:userId", async (req, res, next) => {
  try {
    const { userId, teamName } = req.params;
    const { folderName } = req.body;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = await Team.findOne({ name: teamName });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const isUserInTeam = team.members.some((member) =>
      member.user.equals(userId),
    );
    if (!isUserInTeam) {
      return res
        .status(403)
        .json({ message: "유저가 해당 팀에 속해 있지 않습니다." });
    }

    const userRoleInTeam = team.members.find((member) =>
      member.user.equals(userId),
    ).role;

    if (userRoleInTeam !== "팀장" && userRoleInTeam !== "팀원") {
      return res
        .status(403)
        .json({ message: "폴더를 생성할 권한이 없습니다." });
    }

    const isFolder = team.ownedFolders.some(
      (folder) => folder.name === folderName,
    );

    if (isFolder) {
      return res.status(412).json({ message: "폴더 이름이 이미 존재합니다" });
    }

    const newFolder = await Folder.create({
      name: folderName,
      ownerTeam: team._id,
    });

    team.ownedFolders.push(newFolder);

    await team.save();
    await user.save();

    const updatedUser = await User.findOne({ _id: userId })
      .populate({
        path: "teams",
        populate: {
          path: "members.user",
        },
      })
      .populate({
        path: "teams",
        populate: {
          path: "members.user",
        },
      })
      .populate({
        path: "teams",
        populate: {
          path: "ownedFolders",
        },
      });

    return res
      .status(201)
      .json({ message: "Folder created successfully", updatedUser });
  } catch (error) {
    return res.status(400).json({ message: "Faild, create Folder" });
  }
});

router.patch("/:teamName/joinrequest/:userId", async (req, res, next) => {
  try {
    const { userId, teamName } = req.params;
    const { action } = req.body;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = await Team.findOne({ name: teamName });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const isMember = team.members.some(
      (member) => member.user.toString() === userId,
    );
    const isJoinRequested = team.joinRequests.some(
      (request) => request.user.toString() === userId,
    );

    if (isMember) {
      return res.status(412).json({ message: "User is already a member" });
    } else if (isJoinRequested) {
      return res
        .status(412)
        .json({ message: "User is already has a pending request" });
    }

    const teamLeaderId = team.leader._id;

    if (userId === teamLeaderId) {
      if (action === "수락") {
        user.teams.push(team._id);
        user.teamMemberships.push({
          team: team._id,
          role: "수습",
          status: "수락",
        });

        team.members.push({
          user: user._id,
          role: "수습",
        });

        removeJoinRequest(team, userId);
        sendUserDataToClients(user, userId, action);
      } else if (action === "거절") {
        removeJoinRequest(team, userId);
        sendUserDataToClients(user, userId, action);
      }
    } else {
      team.joinRequests.push({ user: userId });
      res
        .status(200)
        .json({ message: "Your request has been sent successfully" });

      sendUserDataToClients(user, teamLeaderId, action);
    }

    await user.save();
    await team.save();
  } catch (error) {
    return res.status(400).json({ message: "Faild, team join request" });
  }
});

router.post("/:teamName/new/:userId", async (req, res, next) => {
  try {
    const { userId, teamName } = req.params;

    if (teamName.length < 3 || teamName.length > 10) {
      return res
        .status(400)
        .json({ message: "Team name should be between 3 and 10 characters" });
    }

    const specialChars = '!@#$%^&*(),.?":{}|<>';
    for (let i = 0; i < teamName.length; i++) {
      if (specialChars.includes(teamName[i])) {
        return res
          .status(400)
          .json({ message: "Team name cannot contain special characters" });
      }
    }

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingTeam = await Team.findOne({ name: teamName });
    if (existingTeam) {
      return res
        .status(400)
        .json({ message: "Failed to create team. Same team name issue" });
    }

    const newTeam = await Team.create({
      name: teamName,
      members: [
        {
          user: user._id,
          role: "팀장",
        },
      ],
      leader: user._id,
    });

    user.teams.push(newTeam._id);
    user.teamMemberships.push({
      team: newTeam._id,
      role: "팀장",
      status: "수락",
    });

    await user.save();

    const updatedUser = await User.findOne({ email: userData.email })
      .populate({
        path: "teams",
        populate: {
          path: "members.user",
        },
      })
      .populate({
        path: "teams",
        populate: {
          path: "ownedFolders",
        },
      })
      .populate({
        path: "teams",
        populate: {
          path: "ownedFiles",
        },
      });

    return res
      .status(201)
      .json({ message: "Team created successfully", updatedUser });
  } catch (error) {
    return res.status(400).json({ message: "Failed to create Team" });
  }
});

router.get("/filer-stream/:loginUser", (req, res) => {
  const loginUser = req.params.loginUser;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.loginUser = loginUser;

  clientTeamJoinRequestSSE.push(res);

  req.on("close", () => {
    clientsSSE = clientsSSE.filter((client) => client !== res);
  });
});

module.exports = router;
