const path = require("path");
const { TrashBin } = require(path.resolve(__dirname, "../Models/TrashBin"));

const handleItemAccess = (item, currentUserRole, itemType, res) => {
  if (
    item.visibleTo !== "수습" &&
    currentUserRole !== "팀장" &&
    item.visibleTo !== currentUserRole
  ) {
    res
      .status(201)
      .json({ message: `당신은 해당 ${itemType}의 접근 권한이 없습니다` });
    return false;
  }
  return true;
};

const trashBinUpdate = async (teamId, itemId, itemType) => {
  const trashBin = await TrashBin.findOne({ ownerTeam: teamId })
    .populate({
      path: "folders",
      model: "Folder",
      populate: { path: "item", model: "Folder" },
    })
    .populate({
      path: "files",
      model: "File",
      populate: { path: "item", model: "File" },
    });

  if (itemType === "파일") {
    trashBin.files = trashBin.files.filter(
      (trashItem) => trashItem.item._id.toString() !== itemId,
    );
  } else if (itemType === "폴더") {
    trashBin.folders = trashBin.folders.filter(
      (trashItem) => trashItem.item._id.toString() !== itemId,
    );
  }

  await trashBin.save();

  return trashBin;
};

module.exports = {
  handleItemAccess,
  trashBinUpdate,
};
