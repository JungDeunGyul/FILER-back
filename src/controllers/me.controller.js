const path = require("path");

const { User } = require(path.resolve(__dirname, "../models/User"));

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const getUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate(populateUserDetails());

    if (!user) {
      return res.status(404).json({ message: "해당 유저를 찾을 수 없습니다." });
    }

    res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "유저 정보 전달 실패" });
  }
};

module.exports = {
  getUser,
};
