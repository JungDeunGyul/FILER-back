const mongoose = require("mongoose");
const { Schema } = mongoose;

const folderSchema = new Schema({
  name: { type: String, required: true },
  ownerTeam: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  parentFolder: { type: Schema.Types.ObjectId, ref: "Folder" },
  files: [{ type: Schema.Types.ObjectId, ref: "File" }],
  subfolders: [{ type: Schema.Types.ObjectId, ref: "Folder" }],
  visible: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

exports.Folder = mongoose.model("Folder", folderSchema);
