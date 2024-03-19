const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const { File } = require("../models/File");
const { Folder } = require("../models/Folder");
const { Team } = require("../models/Team");

router.patch("/:fileId/move-to-folder/:folderId", async (req, res) => {
  try {
    const { fileId, folderId } = req.params;
    const { userId, currentUserRole } = req.body;

    const file = await File.findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ message: "file not found" });
    }

    if (
      file.visibleTo !== "수습" &&
      currentUserRole !== "팀장" &&
      file.visibleTo !== currentUserRole
    ) {
      return res
        .status(400)
        .json({ message: "User does not have authority for the file" });
    }

    const folder = await Folder.findOne({ _id: folderId }).populate({
      path: "ownerTeam",
    });

    if (!folder) {
      return res.status(404).json({ message: "folder not found" });
    }

    const previousFolder = await Folder.findOne({ files: fileId });
    if (previousFolder) {
      previousFolder.files = previousFolder.files.filter(
        (file) => file.toString() !== fileId,
      );
      await previousFolder.save();
    }

    folder.files.push(file);

    await folder.save();

    const team = await Team.findOne({ name: folder.ownerTeam.name });

    team.ownedFiles = team.ownedFiles.filter(
      (file) => file.toString() !== fileId,
    );

    await team.save();
    await folder.save();

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

    return res
      .status(201)
      .json({ message: "File moved to folder successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
