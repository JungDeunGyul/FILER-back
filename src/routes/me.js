const express = require("express");
const router = express.Router();
const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User.js"));

router.get("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
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
      return res.status(404).json({ message: "해당 유저를 찾을 수 없습니다." });
    }

    res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "유저 정보 전달 실패" });
  }
});

module.exports = router;
