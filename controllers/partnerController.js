const Partner = require("../models/Partner");
const { successResponse, errorResponse } = require("../utils/response");

// @route POST /api/partner/signup
const partnerSignup = async (req, res) => {
  try {
    const existing = await Partner.findOne({ user: req.user._id });
    if (existing) return errorResponse(res, 409, "Partner application already submitted");

    const {
      partnerType, companyName, contactPerson, contactPhone,
      contactEmail, city, state, serviceAreas,
      expectedMonthlyOrders, hasOwnVehicles, vehicleCount, experience,
    } = req.body;

    if (!partnerType || !contactPerson || !contactPhone || !contactEmail || !city || !state) {
      return errorResponse(res, 422, "partnerType, contactPerson, contactPhone, contactEmail, city, state are required");
    }

    const partner = await Partner.create({
      user: req.user._id,
      partnerType, companyName, contactPerson, contactPhone,
      contactEmail, city, state,
      serviceAreas: serviceAreas || [],
      expectedMonthlyOrders, hasOwnVehicles,
      vehicleCount: vehicleCount || 0,
      experience,
    });

    successResponse(res, 201, "Partner application submitted successfully. We will contact you within 48 hours.", { partner });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/partner/status
const getPartnerStatus = async (req, res) => {
  try {
    const partner = await Partner.findOne({ user: req.user._id });
    if (!partner) return errorResponse(res, 404, "No partner application found");
    successResponse(res, 200, "Partner status fetched", { partner });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/partner/profile
const updatePartnerProfile = async (req, res) => {
  try {
    const partner = await Partner.findOne({ user: req.user._id });
    if (!partner) return errorResponse(res, 404, "Partner profile not found");
    if (partner.status === "approved") return errorResponse(res, 422, "Cannot edit approved partner profile. Contact support.");

    const allowed = ["companyName", "contactPerson", "contactPhone", "contactEmail", "city", "state", "serviceAreas", "experience", "expectedMonthlyOrders", "hasOwnVehicles", "vehicleCount"];
    allowed.forEach((key) => { if (req.body[key] !== undefined) partner[key] = req.body[key]; });
    await partner.save();

    successResponse(res, 200, "Partner profile updated", { partner });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/partner/dashboard
const getPartnerDashboard = async (req, res) => {
  try {
    const partner = await Partner.findOne({ user: req.user._id });
    if (!partner) return errorResponse(res, 404, "Partner profile not found");
    if (partner.status !== "approved") return errorResponse(res, 403, `Partner status: ${partner.status}. Access denied.`);

    successResponse(res, 200, "Partner dashboard", {
      partner: {
        partnerType: partner.partnerType,
        companyName: partner.companyName,
        status: partner.status,
        commissionRate: partner.commissionRate,
        totalOrders: partner.totalOrders,
        totalEarnings: partner.totalEarnings,
        serviceAreas: partner.serviceAreas,
        approvedAt: partner.approvedAt,
      },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ADMIN routes
// @route GET /api/admin/partners
const getAllPartners = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { contactPerson: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
    ];

    const partners = await Partner.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Partner.countDocuments(query);
    successResponse(res, 200, "Partners fetched", { partners, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/partners/:id/review
const reviewPartner = async (req, res) => {
  try {
    const { status, rejectionReason, commissionRate } = req.body;
    if (!["approved", "rejected", "under_review"].includes(status)) {
      return errorResponse(res, 422, "status must be: approved, rejected, or under_review");
    }

    const updates = { status };
    if (status === "approved") {
      updates.approvedAt = new Date();
      if (commissionRate) updates.commissionRate = commissionRate;
    }
    if (status === "rejected" && rejectionReason) updates.rejectionReason = rejectionReason;

    const partner = await Partner.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!partner) return errorResponse(res, 404, "Partner not found");

    successResponse(res, 200, `Partner ${status}`, { partner });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { partnerSignup, getPartnerStatus, updatePartnerProfile, getPartnerDashboard, getAllPartners, reviewPartner };
