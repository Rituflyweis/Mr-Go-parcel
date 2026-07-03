const Faq = require("../models/Faq");
const Feedback = require("../models/Feedback");
const SystemSetting = require("../models/SystemSetting");
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

module.exports = { getFaqs, getContactInfo, submitFeedback };
