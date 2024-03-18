const mongoose = require("mongoose");
const { Schema } = mongoose;

const folderSchema = new Schema({
  name: { type: String, required: true },
  ownerTeam: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  parentFolder: { type: Schema.Types.ObjectId, ref: "Folder" },
  files: [{ type: Schema.Types.ObjectId, ref: "File" }],
  subFolders: [{ type: Schema.Types.ObjectId, ref: "Folder" }],
  visibleTo: { type: String, enum: ["팀장", "팀원", "수습"], default: "수습" },
  created_at: { type: Date, default: Date.now },
});

exports.Folder = mongoose.model("Folder", folderSchema);
