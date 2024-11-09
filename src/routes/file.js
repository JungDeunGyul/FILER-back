const express = require("express");
const router = express.Router();
const path = require("path");

const s3Uploader = require(path.resolve(__dirname, "../middleware/s3Uploader"));

const {
  uploadFileInFile,
  uploadFileInFolder,
  setFilePermission,
  moveFileToFolder,
  newCommentInFile,
} = require(path.resolve(__dirname, "../controllers/file.controller"));

router.post("/:fileId/newcomment/:userId", newCommentInFile);
router.post(
  "/:folderId/uploadfile/:userId",
  s3Uploader.single("file"),
  uploadFileInFolder,
);

router.patch("/permission/:fileId", setFilePermission);
router.patch("/:fileId/move-to-folder/:folderId", moveFileToFolder);
router.patch(
  "/:fileId/updatefile/:userId",
  s3Uploader.single("file"),
  uploadFileInFile,
);

module.exports = router;
