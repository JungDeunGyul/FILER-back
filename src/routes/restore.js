const express = require("express");
const router = express.Router();
const { File } = require("../models/File");
const { Folder } = require("../models/Folder");
const { User } = require("../models/User");
const { Team } = require("../models/Team");
const { TrashBin } = require("../models/TrashBin");

router.patch("/file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { currentUserRole, userId } = req.body;

    const file = await File.findById(fileId);

    if (
      file.visibleTo !== "수습" &&
      currentUserRole !== "팀장" &&
      file.visibleTo !== currentUserRole
    ) {
      res
        .status(201)
        .json({ message: "당신은 해당 파일의 접근 권한이 없습니다" });
    }

    const teamId = file.ownerTeam._id.toString();
    const team = await Team.findById(teamId);

    team.ownedFiles.push(file);
    await team.save();

    const trashBin = await TrashBin.findOne({ ownerTeam: teamId })
      .populate({
        path: "folders",
        model: "Folder",
        populate: { path: "item", model: "Folder" },
      })
      .populate({
        path: "files",
        model: "File",
        populate: { path: "item", model: "File" },
      });

    trashBin.files = trashBin.files.filter(
      (trashItem) => trashItem.item._id.toString() !== fileId,
    );

    await trashBin.save();

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

    res.status(200).json({ message: "TrashBin", trashBin, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/folder/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;
    const { currentUserRole, userId } = req.body;

    const folder = await Folder.findById(folderId);

    if (
      folder.visibleTo !== "수습" &&
      currentUserRole !== "팀장" &&
      folder.visibleTo !== currentUserRole
    ) {
      res
        .status(201)
        .json({ message: "당신은 해당 폴더의 접근 권한이 없습니다" });
    }

    const teamId = folder.ownerTeam._id.toString();
    const team = await Team.findById(teamId);

    team.ownedFolders.push(folder);
    await team.save();

    const trashBin = await TrashBin.findOne({ ownerTeam: teamId })
      .populate({
        path: "folders",
        model: "Folder",
        populate: { path: "item", model: "Folder" },
      })
      .populate({
        path: "files",
        model: "File",
        populate: { path: "item", model: "File" },
      });

    trashBin.folders = trashBin.folders.filter(
      (trashItem) => trashItem.item._id.toString() !== folderId,
    );

    await trashBin.save();

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

    res.status(200).json({ message: "TrashBin", trashBin, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
