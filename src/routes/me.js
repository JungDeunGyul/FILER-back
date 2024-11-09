const express = require("express");
const router = express.Router();
const path = require("path");

const { getUser } = require(
  path.resolve(__dirname, "../controllers/me.controller"),
);

router.get("/:userId", getUser);

module.exports = router;
