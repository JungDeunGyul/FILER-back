const path = require("path");

const { File } = require(path.resolve(__dirname, "../models/File"));

const createFile = async (
  decodedFileName,
  uploadedFile,
  teamId,
  userNickname,
) => {
  const newFile = await File.create({
    name: decodedFileName,
    size: uploadedFile.size,
    type: uploadedFile.mimetype,
    ownerTeam: teamId,
    uploadUser: userNickname,
    filePath: uploadedFile.location,
    s3Key: uploadedFile.key,
  });

  newFile.versions.push({
    versionNumber: 1,
    file: newFile._id,
  });

  await newFile.save();

  return newFile;
};

module.exports = {
  createFile,
};
