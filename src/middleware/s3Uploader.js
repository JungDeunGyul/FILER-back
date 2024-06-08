const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const mime = require("mime-types");

const s3client = require(path.resolve(__dirname, "../../aws/s3Client"));

const s3Uploader = multer({
  storage: multerS3({
    s3: s3client,
    bucket: process.env.AWS_BUCKET,
    contentType: (req, file, cb) => {
      const contentType =
        mime.lookup(file.originalname) || "application/octet-stream";
      cb(null, contentType);
    },
    key: function (req, file, cb) {
      const originalFilename = decodeURIComponent(file.originalname);

      cb(null, Date.now().toString() + originalFilename);
    },
  }),
});

module.exports = s3Uploader;
