const path = require("path");

const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));

const { checkIsItem, handleItemAccess } = require(
  path.resolve(__dirname, "../utils/itemUtils"),
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

module.exports = {
  getFolder,
  createFolderInFolder,
};
