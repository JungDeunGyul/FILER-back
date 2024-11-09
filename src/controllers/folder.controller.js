const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));

const { checkIsItem, handleItemAccess } = require(
  path.resolve(__dirname, "../utils/itemUtils"),
);

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const getFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const userRole = req.body.currentUserRole;

    const folder = await Folder.findOne({ _id: folderId })
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
    const ITEM_TYPE = "폴더";

    checkIsItem(folder, ITEM_TYPE);
    handleItemAccess(folder, userRole, ITEM_TYPE, res);

    return res
      .status(201)
      .json({ message: "Folder sent successfully", folder });
  } catch (error) {
    console.error(error);
  }
};

const createFolderInFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { folderName, teamName } = req.body;

    const folder = await Folder.findOne({ _id: folderId })
      .populate({
        path: "files",
      })
      .populate({ path: "parentFolder" })
      .populate({ path: "subFolders" });
    const ITEM_TYPE = "폴더";

    checkIsItem(folder, ITEM_TYPE);

    const team = await Team.findOne({ name: teamName }).populate({
      path: "ownedFolders",
    });

    const isFolder = team.ownedFolders.some(
      (folder) => folder.name === folderName,
    );

    if (isFolder) {
      return res.status(412).json({ message: "폴더 이름이 이미 존재합니다" });
    }

    const newFolder = await Folder.create({
      name: folderName,
      ownerTeam: team._id,
      parentFolder: folderId,
    });

    folder.subFolders.push(newFolder);

    await folder.save();
    await newFolder.save();

    res.status(201).json({ message: "Folder created successfully", folder });
  } catch (error) {
    console.error(error);
  }
};

const setFolderPermission = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { currentUserRole, selectedRole, userId } = req.body;

    const folder = await Folder.findById(folderId);
    const ITEM_TYPE = "폴더";

    if (currentUserRole !== "팀장") {
      return res
        .status(403)
        .json({ message: "당신은 권한 설정에 대한 권한이 없습니다" });
    }

    checkIsItem(folder, ITEM_TYPE);

    folder.visibleTo = selectedRole;

    await folder.save();

    const user = await User.findById(userId).populate(populateUserDetails());

    res
      .status(201)
      .json({ message: "폴더 권한이 성공적으로 변경되었습니다", user });
  } catch (error) {
    res.status(404).json({ error: "폴더 권한 설정에 문제가 생겼습니다" });
  }
};

module.exports = {
  getFolder,
  createFolderInFolder,
  setFolderPermission,
};
