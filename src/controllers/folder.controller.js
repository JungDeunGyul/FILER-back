const path = require("path");

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

module.exports = {
  getFolder,
};
