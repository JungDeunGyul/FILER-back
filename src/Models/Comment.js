const mongoose = require("mongoose");
const { Schema } = mongoose;

const commentSchema = new Schema({
  fileId: { type: Schema.Types.ObjectId, ref: "File", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

exports.Comment = mongoose.model("Comment", commentSchema);
