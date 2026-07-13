const express = require("express");
const router = express.Router();
const {
  register, verifyOTP, login, sendOTP,
  resetPassword, getMe, updateProfile, changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/send-otp", sendOTP);
router.post("/resend-otp", sendOTP);
router.post("/reset-password", resetPassword);

router.get("/me", protect, getMe);
router.put("/update-profile", protect, upload.single("profileImage"), updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;
