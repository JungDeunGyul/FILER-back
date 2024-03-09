const mongoose = require("mongoose");
const { Schema } = mongoose;

const fileSchema = new Schema({
  name: { type: String, required: true },
  size: { type: String },
  type: {
    type: String,
  },
  ownerTeam: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  parentFolder: { type: Schema.Types.ObjectId, ref: "Folder", required: true },
  md5Hash: { type: String, required: true },
  versions: [
    {
      versionNumber: { type: String, required: true },
      md5Hash: { type: String, required: true },
      created_at: { type: Date, default: Date.now },
    },
  ],
  visible: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

exports.File = mongoose.model("File", fileSchema);
