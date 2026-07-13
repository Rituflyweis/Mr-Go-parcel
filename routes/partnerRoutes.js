const express = require("express");
const router = express.Router();
const {
  partnerSignup, getPartnerStatus, updatePartnerProfile, getPartnerDashboard,
  uploadPartnerDocument, getPartnerDocuments,
} = require("../controllers/partnerController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post("/signup", protect, partnerSignup);
router.get("/status", protect, getPartnerStatus);
router.put("/profile", protect, updatePartnerProfile);
router.get("/dashboard", protect, getPartnerDashboard);
router.post("/documents", protect, upload.single("document"), uploadPartnerDocument);
router.get("/documents", protect, getPartnerDocuments);

module.exports = router;
