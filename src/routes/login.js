const express = require("express");
const router = express.Router();
const path = require("path");

const verifyToken = require(
  path.resolve(__dirname, "../middleware/verifyToken"),
);

const { loginUser } = require(
  path.resolve(__dirname, "../controllers/login.controller"),
);

router.post("/", verifyToken, loginUser);

module.exports = router;
