const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  nickname: { type: String, required: true },
  iconpath: { type: String },
  teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
  accessibleFolders: [{ type: Schema.Types.ObjectId, ref: "Folder" }],
  accessibleFiles: [{ type: Schema.Types.ObjectId, ref: "File" }],
  teamMemberships: [
    {
      team: { type: Schema.Types.ObjectId, ref: "Team" },
      role: { type: String, enum: ["팀장", "팀원", "수습"], default: "수습" },
      status: {
        type: String,
        enum: ["대기중", "수락", "거절"],
        default: "대기중",
      },
    },
  ],
  delegatedLeaders: [
    {
      team: { type: Schema.Types.ObjectId, ref: "Team" },
      leader: { type: Schema.Types.ObjectId, ref: "User" },
    },
  ],
  comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  created_at: { type: Date, default: Date.now },
});

exports.User = mongoose.model("User", userSchema);
