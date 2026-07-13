const express = require("express");
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  addWalletBalance,
  payFromWallet,
  getPaymentHistory,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

router.post("/create-order", protect, createPaymentOrder);
router.post("/verify", protect, verifyPayment);
router.post("/wallet/add", protect, addWalletBalance);
router.post("/wallet/pay", protect, payFromWallet);
router.get("/history", protect, getPaymentHistory);

module.exports = router;
