const path = require("path");

const s3client = require(path.resolve(__dirname, "../../aws/s3Client"));
const { GetObjectCommand } = require("@aws-sdk/client-s3");

const { User } = require(path.resolve(__dirname, "../Models/User"));
const { Team } = require(path.resolve(__dirname, "../Models/Team"));
const { File } = require(path.resolve(__dirname, "../Models/File"));
const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));

const { handleItemAccess } = require(
  path.resolve(__dirname, "../utils/itemUtils"),
);

const { populateUserDetails } = require(
  path.resolve(__dirname, "../utils/populateHelpers"),
);

const downloadFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const currentUserRole = req.query.currentUserRole;
    const file = await File.findById(fileId);
    const ITEM_TYPE = "파일";

    handleItemAccess(file, currentUserRole, ITEM_TYPE, res);

    const getObjectParams = {
      Bucket: process.env.AWS_BUCKET,
      Key: file.s3Key,
    };

    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const { Body } = await s3client.send(getObjectCommand);
    res.attachment(file.s3Key);

    Body.pipe(res);
  } catch (error) {
    res.status(404).json({ error: "File not found" });
  }
};

const createFolderInTeam = async (req, res, next) => {
  try {
    const { userId, teamName } = req.params;
    const { folderName } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = await Team.findOne({ name: teamName }).populate({
      path: "ownedFolders",
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const isUserInTeam = team.members.some((member) =>
      member.user.equals(userId),
    );

    if (!isUserInTeam) {
      return res
        .status(403)
        .json({ message: "유저가 해당 팀에 속해 있지 않습니다." });
    }

    const userRoleInTeam = team.members.find((member) =>
      member.user.equals(userId),
    ).role;

    if (userRoleInTeam !== "팀장" && userRoleInTeam !== "팀원") {
      return res
        .status(403)
        .json({ message: "폴더를 생성할 권한이 없습니다." });
    }

    const isFolder = team.ownedFolders.some(
      (folder) => folder.name === folderName,
    );

    if (isFolder) {
      return res.status(412).json({ message: "폴더 이름이 이미 존재합니다" });
    }

    const newFolder = await Folder.create({
      name: folderName,
      ownerTeam: team._id,
    });

    team.ownedFolders.push(newFolder);

    await team.save();
    await user.save();

    const updatedUser = await User.findOne({ _id: userId }).populate(
      populateUserDetails(),
    );

    return res
      .status(201)
      .json({ message: "Folder created successfully", updatedUser });
  } catch (error) {
    return res.status(400).json({ message: "Faild, create Folder" });
  }
};

module.exports = { downloadFile, createFolderInTeam };
