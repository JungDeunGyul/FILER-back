const express = require("express");
const router = express.Router();
const path = require("path");

const s3Uploader = require(path.resolve(__dirname, "../middleware/s3Uploader"));

const {
  downloadFile,
  createFolderInTeam,
  uploadFileInTeam,
  withdrawTeam,
  createTeam,
  processJoinRequest,
  manageTeamMember,
} = require(path.resolve(__dirname, "../controllers/team.controller"));

router.get("/:teamId/file/:fileId", downloadFile);

router.post("/:teamName/createfolder/:userId", createFolderInTeam);
router.post("/:teamName/new/:userId", createTeam);
router.post(
  "/:teamId/uploadfile/:userId",
  s3Uploader.single("file"),
  uploadFileInTeam,
);

router.patch("/:teamName/joinrequest/:userId", processJoinRequest);
router.patch("/:selectedMemberId/manageteam/", manageTeamMember);

router.delete("/:teamId/withdraw/:userId", withdrawTeam);

module.exports = router;
