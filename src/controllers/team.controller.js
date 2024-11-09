const path = require("path");

const s3client = require(path.resolve(__dirname, "../../aws/s3Client"));
const { GetObjectCommand } = require("@aws-sdk/client-s3");

const { File } = require(path.resolve(__dirname, "../Models/File"));

const { handleItemAccess } = require(
  path.resolve(__dirname, "../utils/itemUtils"),
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

module.exports = { downloadFile };
