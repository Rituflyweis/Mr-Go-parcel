const express = require("express");
const router = express.Router();
const { getFaqs, getContactInfo, submitFeedback, getMyChatMessages, sendChatMessage } = require("../controllers/supportController");
const { protect } = require("../middleware/auth");

router.get("/faqs", getFaqs);
router.get("/contact", getContactInfo);
router.post("/feedback", protect, submitFeedback);
router.get("/chat/messages", protect, getMyChatMessages);
router.post("/chat/send", protect, sendChatMessage);

module.exports = router;
