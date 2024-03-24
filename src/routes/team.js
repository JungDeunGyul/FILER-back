const express = require("express");
const router = express.Router();

const s3client = require("../../aws/s3Client");
const s3Uploader = require("../middleware/s3Uploader");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

const removeJoinRequest = require("../utils/removeJoinReqest");
const deleteTeamResources = require("../utils/deleteTeamResources");

const { User } = require("../models/User");
const { Team } = require("../models/Team");
const { Folder } = require("../models/Folder");
const { File } = require("../models/File");

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

router.post("/:teamName/createfolder/:userId", async (req, res, next) => {
  try {
    const { userId, teamName } = req.params;
    const { folderName } = req.body;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = await Team.findOne({ name: teamName }).populate({
      path: "ownedFolders",
    });

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
        populate: [
          {
            path: "members.user",
          },
          {
            path: "ownedFolders",
          },
          {
            path: "ownedFiles",
          },
          {
            path: "joinRequests.user",
          },
        ],
      })
      .populate({
        path: "notifications",
        populate: {
          path: "team",
        },
      });

    return res
      .status(201)
      .json({ message: "Folder created successfully", updatedUser });
  } catch (error) {
    return res.status(400).json({ message: "Faild, create Folder" });
  }
});

router.post(
  "/:teamId/uploadfile/:userId",
  s3Uploader.single("file"),
  async (req, res, next) => {
    try {
      const { userId, teamId } = req.params;
      const uploadedFile = req.file;

      const user = await User.findOne({ _id: userId });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const team = await Team.findOne({ _id: teamId });
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
          .json({ message: "파일을 넣을 권한이 없습니다." });
      }

      const isFile = team.ownedFiles.some(
        (file) => file.name === uploadedFile.originalname,
      );

      if (isFile) {
        return res.status(412).json({ message: "파일 이름이 이미 존재합니다" });
      }

      const newFile = await File.create({
        name: uploadedFile.originalname,
        size: uploadedFile.size,
        type: uploadedFile.mimetype,
        ownerTeam: teamId,
        uploadUser: user.nickname,
        filePath: uploadedFile.location,
        s3Key: uploadedFile.key,
      });

      const newFileId = newFile._id;

      newFile.versions.push({
        versionNumber: 1,
        file: newFileId,
      });

      team.ownedFiles.push(newFile);

      await team.save();
      await user.save();
      await newFile.save();

      const updatedUser = await User.findOne({ _id: userId })
        .populate({
          path: "teams",
          populate: [
            {
              path: "members.user",
            },
            {
              path: "ownedFolders",
            },
            {
              path: "ownedFiles",
              populate: {
                path: "versions",
                populate: {
                  path: "file",
                },
              },
            },
            {
              path: "joinRequests.user",
            },
          ],
        })
        .populate({
          path: "notifications",
          populate: {
            path: "team",
          },
        });

      return res
        .status(201)
        .json({ message: "파일이 업로드 되었습니다!", updatedUser });
    } catch (error) {
      console.error(error);
      return res.status(400).json({ message: "Faild, create uploadfile" });
    }
  },
);

router.get("/:teamId/file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const currentUserRole = req.query.currentUserRole;
    const file = await File.findById(fileId);

    if (
      file.visibleTo !== "수습" &&
      currentUserRole !== "팀장" &&
      file.visibleTo !== currentUserRole
    ) {
      return res
        .status(201)
        .json({ message: "당신은 해당 파일을 다운 받을 권한이 없습니다." });
    }

    const getObjectParams = {
      Bucket: process.env.AWS_BUCKET,
      Key: file.s3Key,
    };

    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const { Body } = await s3client.send(getObjectCommand);
    res.attachment(file.s3Key);

    Body.pipe(res);
  } catch (error) {
    res.status(404).json({ error: "File not found" });
  }
});

