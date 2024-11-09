const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { File } = require(path.resolve(__dirname, "../Models/File"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const { createFile } = require(path.resolve(__dirname, "../utils/createFile"));

const uploadFileInFolder = async (req, res, next) => {
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

    const user = await User.findById(userId).populate(populateUserDetails());
    const teamId = folder.ownerTeam.toString();

    const newFile = await createFile(
      decodedFileName,
      uploadedFile,
      teamId,
      user.nickname,
    );

    folder.files.push(newFile);

    for (const file of folder.files) {
      await File.populate(file, { path: "versions.file" });
    }

    await folder.save();

    res
      .status(201)
      .json({ message: "File uploaded successfully", user, folder });
  } catch (error) {
    res.status(404).json({ error: "Failed to upload File" });
  }
};

module.exports = {
  uploadFileInFolder,
};
