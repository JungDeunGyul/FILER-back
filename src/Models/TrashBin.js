const mongoose = require("mongoose");
const { Schema } = mongoose;

const trashBinSchema = new Schema({
  itemType: { type: String, enum: ["File", "Folder"], required: true },
  item: { type: Schema.Types.ObjectId, refPath: "itemType", required: true },
  deleted_at: {
    type: Date,
    default: () => Date.now() + 30 * 24 * 60 * 60 * 1000,
  },
});

exports.TrashBin = mongoose.model("TrashBin", trashBinSchema);