router.patch("/:teamName/joinrequest/:userId", async (req, res, next) => {
  try {
    const { userId, teamName } = req.params;
    const { action, requestUserId } = req.body;

    const user = await User.findOne({ _id: userId })
      .populate({
        path: "teams",
        populate: [
          {
            path: "members.user",
          },
          {
            path: "ownedFolders",
          },
          {
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
              },
            },
          },
          {
            path: "joinRequests.user",
          },
        ],
      })
      .populate({
        path: "notifications",
        populate: {
          path: "team",
        },
      });

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

    if (isMember && action === "가입요청") {
      return res.status(412).json({ message: "User is already a member" });
    } else if (isJoinRequested && action === "가입요청") {
      return res
        .status(412)
        .json({ message: "User is already has a pending request" });
    }

    const teamLeaderId = team.leader._id;

    const teamLeader = await User.findOne({ _id: teamLeaderId })
      .populate({
        path: "teams",
        populate: [
          {
            path: "members.user",
          },
          {
            path: "ownedFolders",
          },
          {
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
              },
            },
          },
          {
            path: "joinRequests.user",
          },
        ],
      })
      .populate({
        path: "notifications",
        populate: {
          path: "team",
        },
      });

    const requestUser = await User.findOne({ _id: requestUserId });

    if (userId === teamLeaderId.toString()) {
      if (action === "수락") {
        team.members.push({
          user: requestUser._id,
          role: "수습",
        });

        requestUser.teams.push(team._id);

        requestUser.notifications.push({
          type: "가입수락",
          content: `${requestUser.nickname}님은 ${team.name}팀에 가입되셨습니다.`,
          isRead: false,
          team,
        });

        await requestUser.save();
        const updatedRequestUser = await User.findOne({ _id: requestUserId })
          .populate({
            path: "teams",
            populate: [
              {
                path: "members.user",
              },
              {
                path: "ownedFolders",
              },
              {
                path: "ownedFiles",
                populate: {
                  path: "versions",
                  populate: {
                    path: "file",
                  },
                },
              },
              {
                path: "joinRequests.user",
              },
            ],
          })
          .populate({
            path: "notifications",
            populate: {
              path: "team",
            },
          });

        removeJoinRequest(team, requestUser._id);
        sendUserDataToClients(
          updatedRequestUser,
          updatedRequestUser._id,
          action,
        );
      } else if (action === "거절") {
        requestUser.notifications.push({
          type: "가입거절",
          content: `${requestUser.nickname}님은 ${team.name}팀에 거절되셨습니다.`,
          isRead: false,
          team,
        });

        removeJoinRequest(team, requestUser._id);
        sendUserDataToClients(requestUser, requestUser._id, action);
      }

      await requestUser.save();
    } else if (action === "가입요청") {
      team.joinRequests.push({ user: userId });
      teamLeader.notifications.push({
        type: "가입요청",
        content: `${user.nickname}님이 ${team.name}에 가입 신청을 하셨습니다.`,
        requestUser: `${userId}`,
        isRead: false,
        team,
      });

      res
        .status(200)
        .json({ message: "Your request has been sent successfully" });

      sendUserDataToClients(teamLeader, teamLeaderId, action);
      await teamLeader.save();
    }

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

    await user.save();

    const updatedUser = await User.findOne({ _id: userId })
      .populate({
        path: "teams",
        populate: [
          {
            path: "members.user",
          },
          {
            path: "ownedFolders",
          },
          {
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
              },
            },
          },
          {
            path: "joinRequests.user",
          },
        ],
      })
      .populate({
        path: "notifications",
        populate: {
          path: "team",
        },
      });

    return res
      .status(201)
      .json({ message: "Team created successfully", updatedUser });
  } catch (error) {
    return res.status(400).json({ message: "Failed to create Team" });
  }
});

router.delete("/:teamName/withdraw/:userId", async (req, res, next) => {
  const { teamId, userId } = req.params;
  const userRole = req.body.currentUserRole;

  const user = await User.findOne({ _id: userId });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const team = await Team.findOne({ _id: teamId });

  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }

  const updatedTeams = user.teams.filter(
    (userTeam) => userTeam.toString() !== team._id.toString(),
  );

  user.teams = updatedTeams;
  await user.save();

  const updatedMembers = team.members.filter(
    (member) => member.user.toString() !== userId,
  );

  team.members = updatedMembers;
  await team.save();

  if (userRole === "팀장") {
    await deleteTeamResources(team);

    await Team.findOneAndDelete({ name: teamName });
  }

  const updatedUser = await User.findOne({ _id: userId })
    .populate({
      path: "teams",
      populate: [
        {
          path: "members.user",
        },
        {
          path: "ownedFolders",
        },
        {
          path: "ownedFiles",
          populate: {
            path: "versions",
            populate: {
              path: "file",
            },
          },
        },
        {
          path: "joinRequests.user",
        },
      ],
    })
    .populate({
      path: "notifications",
      populate: {
        path: "team",
      },
    });

  return res
    .status(200)
    .json({ message: `팀 ${teamName}에서 탈퇴 되었습니다.`, updatedUser });
});

router.get("/filer-stream/:loginUserId", (req, res) => {
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

module.exports = router;
