const Payment = require("../models/Payment");
const Payout = require("../models/Payout");
const Refund = require("../models/Refund");
const User = require("../models/User");
const Driver = require("../models/Driver");
const { successResponse, errorResponse } = require("../utils/response");

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────

// @route GET /api/admin/finance/transactions
const getTransactions = async (req, res) => {
  try {
    const { search, status, type, method, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [totalRevArr, platformFeesArr, driverEarningsArr, pendingArr, transactions] = await Promise.all([
      Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: { $multiply: ["$amount", 0.2] } } } }]),
      Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: { $multiply: ["$amount", 0.8] } } } }]),
      Payment.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.find(filter)
        .populate("customer", "name phone")
        .populate("parcel", "trackingId")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const total = await Payment.countDocuments(filter);
    successResponse(res, 200, "Transactions", {
      stats: {
        totalRevenue: totalRevArr[0]?.total || 0,
        platformFees: platformFeesArr[0]?.total || 0,
        driverEarnings: driverEarningsArr[0]?.total || 0,
        pendingSettlement: pendingArr[0]?.total || 0,
      },
      transactions, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── PAYOUTS ───────────────────────────────────────────────────────────────────

// @route GET /api/admin/finance/payouts
const getPayouts = async (req, res) => {
  try {
    const { status, recipientType, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (recipientType) filter.recipientType = recipientType;

    const [pendingArr, processedArr, onHoldArr, scheduledArr, payouts] = await Promise.all([
      Payout.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Payout.aggregate([{ $match: { status: "processed" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Payout.aggregate([{ $match: { status: "on_hold" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Payout.aggregate([{ $match: { status: "scheduled" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Payout.find(filter)
        .populate("recipient", "name phone email profileImage")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const total = await Payout.countDocuments(filter);
    successResponse(res, 200, "Payouts", {
      stats: {
        pendingPayouts:   { amount: pendingArr[0]?.total || 0, count: pendingArr[0]?.count || 0 },
        processedThisWeek: { amount: processedArr[0]?.total || 0, count: processedArr[0]?.count || 0 },
        onHold:           { amount: onHoldArr[0]?.total || 0, count: onHoldArr[0]?.count || 0 },
        scheduled:        { amount: scheduledArr[0]?.total || 0, count: scheduledArr[0]?.count || 0 },
      },
      payouts, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/finance/payouts
const createPayout = async (req, res) => {
  try {
    const payout = await Payout.create(req.body);
    successResponse(res, 201, "Payout created", { payout });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/finance/payouts/:id
const updatePayout = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.status === "processed") updates.processedAt = new Date();
    const payout = await Payout.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!payout) return errorResponse(res, 404, "Payout not found");
    successResponse(res, 200, "Payout updated", { payout });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/finance/payouts/batch
const processBatchPayout = async (req, res) => {
  try {
    const { payoutIds } = req.body;
    if (!payoutIds || !payoutIds.length) return errorResponse(res, 422, "payoutIds array required");

    const result = await Payout.updateMany(
      { _id: { $in: payoutIds }, status: "pending" },
      { status: "processed", processedAt: new Date() }
    );
    successResponse(res, 200, `${result.modifiedCount} payouts processed`, { processed: result.modifiedCount });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── REFUNDS ───────────────────────────────────────────────────────────────────

// @route GET /api/admin/finance/refunds
const getRefunds = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [{ refundId: { $regex: search, $options: "i" } }, { order: { $regex: search, $options: "i" } }];

    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

    const [pendingReview, processing, approvedThisWeek, rejected, refunds] = await Promise.all([
      Refund.countDocuments({ status: "pending_review" }),
      Refund.countDocuments({ status: "processing" }),
      Refund.countDocuments({ status: "approved", updatedAt: { $gte: weekStart } }),
      Refund.countDocuments({ status: "rejected" }),
      Refund.find(filter)
        .populate("customer", "name phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const [pendingAmtArr, approvedAmtArr] = await Promise.all([
      Refund.aggregate([{ $match: { status: "pending_review" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Refund.aggregate([{ $match: { status: "approved", updatedAt: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const total = await Refund.countDocuments(filter);
    successResponse(res, 200, "Refunds", {
      stats: {
        pendingReview: { count: pendingReview, amount: pendingAmtArr[0]?.total || 0 },
        processing,
        approvedThisWeek: { count: approvedThisWeek, amount: approvedAmtArr[0]?.total || 0 },
        rejected,
      },
      refunds, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/finance/refunds
const createRefund = async (req, res) => {
  try {
    const refund = await Refund.create({ ...req.body, requestedBy: "admin" });
    successResponse(res, 201, "Refund request created", { refund });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/finance/refunds/:id
const updateRefund = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.status === "approved" || req.body.status === "rejected") {
      updates.processedAt = new Date();
      updates.processedBy = req.user._id;
    }
    const refund = await Refund.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!refund) return errorResponse(res, 404, "Refund not found");
    successResponse(res, 200, "Refund updated", { refund });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getTransactions, getPayouts, createPayout, updatePayout, processBatchPayout, getRefunds, createRefund, updateRefund };
