const express = require("express");
const router = express.Router();
const path = require("path");

const s3Uploader = require(path.resolve(__dirname, "../middleware/s3Uploader"));

const removeJoinRequest = require(
  path.resolve(__dirname, "../utils/removeJoinReqest"),
);

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));

const {
  downloadFile,
  createFolderInTeam,
  uploadFileInTeam,
  withdrawTeam,
  createTeam,
} = require(path.resolve(__dirname, "../controllers/team.controller"));

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

router.post("/:teamName/createfolder/:userId", createFolderInTeam);

router.post(
  "/:teamId/uploadfile/:userId",
  s3Uploader.single("file"),
  uploadFileInTeam,
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

router.post("/:teamName/new/:userId", createTeam);

router.delete("/:teamId/withdraw/:userId", withdrawTeam);

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
