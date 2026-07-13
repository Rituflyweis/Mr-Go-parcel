const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    category: { type: String, default: "general" },
    status: { type: String, enum: ["open", "reviewed", "closed"], default: "open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
