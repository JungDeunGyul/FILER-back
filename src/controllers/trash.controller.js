const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { File } = require(path.resolve(__dirname, "../Models/File"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));
const { TrashBin } = require(path.resolve(__dirname, "../Models/TrashBin"));

const { getOrUpdateTrashBin, checkIsItem, handleItemAccess } = require(
  path.resolve(__dirname, "../utils/itemUtils"),
);

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const getTrashBin = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const trashBin = await getOrUpdateTrashBin(teamId);

    res.status(200).json({ message: "TrashBin", trashBin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const moveTeamFileToTrashBin = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { currentUserRole, userId } = req.body;

    const file = await File.findOne({ _id: fileId });
    const ITEM_TYPE = "파일";

    checkIsItem(file, ITEM_TYPE);
    handleItemAccess(file, currentUserRole, ITEM_TYPE, res);

    const teamId = file.ownerTeam._id.toString();
    const fileOwnerTeam = await Team.findOne({ _id: teamId });

    const updatedTeamsFiles = fileOwnerTeam.ownedFiles.filter(
      (file) => file._id.toString() !== fileId,
    );
    fileOwnerTeam.ownedFiles = updatedTeamsFiles;

    const updateFolder = await Folder.findOneAndUpdate(
      { files: fileId },
      { $pull: { files: fileId } },
      { new: true },
    );

    if (updateFolder) {
      await updateFolder.save();
    }
    await fileOwnerTeam.save();

    const user = await User.findOne({ _id: userId }).populate(
      populateUserDetails(),
    );

    let trashBin = await TrashBin.findOne({ ownerTeam: teamId });
    if (!trashBin) {
      trashBin = await TrashBin.create({ ownerTeam: teamId });
    }

    trashBin.files.push({ item: fileId, itemType: "File" });
    await trashBin.save();

    return res.status(200).json({ message: "File has been removed", user });
  } catch (error) {
    console.error(error);
  }
};

const moveTeamFolderToTrashBin = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { currentUserRole, userId } = req.body;

    const folder = await Folder.findOne({ _id: folderId });
    const ITEM_TYPE = "폴더";

    checkIsItem(folder, ITEM_TYPE);
    handleItemAccess(folder, currentUserRole, ITEM_TYPE, res);

    const teamId = folder.ownerTeam._id.toString();
    const fileOwnerTeam = await Team.findOne({ _id: teamId });

    const updatedTeamsFiles = fileOwnerTeam.ownedFolders.filter(
      (folder) => folder._id.toString() !== folderId,
    );
    fileOwnerTeam.ownedFolders = updatedTeamsFiles;
    await fileOwnerTeam.save();

    if (folder.parentFolder) {
      const parentFolderId = folder.parentFolder.toString();

      const updateParentFolder = await Folder.findOneAndUpdate(
        {
          _id: parentFolderId,
        },
        { $pull: { subFolders: folderId } },
        { new: true },
      );

      await updateParentFolder.save();
    }

    const user = await User.findOne({ _id: userId }).populate(
      populateUserDetails(),
    );

    let trashBin = await TrashBin.findOne({ ownerTeam: teamId });
    if (!trashBin) {
      trashBin = await TrashBin.create({ ownerTeam: teamId });
    }

    trashBin.folders.push({ item: folderId, itemType: "Folder" });
    await trashBin.save();

    return res.status(200).json({ message: "Folder has been removed", user });
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getTrashBin,
  moveTeamFileToTrashBin,
  moveTeamFolderToTrashBin,
};
