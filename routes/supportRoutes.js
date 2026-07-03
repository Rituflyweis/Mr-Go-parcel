const express = require("express");
const router = express.Router();
const { getFaqs, getContactInfo, submitFeedback } = require("../controllers/supportController");
const { protect } = require("../middleware/auth");

router.get("/faqs", getFaqs);
router.get("/contact", getContactInfo);
router.post("/feedback", protect, submitFeedback);

module.exports = router;
