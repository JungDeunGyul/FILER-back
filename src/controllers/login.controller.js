const path = require("path");

const { User } = require(path.resolve(__dirname, "../Models/User"));

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const loginUser = async (req, res) => {
  try {
    const userData = req.body.user;

    let user = await User.findOne({ email: userData.email }).populate(
      populateUserDetails(),
    );

    if (!user) {
      user = await User.create({
        email: userData.email,
        nickname: userData.nickname,
        iconpath: userData.photoURL,
      });

      return res.status(201).json({ message: "Create user success", user });
    }

    res.status(200).json({ user });
  } catch (error) {
    return res.status(400).json({ message: "Login failed" });
  }
};

module.exports = { loginUser };
