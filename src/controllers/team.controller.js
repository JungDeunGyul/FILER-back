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

const deleteTeamResources = require(
  path.resolve(__dirname, "../utils/deleteTeamResources"),
);

const { createFile } = require(path.resolve(__dirname, "../utils/createFile"));

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

const uploadFileInTeam = async (req, res, next) => {
  try {
    const { userId, teamId } = req.params;
    const uploadedFile = req.file;

    const decodedFileName = decodeURIComponent(uploadedFile.originalname);
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userNickname = user.nickname;

    const team = await Team.findOne({ _id: teamId });

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
      return res.status(403).json({ message: "파일을 넣을 권한이 없습니다." });
    }

    const isFile = team.ownedFiles.some(
      (file) => file.name === uploadedFile.originalname,
    );

    if (isFile) {
      return res.status(412).json({ message: "파일 이름이 이미 존재합니다" });
    }

    const newFile = await createFile(
      decodedFileName,
      uploadedFile,
      teamId,
      userNickname,
    );

    team.ownedFiles.push(newFile);

    await team.save();
    await user.save();

    const updatedUser = await User.findOne({ _id: userId }).populate(
      populateUserDetails(),
    );

    return res
      .status(201)
      .json({ message: "파일이 업로드 되었습니다!", updatedUser });
  } catch (error) {
    console.error(error);
  }
};

const withdrawTeam = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;
    const userRole = req.body.currentUserRole;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = await Team.findOne({ _id: teamId });
    const teamName = team.name;

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const updatedTeams = user.teams.filter(
      (userTeam) => userTeam.toString() !== team._id.toString(),
    );

    user.teams = updatedTeams;
    await user.save();

    const updatedMembers = team.members.filter(
      (member) => member.user.toString() !== userId,
    );

    team.members = updatedMembers;
    await team.save();

    if (userRole === "팀장") {
      await deleteTeamResources(team);

      await Team.findOneAndDelete({ name: teamName });
    }

    const updatedUser = await User.findOne({ _id: userId }).populate(
      populateUserDetails(),
    );

    return res
      .status(200)
      .json({ message: `팀 ${teamName}에서 탈퇴 되었습니다.`, updatedUser });
  } catch (error) {
    console.error(error);
  }
};

const createTeam = async (req, res, next) => {
  try {
    const { userId, teamName } = req.params;

    if (teamName.length < 3 || teamName.length > 10) {
      return res
        .status(400)
        .json({ message: "Team name should be between 3 and 10 characters" });
    }

    const specialChars = '!@#$%^&*(),.?":{}|<>';
    for (let i = 0; i < teamName.length; i++) {
      if (specialChars.includes(teamName[i])) {
        return res
          .status(400)
          .json({ message: "Team name cannot contain special characters" });
      }
    }

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingTeam = await Team.findOne({ name: teamName });

    if (existingTeam) {
      return res.status(400).json({
        message: "똑같은 팀 이름이 존재합니다, 다시 팀 이름을 입력해주세요.",
      });
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
    await user.save();

    const updatedUser = await User.findOne({ _id: userId }).populate(
      populateUserDetails(),
    );

    return res
      .status(201)
      .json({ message: "Team created successfully", updatedUser });
  } catch (error) {
    return res.status(400).json({ message: "Failed to create Team" });
  }
};

module.exports = {
  downloadFile,
  createFolderInTeam,
  uploadFileInTeam,
  withdrawTeam,
  createTeam,
};
