const express = require("express");

const router = express.Router();

const User = require("../models/User");
const Team = require("../models/Team");

router.post("/new", async (req, res, next) => {
  try {
    const userId = req.body.userId;
    const teamName = req.body.teamName;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingTeam = await Team.findOne({ name: teamName });
    if (existingTeam) {
      return res
        .status(400)
        .json({ message: "Failed to create team. Same team name issue" });
    }

    const newTeam = await Team.create({
      name: teamName,
      members: [
        {
          user: user._id,
          role: "팀장",
        },
      ],
      leader: user._id,
    });

    user.teams.push(newTeam._id);
    user.teamMemberships.push({
      team: newTeam._id,
      role: "팀장",
      status: "수락",
    });

    await user.save();

    return res
      .status(201)
      .json({ message: "Team created successfully", team: newTeam });
  } catch (error) {
    return res.status(400).json({ message: "Failed to create Team" });
  }
});

module.exports = router;
