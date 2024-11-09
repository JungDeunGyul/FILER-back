const express = require("express");
const router = express.Router();
const path = require("path");

const { getFolder, createFolderInFolder, setFolderPermission } = require(
  path.resolve(__dirname, "../controllers/folder.controller"),
);

router.get("/:folderId", getFolder);
router.post("/:folderId/new", createFolderInFolder);
router.patch("/permission/:folderId", setFolderPermission);

module.exports = router;
