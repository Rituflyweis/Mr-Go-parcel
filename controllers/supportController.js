const Faq = require("../models/Faq");
const Feedback = require("../models/Feedback");
const SystemSetting = require("../models/SystemSetting");
const ChatMessage = require("../models/ChatMessage");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/support/faqs (public)
const getFaqs = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;

    const faqs = await Faq.find(filter).sort({ category: 1, order: 1 });
    successResponse(res, 200, "FAQs fetched", { faqs });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/support/contact (public)
const getContactInfo = async (req, res) => {
  try {
    const settings = await SystemSetting.find({ key: { $in: ["support_email", "support_phone", "support_chat_number"] } });
    const map = {};
    settings.forEach((s) => (map[s.key] = s.value));

    successResponse(res, 200, "Contact info fetched", {
      phone: map.support_phone || "+1-800-GOPARCEL",
      email: map.support_email || "support@goparcel.com",
      chat: map.support_chat_number || "+1-800-GOPARCEL",
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/support/feedback
const submitFeedback = async (req, res) => {
  try {
    const { message, category } = req.body;
    if (!message) return errorResponse(res, 422, "message is required");

    const feedback = await Feedback.create({
      user: req.user._id,
      message,
      category: category || "general",
    });

    successResponse(res, 201, "Feedback submitted successfully", { feedback });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── SUPPORT CHAT (Help & Support > Chat with us) ──────────────────────────────

// @route GET /api/support/chat/messages
// Fetch the customer's own thread with support and mark support's messages as read
// (the customer opening the screen is what "reads" them).
const getMyChatMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ user: req.user._id }).sort({ createdAt: 1 });
    await ChatMessage.updateMany({ user: req.user._id, sender: "support", isRead: false }, { isRead: true });

    successResponse(res, 200, "Chat messages", { messages });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/support/chat/send
const sendChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return errorResponse(res, 422, "message is required");

    const chatMessage = await ChatMessage.create({ user: req.user._id, sender: "customer", message });

    const io = req.app.get("io");
    if (io) {
      io.to(`support_${req.user._id}`).emit("chat_message", chatMessage);
      io.to("support_admin").emit("chat_message", chatMessage);
    }

    successResponse(res, 201, "Message sent", { chatMessage });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── ADMIN SIDE ─────────────────────────────────────────────────────────────────

// @route GET /api/admin/support/chats
// One row per customer who has messaged support — last message + unread count, for
// the admin's chat inbox list.
const getSupportChatThreads = async (req, res) => {
  try {
    const threads = await ChatMessage.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          lastMessage: { $first: "$message" },
          lastMessageAt: { $first: "$createdAt" },
          lastSender: { $first: "$sender" },
          unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ["$sender", "customer"] }, { $eq: ["$isRead", false] }] }, 1, 0] } },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      {
        $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "customer" },
      },
      { $unwind: "$customer" },
      {
        $project: {
          user: "$_id",
          "customer.name": 1,
          "customer.phone": 1,
          "customer.profileImage": 1,
          lastMessage: 1,
          lastMessageAt: 1,
          lastSender: 1,
          unreadCount: 1,
        },
      },
    ]);

    successResponse(res, 200, "Support chat threads", { threads });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/support/chats/:userId/messages
const getSupportChatThreadMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ user: req.params.userId }).sort({ createdAt: 1 });
    await ChatMessage.updateMany({ user: req.params.userId, sender: "customer", isRead: false }, { isRead: true });

    successResponse(res, 200, "Chat messages", { messages });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/support/chats/:userId/send
const sendSupportChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return errorResponse(res, 422, "message is required");

    const chatMessage = await ChatMessage.create({
      user: req.params.userId,
      sender: "support",
      senderUser: req.user._id,
      message,
    });

    const io = req.app.get("io");
    if (io) io.to(`support_${req.params.userId}`).emit("chat_message", chatMessage);

    successResponse(res, 201, "Message sent", { chatMessage });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getFaqs, getContactInfo, submitFeedback,
  getMyChatMessages, sendChatMessage,
  getSupportChatThreads, getSupportChatThreadMessages, sendSupportChatMessage,
};
