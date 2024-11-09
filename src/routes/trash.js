const express = require("express");
const router = express.Router();
const path = require("path");

const {
  getTrashBin,
  moveTeamFileToTrashBin,
  moveTeamFolderToTrashBin,
  removeFile,
  removeFolder,
} = require(path.resolve(__dirname, "../controllers/trash.controller"));

router.get("/:teamId", getTrashBin);
router.patch("/file/:fileId", moveTeamFileToTrashBin);
router.patch("/folder/:folderId", moveTeamFolderToTrashBin);
router.delete("/file/:fileId/delete", removeFile);
router.delete("/folder/:folderId/delete", removeFolder);

module.exports = router;
