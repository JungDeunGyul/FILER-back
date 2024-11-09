const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { File } = require(path.resolve(__dirname, "../Models/File"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const { checkIsItem, handleItemAccess } = require(
  path.resolve(__dirname, "../utils/itemUtils"),
);

const { createFile } = require(path.resolve(__dirname, "../utils/createFile"));

const uploadFileInFile = async (req, res, next) => {
  try {
    const { fileId, userId } = req.params;
    const uploadedFile = req.file;
    const decodedFileName = decodeURIComponent(uploadedFile.originalname);

    const file = await File.findById(fileId);

    const teamId = file.ownerTeam.toString();
    const currentUser = await User.findById(userId);

    const newFile = await createFile(
      decodedFileName,
      uploadedFile,
      teamId,
      currentUser.nickname,
    );

    const newFileId = newFile._id;

    file.versions.push({
      versionNumber: file.versions[file.versions.length - 1].versionNumber + 1,
      file: newFileId,
    });

    await file.save();

    const user = await User.findById(userId).populate(populateUserDetails());

    res
      .status(201)
      .json({ message: "파일이 성공적으로 업로드 되었습니다.", user });
  } catch (error) {
    res.status(404).json({ error: "파일 업로드에 문제가 생겼습니다" });
  }
};

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

const setFilePermission = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { currentUserRole, selectedRole, userId } = req.body;

    const file = await File.findById(fileId);
    const ITEM_TYPE = "파일";

    checkIsItem(file, ITEM_TYPE);

    if (currentUserRole !== "팀장") {
      return res
        .status(403)
        .json({ message: "당신은 권한 설정에 대한 권한이 없습니다" });
    }

    file.visibleTo = selectedRole;

    await file.save();

    const user = await User.findById(userId).populate(populateUserDetails());

    res
      .status(201)
      .json({ message: "파일 권한이 성공적으로 변경되었습니다", user });
  } catch (error) {
    res.status(404).json({ error: "파일 권한 설정에 문제가 생겼습니다" });
  }
};

const moveFileToFolder = async (req, res, next) => {
  try {
    const { fileId, folderId } = req.params;
    const { userId, currentUserRole } = req.body;

    const file = await File.findById(fileId);
    const ITEM_TYPE1 = "파일";

    checkIsItem(file, ITEM_TYPE1);
    handleItemAccess(file, currentUserRole, ITEM_TYPE1, res);

    const folder = await Folder.findById(folderId).populate({
      path: "ownerTeam",
    });
    const ITEM_TYPE2 = "폴더";

    checkIsItem(folder, ITEM_TYPE2);
    handleItemAccess(folder, currentUserRole, ITEM_TYPE2, res);

    const previousFolder = await Folder.findOne({ files: fileId });
    if (previousFolder) {
      previousFolder.files = previousFolder.files.filter(
        (file) => file.toString() !== fileId,
      );

      await previousFolder.save();
    }
    folder.files.push(file);

    const team = await Team.findOne({ name: folder.ownerTeam.name });
    team.ownedFiles = team.ownedFiles.filter(
      (file) => file.toString() !== fileId,
    );

    await team.save();
    await folder.save();

    const user = await User.findOne({ _id: userId }).populate(
      populateUserDetails(),
    );

    return res
      .status(201)
      .json({ message: "File moved to folder successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  uploadFileInFolder,
  uploadFileInFile,
  setFilePermission,
  moveFileToFolder,
};
