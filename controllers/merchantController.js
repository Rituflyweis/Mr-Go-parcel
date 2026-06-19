const Merchant = require("../models/Merchant");
const ApiKey = require("../models/ApiKey");
const Fleet = require("../models/Fleet");
const Driver = require("../models/Driver");
const Parcel = require("../models/Parcel");
const Payment = require("../models/Payment");
const { successResponse, errorResponse } = require("../utils/response");

// ─── MERCHANT ────────────────────────────────────────────────────────────────

// @route POST /api/merchant/register
const registerMerchant = async (req, res) => {
  try {
    const existing = await Merchant.findOne({ user: req.user._id });
    if (existing) return errorResponse(res, 409, "Merchant profile already exists");

    const { businessName, businessType, gstin, businessAddress, contactPerson, contactPhone, website } = req.body;
    if (!businessName || !businessType) return errorResponse(res, 422, "businessName and businessType are required");

    const merchant = await Merchant.create({
      user: req.user._id,
      businessName,
      businessType,
      gstin,
      businessAddress,
      contactPerson,
      contactPhone,
      website,
      logoUrl: req.file ? req.file.path : "",
    });

    successResponse(res, 201, "Merchant registered. Awaiting admin approval.", { merchant });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/merchant/profile
const getMerchantProfile = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id }).populate("user", "name email phone");
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");
    successResponse(res, 200, "Merchant profile fetched", { merchant });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/merchant/profile
const updateMerchantProfile = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.logoUrl = req.file.path;
    delete updates.isApproved;
    delete updates.commissionRate;

    const merchant = await Merchant.findOneAndUpdate({ user: req.user._id }, updates, { new: true });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");
    successResponse(res, 200, "Merchant profile updated", { merchant });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/merchant/dashboard
