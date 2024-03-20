const mongoose = require("mongoose");
const { Schema } = mongoose;

const trashItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, required: true, refPath: "itemType" },
  itemType: { type: String, required: true, enum: ["Folder", "File"] },
  deleted_at: {
    type: Date,
    default: () => Date.now() + 30 * 24 * 60 * 60 * 1000,
  },
});

const trashBinSchema = new Schema({
  ownerTeam: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  folders: [trashItemSchema],
  files: [trashItemSchema],
});

exports.TrashBin = mongoose.model("TrashBin", trashBinSchema);
