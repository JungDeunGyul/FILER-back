const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const { File } = require("../models/File");
const { Folder } = require("../models/Folder");
const { Team } = require("../models/Team");

const s3Uploader = require("../middleware/s3Uploader");

router.patch("/:fileId/move-to-folder/:folderId", async (req, res) => {
  try {
    const { fileId, folderId } = req.params;
    const { userId, currentUserRole } = req.body;

    const file = await File.findOne({ _id: fileId });

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

    const folder = await Folder.findOne({ _id: folderId }).populate({
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

router.post(
  "/:folderId/uploadfile/:userId",
  s3Uploader.single("file"),
  async (req, res, next) => {
    try {
      const { folderId, userId } = req.params;
      const uploadedFile = req.file;

      const folder = await Folder.findOne({ _id: folderId })
        .populate({
          path: "files",
        })
        .populate({ path: "subFolders" });

      const isFile = folder.files.some(
        (file) => file.name === uploadedFile.originalname,
      );

      if (isFile) {
        return res.status(412).json({ message: "파일 이름이 이미 존재합니다" });
      }

      const newFile = await File.create({
        name: uploadedFile.originalname,
        size: uploadedFile.size,
        type: uploadedFile.mimetype,
        ownerTeam: folder.ownerTeam.toString(),
        uploadUser: userId,
        filePath: uploadedFile.location,
        s3Key: uploadedFile.key,
      });

      folder.files.push(newFile);

      await folder.save();

      res.status(201).json({ message: "File uploaded successfully", folder });
    } catch (error) {
      res.status(404).json({ error: "Failed to upload File" });
    }
  },
);

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

module.exports = router;
