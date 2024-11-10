const path = require("path");

const { User } = require(path.resolve(__dirname, "../models/User"));
const { Team } = require(path.resolve(__dirname, "../models/Team"));
const { File } = require(path.resolve(__dirname, "../models/File"));
const { Folder } = require(path.resolve(__dirname, "../models/Folder"));

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const { handleItemAccess, getOrUpdateTrashBin } = require(
  path.resolve(__dirname, "../utils/itemUtils"),
);

const restoreFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { currentUserRole, userId } = req.body;

    const file = await File.findById(fileId);

    handleItemAccess(file, currentUserRole, "파일", res);

    const teamId = file.ownerTeam._id.toString();
    const team = await Team.findById(teamId);

    team.ownedFiles.push(file);
    await team.save();

    const trashBin = await getOrUpdateTrashBin(teamId, fileId, "파일");

    const user = await User.findById(userId).populate(populateUserDetails());

    res.status(200).json({ message: "TrashBin", trashBin, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const restoreFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { currentUserRole, userId } = req.body;

    const folder = await Folder.findById(folderId);

    handleItemAccess(folder, currentUserRole, "폴더", res);

    const teamId = folder.ownerTeam._id.toString();
    const team = await Team.findById(teamId);

    team.ownedFolders.push(folder);
    await team.save();

    const trashBin = await getOrUpdateTrashBin(teamId, folderId, "폴더");

    const user = await User.findById(userId).populate(populateUserDetails());

    res.status(200).json({ message: "TrashBin", trashBin, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  restoreFile,
  restoreFolder,
};
