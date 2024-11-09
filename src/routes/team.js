const express = require("express");
const router = express.Router();
const path = require("path");

const s3Uploader = require(path.resolve(__dirname, "../middleware/s3Uploader"));

const removeJoinRequest = require(
  path.resolve(__dirname, "../utils/removeJoinReqest"),
);
const deleteTeamResources = require(
  path.resolve(__dirname, "../utils/deleteTeamResources"),
);

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));
const { File } = require(path.resolve(__dirname, "../Models/File"));

const { downloadFile } = require(
  path.resolve(__dirname, "../controllers/team.controller"),
);

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

router.get("/:teamId/file/:fileId", downloadFile);

router.post("/:teamName/createfolder/:userId", async (req, res, next) => {
  try {
    const { userId, teamName } = req.params;
    const { folderName } = req.body;

    const user = await User.findById(userId);
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
            populate: {
              path: "versions",
              populate: {
                path: "file",
              },
            },
          },
          {
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
                populate: {
                  path: "comments",
                  populate: {
                    path: "user",
                  },
                },
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

      const decodedFileName = decodeURIComponent(uploadedFile.originalname);
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
        name: decodedFileName,
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
              path: "ownedFiles",
              populate: {
                path: "versions",
                populate: {
                  path: "file",
                  populate: {
                    path: "comments",
                    populate: {
                      path: "user",
                    },
                  },
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
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
                populate: {
                  path: "comments",
                  populate: {
                    path: "user",
                  },
                },
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
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
                populate: {
                  path: "comments",
                  populate: {
                    path: "user",
                  },
                },
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
                path: "ownedFiles",
                populate: {
                  path: "versions",
                  populate: {
                    path: "file",
                    populate: {
                      path: "comments",
                      populate: {
                        path: "user",
                      },
                    },
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
    await user.save();
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
      return res.status(400).json({
        message: "똑같은 팀 이름이 존재합니다, 다시 팀 이름을 입력해주세요.",
      });
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
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
                populate: {
                  path: "comments",
                  populate: {
                    path: "user",
                  },
                },
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

router.delete("/:teamId/withdraw/:userId", async (req, res, next) => {
  const { teamId, userId } = req.params;
  const userRole = req.body.currentUserRole;

  const user = await User.findOne({ _id: userId });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const team = await Team.findOne({ _id: teamId });
  const teamName = team.name;

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
          path: "ownedFiles",
          populate: {
            path: "versions",
            populate: {
              path: "file",
              populate: {
                path: "comments",
                populate: {
                  path: "user",
                },
              },
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

router.patch("/:selectedMemberId/manageteam/", async (req, res, next) => {
  try {
    const { selectedMemberId } = req.params;
    const { currentUserRole, selectedRole, teamId, userId } = req.body;

    if (currentUserRole !== "팀장") {
      return res
        .status(403)
        .json({ message: "당신은 팀 관리 권한이 없습니다" });
    }

    const team = await Team.findById(teamId).populate({
      path: "members",
    });

    const targetUserData = await User.findById(selectedMemberId)
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
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
                populate: {
                  path: "comments",
                  populate: {
                    path: "user",
                  },
                },
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

    if (selectedRole === "팀장") {
      const teamLeaderId = team.leader.toString();

      team.leader = selectedMemberId;

      const selectedMemberToTeamLeader = team.members.find(
        (member) => member.user.toString() === selectedMemberId,
      );
      selectedMemberToTeamLeader.role = selectedRole;

      const teamLeaderToTeamMember = team.members.find(
        (member) => member.user.toString() === teamLeaderId,
      );
      teamLeaderToTeamMember.role = "팀원";

      await team.save();

      const teamToUpdate = targetUserData.teams.find(
        (team) => team._id.toString() === teamId,
      );

      if (!teamToUpdate) {
        return res
          .status(403)
          .json({ message: "선택된 팀을 찾을 수 없습니다" });
      }

      const memberToUpdate = teamToUpdate.members.find(
        (member) => member.user._id.toString() === selectedMemberId,
      );

      const currentTeamLeaderToUpdate = teamToUpdate.members.find(
        (member) => member.user._id.toString() === teamLeaderId,
      );

      if (!memberToUpdate) {
        return res
          .status(403)
          .json({ message: "선택된 멤버를 팀에서 찾을 수 없습니다" });
      }

      memberToUpdate.role = selectedRole;
      currentTeamLeaderToUpdate.role = "팀원";

      await targetUserData.save();

      sendUserDataToClients(targetUserData, selectedMemberId);

      const currentUser = await User.findById(userId)
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
              path: "ownedFiles",
              populate: {
                path: "versions",
                populate: {
                  path: "file",
                  populate: {
                    path: "comments",
                    populate: {
                      path: "user",
                    },
                  },
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
      return res.status(201).json({
        message: "멤버의 권한이 성공적으로 변경되었습니다",
        currentUser,
      });
    }

    const member = team.members.find(
      (member) => member.user.toString() === selectedMemberId,
    );

    if (!member) {
      return res
        .status(403)
        .json({ message: "선택된 멤버를 팀에서 찾을 수 없습니다" });
    }

    member.role = selectedRole;

    const teamToUpdate = targetUserData.teams.find(
      (team) => team._id.toString() === teamId,
    );

    if (!teamToUpdate) {
      return res.status(403).json({ message: "선택된 팀을 찾을 수 없습니다" });
    }

    const memberToUpdate = teamToUpdate.members.find(
      (member) => member.user._id.toString() === selectedMemberId,
    );

    memberToUpdate.role = selectedRole;

    await team.save();
    await targetUserData.save();

    sendUserDataToClients(targetUserData, selectedMemberId);

    const currentUser = await User.findById(userId)
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
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
                populate: {
                  path: "comments",
                  populate: {
                    path: "user",
                  },
                },
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

    return res.status(201).json({
      message: "멤버의 권한이 성공적으로 변경되었습니다",
      currentUser,
    });
  } catch (error) {
    console.error(error);
  }
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
