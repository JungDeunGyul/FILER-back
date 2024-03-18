const express = require("express");
const router = express.Router();
const { User } = require("../models/User");

router.patch("/:notificationId", async (req, res) => {
  try {
    const { notificationId } = req.params;

    const user = await User.findOneAndUpdate(
      { "notifications._id": notificationId },
      { $set: { "notifications.$.isRead": true } },
      { new: true },
    )
      .populate({
        path: "teams",
        populate: [
          {
            path: "members.user",
          },
          {
            path: "ownedFolders",
          },
          {
            path: "ownedFiles",
          },
          {
            path: "joinRequests.user",
          },
        ],
      })
      .populate({
        path: "notifications",
        populate: {
          path: "team",
        },
      });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User or notification not found" });
    }

    res
      .status(200)
      .json({ message: "Notification marked as read successfully", user });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
