const express = require("express");
const router = express.Router();
const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));

const { getFolder, createFolderInFolder } = require(
  path.resolve(__dirname, "../controllers/folder.controller"),
);

router.get("/:folderId", getFolder);
router.post("/:folderId/new", createFolderInFolder);

router.patch("/permission/:folderId", async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { currentUserRole, selectedRole, userId } = req.body;

    const folder = await Folder.findById(folderId);

    if (currentUserRole !== "팀장") {
      return res
        .status(403)
        .json({ message: "당신은 권한 설정에 대한 권한이 없습니다" });
    }

    if (!folder) {
      return res.status(412).json({ message: "폴더가 존재하지 않습니다" });
    }

    folder.visibleTo = selectedRole;

    await folder.save();

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

    res
      .status(201)
      .json({ message: "폴더 권한이 성공적으로 변경되었습니다", user });
  } catch (error) {
    res.status(404).json({ error: "폴더 권한 설정에 문제가 생겼습니다" });
  }
});

module.exports = router;
