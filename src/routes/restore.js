const express = require("express");
const router = express.Router();
const path = require("path");

const { restoreFile, restoreFolder } = require(
  path.resolve(__dirname, "../controllers/restore.controller"),
);

router.patch("/file/:fileId", restoreFile);
router.patch("/folder/:folderId", restoreFolder);

module.exports = router;
