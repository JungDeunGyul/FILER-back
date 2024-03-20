const express = require("express");
const router = express.Router();
const { Folder } = require("../models/Folder");
const { Team } = require("../models/Team");

router.get("/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;
    const userRole = req.body.currentUserRole;

    const folder = await Folder.findOne({ _id: folderId })
      .populate({
        path: "files",
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

module.exports = router;
