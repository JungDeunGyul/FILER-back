const express = require("express");
const router = express.Router();
const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { File } = require(path.resolve(__dirname, "../Models/File"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { Comment } = require(path.resolve(__dirname, "../Models/Comment"));

const s3Uploader = require(path.resolve(__dirname, "../middleware/s3Uploader"));

const { uploadFileInFile, uploadFileInFolder } = require(
  path.resolve(__dirname, "../controllers/file.controller"),
);

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

router.patch("/:fileId/move-to-folder/:folderId", async (req, res) => {
  try {
    const { fileId, folderId } = req.params;
    const { userId, currentUserRole } = req.body;

    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({ message: "file not found" });
    }

    if (
      file.visibleTo !== "수습" &&
      currentUserRole !== "팀장" &&
      file.visibleTo !== currentUserRole
    ) {
      return res
        .status(400)
        .json({ message: "User does not have authority for the file" });
    }

    const folder = await Folder.findById(folderId).populate({
      path: "ownerTeam",
    });

    if (!folder) {
      return res.status(404).json({ message: "folder not found" });
    }

    const previousFolder = await Folder.findOne({ files: fileId });
    if (previousFolder) {
      previousFolder.files = previousFolder.files.filter(
        (file) => file.toString() !== fileId,
      );
      await previousFolder.save();
    }

    folder.files.push(file);

    await folder.save();

    const team = await Team.findOne({ name: folder.ownerTeam.name });

    team.ownedFiles = team.ownedFiles.filter(
      (file) => file.toString() !== fileId,
    );

    await team.save();
    await folder.save();

    const user = await User.findOne({ _id: userId })
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
      return res.status(404).json({ message: "User not found" });
    }

    return res
      .status(201)
      .json({ message: "File moved to folder successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/permission/:fileId", async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { currentUserRole, selectedRole, userId } = req.body;

    const file = await File.findById(fileId);

    if (currentUserRole !== "팀장") {
      return res
        .status(403)
        .json({ message: "당신은 권한 설정에 대한 권한이 없습니다" });
    }

    if (!file) {
      return res.status(412).json({ message: "파일이 존재하지 않습니다" });
    }

    file.visibleTo = selectedRole;

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
      .json({ message: "파일 권한이 성공적으로 변경되었습니다", user });
  } catch (error) {
    res.status(404).json({ error: "파일 권한 설정에 문제가 생겼습니다" });
  }
});

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
