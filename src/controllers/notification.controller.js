const path = require("path");

const { User } = require(path.resolve(__dirname, "../models/User"));

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const notificationPatch = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const user = await User.findOneAndUpdate(
      { "notifications._id": notificationId },
      { $set: { "notifications.$.isRead": true } },
      { new: true },
    ).populate(populateUserDetails());

    if (!user) {
      return res
        .status(404)
        .json({ message: "User or notification not found" });
    }

    res
      .status(200)
      .json({ message: "Notification marked as read successfully", user });
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  notificationPatch,
};
