const express = require("express");
const router = express.Router();
const path = require("path");

const { File } = require(path.resolve(__dirname, "../Models/File"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));
const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { TrashBin } = require(path.resolve(__dirname, "../Models/TrashBin"));
const deleteFolderAndSubFolders = require(
  path.resolve(__dirname, "../utils/deleteFolderAndSubFolders"),
);

const {
  getTrashBin,
  moveTeamFileToTrashBin,
  moveTeamFolderToTrashBin,
} = require(path.resolve(__dirname, "../controllers/trash.controller"));

router.get("/:teamId", getTrashBin);
router.patch("/file/:fileId", moveTeamFileToTrashBin);
router.patch("/folder/:folderId", moveTeamFolderToTrashBin);

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
        .status(403)
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
