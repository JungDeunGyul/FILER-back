const path = require("path");

const { getOrUpdateTrashBin } = require(
  path.resolve(__dirname, "../utils/itemUtils"),
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

module.exports = {
  getTrashBin,
};
