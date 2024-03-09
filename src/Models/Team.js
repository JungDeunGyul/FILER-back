const mongoose = require("mongoose");
const { Schema } = mongoose;

const teamSchema = new Schema({
  name: { type: String, required: true },
  members: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["팀장", "팀원", "수습"], default: "수습" },
    },
  ],
  ownedFolders: [{ type: Schema.Types.ObjectId, ref: "Folder" }],
  ownedFiles: [{ type: Schema.Types.ObjectId, ref: "File" }],
  roles: [
    {
      name: { type: String, required: true },
      level: { type: String, enum: ["팀장", "팀원", "수습"], required: true },
    },
  ],
  joinRequests: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
    },
  ],
  leader: { type: Schema.Types.ObjectId, ref: "User" },
  created_at: { type: Date, default: Date.now },
});

exports.Team = mongoose.model("Team", teamSchema);
