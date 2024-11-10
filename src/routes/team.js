const express = require("express");
const router = express.Router();
const path = require("path");

const s3Uploader = require(path.resolve(__dirname, "../middleware/s3Uploader"));

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));

const {
  downloadFile,
  createFolderInTeam,
  uploadFileInTeam,
  withdrawTeam,
  createTeam,
  processJoinRequest,
} = require(path.resolve(__dirname, "../controllers/team.controller"));

const { sendUserDataToClients } = require("../routes/teamJoinRequestSSE");

router.get("/:teamId/file/:fileId", downloadFile);

router.post("/:teamName/createfolder/:userId", createFolderInTeam);

router.post(
  "/:teamId/uploadfile/:userId",
  s3Uploader.single("file"),
  uploadFileInTeam,
);

router.patch("/:teamName/joinrequest/:userId", processJoinRequest);

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

module.exports = router;
