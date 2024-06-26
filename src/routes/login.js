const express = require("express");
const router = express.Router();
const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User.js"));
const verifyToken = require(
  path.resolve(__dirname, "../middleware/verifyToken"),
);

router.post("/", verifyToken, async (req, res, next) => {
  try {
    const userData = req.body.user;

    let user = await User.findOne({ email: userData.email })
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
            populate: {
              path: "versions",
              populate: {
                path: "file",
              },
            },
          },
          {
            path: "ownedFiles",
            populate: {
              path: "versions",
              populate: {
                path: "file",
                populate: {
                  path: "comments",
                  populate: {
                    path: "user",
                  },
                },
              },
            },
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

    if (!user) {
      user = await User.create({
        email: userData.email,
        nickname: userData.nickname,
        iconpath: userData.photoURL,
      });

      return res.status(201).json({ message: "Create user success", user });
    }

    res.status(200).json({ user });
  } catch (error) {
    return res.status(400).json({ message: "Login failed" });
  }
});

module.exports = router;
