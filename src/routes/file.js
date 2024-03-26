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

router.post(
  "/:folderId/uploadfile/:userId",
  s3Uploader.single("file"),
  async (req, res, next) => {
    try {
      const { folderId, userId } = req.params;
      const uploadedFile = req.file;
      const decodedFileName = decodeURIComponent(uploadedFile.originalname);

      const folder = await Folder.findById(folderId)
        .populate({
          path: "files",
          populate: {
            path: "versions",
            populate: {
              path: "file",
            },
          },
        })
        .populate({ path: "subFolders" });

      const isFile = folder.files.some(
        (file) => file.name === uploadedFile.originalname,
      );

      if (isFile) {
        return res.status(412).json({ message: "파일 이름이 이미 존재합니다" });
      }

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
      const teamId = folder.ownerTeam.toString();

      const newFile = await File.create({
        name: decodedFileName,
        size: uploadedFile.size,
        type: uploadedFile.mimetype,
        ownerTeam: teamId,
        uploadUser: user.nickname,
        filePath: uploadedFile.location,
        s3Key: uploadedFile.key,
      });

      const newFileId = newFile._id;
      newFile.versions.push({
        versionNumber: 1,
        file: newFileId,
      });

      folder.files.push(newFile);

      for (const file of folder.files) {
        await File.populate(file, { path: "versions.file" });
      }

      await newFile.save();
      await folder.save();

      res
        .status(201)
        .json({ message: "File uploaded successfully", user, folder });
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

router.patch(
  "/:fileId/updatefile/:userId",
  s3Uploader.single("file"),
  async (req, res, next) => {
    try {
      const { fileId, userId } = req.params;
      const uploadedFile = req.file;
      const decodedFileName = decodeURIComponent(uploadedFile.originalname);

      const file = await File.findById(fileId);

      const teamId = file.ownerTeam.toString();
      const currentUser = await User.findById(userId);

      const newFile = await File.create({
        name: decodedFileName,
        size: uploadedFile.size,
        type: uploadedFile.mimetype,
        ownerTeam: teamId,
        uploadUser: currentUser.nickname,
        filePath: uploadedFile.location,
        s3Key: uploadedFile.key,
      });

      const newFileId = newFile._id;

      file.versions.push({
        versionNumber:
          file.versions[file.versions.length - 1].versionNumber + 1,
        file: newFileId,
      });

      await file.save();
      await newFile.save();

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
        .json({ message: "파일이 성공적으로 업로드 되었습니다.", user });
    } catch (error) {
      res.status(404).json({ error: "파일 업로드에 문제가 생겼습니다" });
    }
  },
);

module.exports = router;
