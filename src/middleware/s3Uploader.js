const multer = require("multer");
const multerS3 = require("multer-s3");

const s3client = require("../../aws/s3Client");

const s3Uploader = multer({
  storage: multerS3({
    s3: s3client,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, Date.now().toString());
    },
  }),
});

module.exports = s3Uploader;