const getMerchantDashboard = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");
    if (!merchant.isApproved) return errorResponse(res, 403, "Merchant account not approved yet");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalParcels, monthParcels, pendingParcels, deliveredParcels, fleetCount] = await Promise.all([
      Parcel.countDocuments({ "merchantRef": merchant._id }),
      Parcel.countDocuments({ "merchantRef": merchant._id, createdAt: { $gte: startOfMonth } }),
      Parcel.countDocuments({ "merchantRef": merchant._id, status: "pending" }),
      Parcel.countDocuments({ "merchantRef": merchant._id, status: "delivered" }),
      Fleet.countDocuments({ merchant: merchant._id, status: "active" }),
    ]);

    successResponse(res, 200, "Merchant dashboard", {
      merchant: {
        businessName: merchant.businessName,
        isApproved: merchant.isApproved,
        walletBalance: merchant.walletBalance,
        totalOrders: merchant.totalOrders,
        totalSpend: merchant.totalSpend,
        commissionRate: merchant.commissionRate,
      },
      stats: {
        totalParcels,
        monthParcels,
        pendingParcels,
        deliveredParcels,
        activeFleetDrivers: fleetCount,
      },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ─── API KEYS ─────────────────────────────────────────────────────────────────

// @route POST /api/merchant/api-keys
const createApiKey = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");
    if (!merchant.isApproved) return errorResponse(res, 403, "Merchant not approved yet");

    const { name, environment = "test", permissions, webhookUrl } = req.body;
    if (!name) return errorResponse(res, 422, "Key name is required");

    const apiKey = await ApiKey.create({
      merchant: merchant._id,
      name,
      environment,
      permissions: permissions || ["orders:read", "tracking:read"],
      webhookUrl,
    });

    successResponse(res, 201, "API key created. Save the secret — it won't be shown again.", {
      apiKey: {
        _id: apiKey._id,
        name: apiKey.name,
        key: apiKey.key,
        secret: apiKey.secret,
        environment: apiKey.environment,
        permissions: apiKey.permissions,
        webhookUrl: apiKey.webhookUrl,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/merchant/api-keys
const getApiKeys = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");

    const keys = await ApiKey.find({ merchant: merchant._id }).select("-secret");
    successResponse(res, 200, "API keys fetched", { keys });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/merchant/api-keys/:id
const deleteApiKey = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");

    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, merchant: merchant._id });
    if (!key) return errorResponse(res, 404, "API key not found");

    successResponse(res, 200, "API key deleted");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/merchant/api-keys/:id/toggle
const toggleApiKey = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");

    const key = await ApiKey.findOne({ _id: req.params.id, merchant: merchant._id });
    if (!key) return errorResponse(res, 404, "API key not found");

    key.isActive = !key.isActive;
    await key.save();

    successResponse(res, 200, `API key ${key.isActive ? "activated" : "deactivated"}`, { key });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ─── FLEET MANAGEMENT ────────────────────────────────────────────────────────

// @route POST /api/merchant/fleet/add
const addDriverToFleet = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");
    if (!merchant.isApproved) return errorResponse(res, 403, "Merchant not approved yet");

    const { driverId, assignedZone, shift, shiftStart, shiftEnd } = req.body;
    if (!driverId) return errorResponse(res, 422, "driverId is required");

    const driver = await Driver.findById(driverId);
    if (!driver) return errorResponse(res, 404, "Driver not found");
    if (!driver.isApproved) return errorResponse(res, 422, "Driver not approved by admin");

    const existing = await Fleet.findOne({ merchant: merchant._id, driver: driverId });
    if (existing) return errorResponse(res, 409, "Driver already in your fleet");

    const fleet = await Fleet.create({
      merchant: merchant._id,
      driver: driverId,
      assignedZone,
      shift,
      shiftStart,
      shiftEnd,
    });

    successResponse(res, 201, "Driver added to fleet", { fleet });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/merchant/fleet
const getFleet = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");

    const { status, page = 1, limit = 10 } = req.query;
    const query = { merchant: merchant._id };
    if (status) query.status = status;

    const fleet = await Fleet.find(query)
      .populate({
        path: "driver",
        populate: { path: "user", select: "name phone profileImage" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Fleet.countDocuments(query);
    successResponse(res, 200, "Fleet fetched", { fleet, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/merchant/fleet/:id
const updateFleetDriver = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");

    const fleet = await Fleet.findOneAndUpdate(
      { _id: req.params.id, merchant: merchant._id },
      req.body,
      { new: true }
    );
    if (!fleet) return errorResponse(res, 404, "Fleet record not found");

    successResponse(res, 200, "Fleet driver updated", { fleet });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/merchant/fleet/:id
const removeDriverFromFleet = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");

    const fleet = await Fleet.findOneAndDelete({ _id: req.params.id, merchant: merchant._id });
    if (!fleet) return errorResponse(res, 404, "Fleet record not found");

    successResponse(res, 200, "Driver removed from fleet");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/merchant/fleet/stats
const getFleetStats = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (!merchant) return errorResponse(res, 404, "Merchant profile not found");

    const [total, active, inactive] = await Promise.all([
      Fleet.countDocuments({ merchant: merchant._id }),
      Fleet.countDocuments({ merchant: merchant._id, status: "active" }),
      Fleet.countDocuments({ merchant: merchant._id, status: "inactive" }),
    ]);

    const topDrivers = await Fleet.find({ merchant: merchant._id })
      .sort({ totalDeliveries: -1 })
      .limit(5)
      .populate({ path: "driver", populate: { path: "user", select: "name profileImage" } });

    successResponse(res, 200, "Fleet stats", {
      stats: { total, active, inactive },
      topDrivers,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ─── ADMIN: Merchant Management ──────────────────────────────────────────────

// @route GET /api/admin/merchants
const getAllMerchants = async (req, res) => {
  try {
    const { isApproved, page = 1, limit = 10, search } = req.query;
    const query = {};
    if (isApproved !== undefined) query.isApproved = isApproved === "true";
    if (search) query.businessName = { $regex: search, $options: "i" };

    const merchants = await Merchant.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Merchant.countDocuments(query);
    successResponse(res, 200, "Merchants fetched", { merchants, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/merchants/:id/approve
const approveMerchant = async (req, res) => {
  try {
    const { isApproved, commissionRate } = req.body;
    const updates = { isApproved };
    if (commissionRate) updates.commissionRate = commissionRate;

    const merchant = await Merchant.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!merchant) return errorResponse(res, 404, "Merchant not found");

    successResponse(res, 200, `Merchant ${isApproved ? "approved" : "rejected"}`, { merchant });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  registerMerchant, getMerchantProfile, updateMerchantProfile, getMerchantDashboard,
  createApiKey, getApiKeys, deleteApiKey, toggleApiKey,
  addDriverToFleet, getFleet, updateFleetDriver, removeDriverFromFleet, getFleetStats,
  getAllMerchants, approveMerchant,
};
