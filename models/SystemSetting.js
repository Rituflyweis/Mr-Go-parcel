const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    category: {
      type: String,
      enum: ["general", "pricing", "notifications", "services", "security", "features"],
      default: "general",
    },
    description: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemSetting", systemSettingSchema);
