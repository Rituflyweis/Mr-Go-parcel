const mongoose = require("mongoose");

// Customer <-> support chat, in the Help & Support section. One thread per customer
// (identified by `user`) — support agents are not split into separate threads since
// any admin can pick up any customer's conversation.
const chatMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: String, enum: ["customer", "support"], required: true },
    senderUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // the admin who sent it, when sender = "support"
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ user: 1, createdAt: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
