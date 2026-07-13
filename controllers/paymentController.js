const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Parcel = require("../models/Parcel");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");

const getRazorpay = () => {
  if (
    !process.env.RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID === "your_razorpay_key_id"
  ) {
    throw new Error("Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// @route POST /api/payment/create-order
const createPaymentOrder = async (req, res) => {
  try {
    const { parcelId } = req.body;
    const parcel = await Parcel.findById(parcelId);
    if (!parcel) return errorResponse(res, 404, "Parcel not found");
    if (parcel.paymentStatus === "paid") return errorResponse(res, 409, "Already paid");

    const options = {
      amount: Math.round(parcel.pricing.total * 100), // in paise
      currency: "INR",
      receipt: `gp_${parcel.trackingId}`,
    };

    const order = await getRazorpay().orders.create(options);

    const payment = await Payment.create({
      parcel: parcelId,
      customer: req.user._id,
      amount: parcel.pricing.total,
      method: "online",
      gateway: "razorpay",
      gatewayOrderId: order.id,
      status: "pending",
    });

    successResponse(res, 200, "Payment order created", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/payment/verify
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, parcelId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return errorResponse(res, 422, "Invalid payment signature");
    }

    await Payment.findOneAndUpdate(
      { gatewayOrderId: razorpay_order_id },
      {
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
        status: "success",
        paidAt: new Date(),
      }
    );

    await Parcel.findByIdAndUpdate(parcelId, {
      paymentStatus: "paid",
      paymentId: razorpay_payment_id,
    });

    successResponse(res, 200, "Payment verified successfully");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/payment/wallet/add
const addWalletBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return errorResponse(res, 422, "Invalid amount");

    // In real app: create razorpay order then verify
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { wallet: amount } },
      { new: true }
    );

    successResponse(res, 200, "Wallet updated", { wallet: user.wallet });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/payment/wallet/pay
const payFromWallet = async (req, res) => {
  try {
    const { parcelId } = req.body;
    const parcel = await Parcel.findById(parcelId);
    if (!parcel) return errorResponse(res, 404, "Parcel not found");

    const user = await User.findById(req.user._id);
    if (user.wallet < parcel.pricing.total) {
      return errorResponse(res, 402, "Insufficient wallet balance");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { wallet: -parcel.pricing.total } },
      { new: true }
    );

    await Parcel.findByIdAndUpdate(parcelId, {
      paymentStatus: "paid",
      paymentMethod: "wallet",
    });

    await Payment.create({
      parcel: parcelId,
      customer: req.user._id,
      amount: parcel.pricing.total,
      method: "wallet",
      gateway: "wallet",
      status: "success",
      paidAt: new Date(),
    });

    successResponse(res, 200, "Payment from wallet successful", { wallet: updatedUser.wallet });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/payment/history
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ customer: req.user._id })
      .populate("parcel", "trackingId status")
      .sort({ createdAt: -1 });
    successResponse(res, 200, "Payment history", { payments });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { createPaymentOrder, verifyPayment, addWalletBalance, payFromWallet, getPaymentHistory };
