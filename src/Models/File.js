const mongoose = require("mongoose");
const { Schema } = mongoose;

const fileSchema = new Schema({
  name: { type: String, required: true },
  size: { type: String },
  type: {
    type: String,
  },
  ownerTeam: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  parentFolder: { type: Schema.Types.ObjectId, ref: "Folder" },
  uploadUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
  comments: { type: Schema.Types.ObjectId, ref: "Comments" },
  filePath: { type: String, required: true },
  s3Key: { type: String },
  versions: [
    {
      versionNumber: { type: String, required: true },
      uploadUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
      filePath: { type: String, required: true },
      created_at: { type: Date, default: Date.now },
    },
  ],
  visibleTo: { type: String, enum: ["팀장", "팀원", "수습"], default: "수습" },
  created_at: { type: Date, default: Date.now },
});

exports.File = mongoose.model("File", fileSchema);
