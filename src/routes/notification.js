const express = require("express");
const router = express.Router();
const path = require("path");

const { notificationPatch } = require(
  path.resolve(__dirname, "../controllers/notification.controller"),
);

router.patch("/:notificationId", notificationPatch);

module.exports = router;
