const express = require("express");
const router = express.Router();
const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { File } = require(path.resolve(__dirname, "../Models/File"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { Comment } = require(path.resolve(__dirname, "../Models/Comment"));

const s3Uploader = require(path.resolve(__dirname, "../middleware/s3Uploader"));

const {
  uploadFileInFile,
  uploadFileInFolder,
  setFilePermission,
  moveFileToFolder,
} = require(path.resolve(__dirname, "../controllers/file.controller"));

router.patch(
  "/:fileId/updatefile/:userId",
  s3Uploader.single("file"),
  uploadFileInFile,
);

router.post(
  "/:folderId/uploadfile/:userId",
  s3Uploader.single("file"),
  uploadFileInFolder,
);

router.patch("/permission/:fileId", setFilePermission);
router.patch("/:fileId/move-to-folder/:folderId", moveFileToFolder);

router.post("/:fileId/newcomment/:userId", async (req, res, next) => {
  try {
    const { fileId, userId } = req.params;
    const comment = req.body.comment;

    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({ message: "해당 파일은 존재하지 않습니다" });
    }

    const newComment = await Comment.create({
      fileId,
      user: userId,
      content: comment,
    });

    file.comments.push(newComment._id);

    await newComment.save();
    await file.save();

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

    user.comments.push(newComment._id);
    await user.save();

    res.status(201).json({ message: "댓글이 성공적으로 달렸습니다", user });
  } catch (error) {
    res.status(404).json({ error: "파일 업로드에 문제가 생겼습니다" });
  }
});

module.exports = router;
