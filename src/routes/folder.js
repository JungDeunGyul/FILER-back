const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const { Folder } = require("../models/Folder");
const { Team } = require("../models/Team");

router.get("/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;
    const userRole = req.body.currentUserRole;

    const folder = await Folder.findOne({ _id: folderId })
      .populate({
        path: "files",
        populate: {
          path: "versions",
          populate: {
            path: "file",
          },
        },
      })
      .populate({ path: "subFolders" });

    if (!folder) {
      return res.status(404).json({ message: "folder not found" });
    }

    if (
      folder.visibleTo === "수습" ||
      userRole === "팀장" ||
      folder.visibleTo === userRole
    ) {
      res.status(201).json({ message: "Folder sent successfully", folder });
    } else {
      res
        .status(400)
        .json({ message: "User does not have authority for the folder" });
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:folderId/new", async (req, res) => {
  try {
    const { folderId } = req.params;
    const { folderName, teamName } = req.body;

    const folder = await Folder.findOne({ _id: folderId })
      .populate({
        path: "files",
      })
      .populate({ path: "parentFolder" })
      .populate({ path: "subFolders" });

    const team = await Team.findOne({ name: teamName }).populate({
      path: "ownedFolders",
    });

    const isFolder = team.ownedFolders.some(
      (folder) => folder.name === folderName,
    );

    if (isFolder) {
      return res.status(412).json({ message: "폴더 이름이 이미 존재합니다" });
    }

    const newFolder = await Folder.create({
      name: folderName,
      ownerTeam: team._id,
      parentFolder: folderId,
    });

    folder.subFolders.push(newFolder);

    await folder.save();
    await newFolder.save();

    res.status(201).json({ message: "Folder created successfully", folder });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/permission/:folderId", async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { currentUserRole, selectedRole, userId } = req.body;

    const folder = await Folder.findById(folderId);

    if (currentUserRole !== "팀장") {
      return res
        .status(403)
        .json({ message: "당신은 권한 설정에 대한 권한이 없습니다" });
    }

    if (!folder) {
      return res.status(412).json({ message: "폴더가 존재하지 않습니다" });
    }

    folder.visibleTo = selectedRole;

    await folder.save();

    const user = await User.findById(userId)
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

    res
      .status(201)
      .json({ message: "폴더 권한이 성공적으로 변경되었습니다", user });
  } catch (error) {
    res.status(404).json({ error: "폴더 권한 설정에 문제가 생겼습니다" });
  }
});

module.exports = router;
