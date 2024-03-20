const express = require("express");
const router = express.Router();
const { File } = require("../models/File");
const { Folder } = require("../models/Folder");
const { User } = require("../models/User");
const { Team } = require("../models/Team");
const { TrashBin } = require("../models/TrashBin");

const deleteFolderAndSubFolders = require("../utils/deleteFolderAndSubFolders");

router.patch("/file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { currentUserRole, userId } = req.body;

    const file = await File.findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ message: "file not found" });
    }

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

    const fileOwnerTeam = await Team.findOne({ _id: teamId });

    const updatedTeamsFiles = fileOwnerTeam.ownedFiles.filter(
      (file) => file._id.toString() !== fileId,
    );

    fileOwnerTeam.ownedFiles = updatedTeamsFiles;

    await fileOwnerTeam.save();

    const updateFolder = await Folder.findOneAndUpdate(
      { files: fileId },
      { $pull: { files: fileId } },
      { new: true },
    );

    if (updateFolder) {
      await updateFolder.save();
    }

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

    let trashBin = await TrashBin.findOne({ ownerTeam: teamId });
    if (!trashBin) {
      trashBin = await TrashBin.create({ ownerTeam: teamId });
    }

    trashBin.files.push({ item: fileId, itemType: "File" });
    await trashBin.save();

    return res.status(200).json({ message: "File has been removed", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/folder/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;
    const { currentUserRole, userId } = req.body;
    const folder = await Folder.findOne({ _id: folderId });

    if (!folder) {
      return res.status(404).json({ message: "folder not found" });
    }

    if (
      folder.visibleTo !== "수습" &&
      currentUserRole !== "팀장" &&
      folder.visibleTo !== currentUserRole
    ) {
      res
        .status(201)
        .json({ message: "당신은 해당 파일의 접근 권한이 없습니다" });
    }

    const teamId = folder.ownerTeam._id.toString();

    const fileOwnerTeam = await Team.findOne({ _id: teamId });

    const updatedTeamsFiles = fileOwnerTeam.ownedFolders.filter(
      (folder) => folder._id.toString() !== folderId,
    );

    fileOwnerTeam.ownedFolders = updatedTeamsFiles;

    await fileOwnerTeam.save();

    if (folder.parentFolder) {
      const parentFolderId = folder.parentFolder.toString();

      const updateParentFolder = await Folder.findOneAndUpdate(
        {
          _id: parentFolderId,
        },
        { $pull: { subFolders: folderId } },
        { new: true },
      );

      await updateParentFolder.save();
    }

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

    let trashBin = await TrashBin.findOne({ ownerTeam: teamId });
    if (!trashBin) {
      trashBin = await TrashBin.create({ ownerTeam: teamId });
    }

    trashBin.folders.push({ item: folderId, itemType: "Folder" });
    await trashBin.save();

    return res.status(200).json({ message: "Folder has been removed", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;

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

    res.status(200).json({ message: "TrashBin", trashBin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/folder/:folderId/delete", async (req, res) => {
  try {
    const { folderId } = req.params;
    const { currentUserRole } = req.body;

    const folder = await Folder.findOne({ _id: folderId })
      .populate("files")
      .populate("subFolders");

    if (!folder) {
      return res.status(404).json({ message: "folder not found" });
    }

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

    if (!trashBin) {
      return res.status(404).json({ message: "휴지통을 찾을 수 없습니다." });
    }

    trashBin.folders = trashBin.folders.filter(
      (trashItem) => trashItem.item._id.toString() !== folderId,
    );

    for (const file of folder.files) {
      await file.deleteOne();
    }

    await deleteFolderAndSubFolders(folderId);

    await trashBin.save();

    return res
      .status(200)
      .json({ message: "Folder has been removed", trashBin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/file/:fileId/delete", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { currentUserRole } = req.body;

    const file = await File.findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ message: "folder not found" });
    }

    if (
      file.visibleTo !== "수습" &&
      currentUserRole !== "팀장" &&
      file.visibleTo !== currentUserRole
    ) {
      res
        .status(201)
        .json({ message: "당신은 해당 파일에 접근 권한이 없습니다" });
    }

    const teamId = file.ownerTeam._id.toString();

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
    await file.deleteOne();

    return res.status(200).json({ message: "File has been removed", trashBin });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
