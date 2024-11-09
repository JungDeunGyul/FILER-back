const mongoose = require("mongoose");
const { Schema } = mongoose;
const Comment = require("./Comment");

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  nickname: { type: String, required: true },
  iconpath: { type: String },
  teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
  notifications: [
    {
      type: {
        type: String,
        enum: ["가입요청", "가입수락", "가입거절"],
        required: true,
      },
      requestUser: { type: Schema.Types.ObjectId, ref: "User" },
      content: { type: String, required: true },
      isRead: { type: Boolean, default: false, required: true },
      team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
      created_at: { type: Date, default: Date.now },
    },
  ],
  comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  created_at: { type: Date, default: Date.now },
});

exports.User = mongoose.model("User", userSchema);
