const Partner = require("../models/Partner");
const VerificationDocument = require("../models/VerificationDocument");
const { successResponse, errorResponse } = require("../utils/response");

const PARTNER_DOCUMENT_TYPES = ["driver_license", "vehicle_registration", "vehicle_insurance", "business_license"];

// @route POST /api/partner/signup
const partnerSignup = async (req, res) => {
  try {
    const existing = await Partner.findOne({ user: req.user._id });
    if (existing) return errorResponse(res, 409, "Partner application already submitted");

    const {
      partnerType, companyName, contactPerson, contactPhone,
      contactEmail, city, state, serviceAreas,
      expectedMonthlyOrders, hasOwnVehicles, vehicleCount, experience,
      teamSize, operatingHours, serviceCategories, vehicleTypes,
      pricingModel, addOnPricing, availableDays, sameDayAvailability,
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
      teamSize, operatingHours,
      serviceCategories: serviceCategories || [],
      vehicleTypes: vehicleTypes || [],
      pricingModel, addOnPricing,
      availableDays: availableDays || [],
      sameDayAvailability,
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

    const allowed = [
      "companyName", "contactPerson", "contactPhone", "contactEmail", "city", "state", "serviceAreas",
      "experience", "expectedMonthlyOrders", "hasOwnVehicles", "vehicleCount",
      "teamSize", "operatingHours", "serviceCategories", "vehicleTypes",
      "pricingModel", "addOnPricing", "availableDays", "sameDayAvailability",
    ];
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

// @route POST /api/partner/documents
// Required Documents step — Driver's License, Vehicle Registration, Proof of Insurance, Business License
const uploadPartnerDocument = async (req, res) => {
  try {
    const partner = await Partner.findOne({ user: req.user._id });
    if (!partner) return errorResponse(res, 404, "Partner profile not found");

    const { documentType } = req.body;
    if (!PARTNER_DOCUMENT_TYPES.includes(documentType)) {
      return errorResponse(res, 422, `documentType must be one of: ${PARTNER_DOCUMENT_TYPES.join(", ")}`);
    }
    if (!req.file) return errorResponse(res, 400, "No file uploaded");

    // findOneAndUpdate skips the model's pre("save") hook, so verificationId
    // must be generated here on insert — otherwise every new doc writes
    // verificationId: null and collides with the field's unique index.
    const doc = await VerificationDocument.findOneAndUpdate(
      { subject: req.user._id, subjectType: "partner", documentType },
      {
        $set: {
          subjectName: partner.companyName || partner.contactPerson,
          documentUrl: req.file.path,
          status: "pending_review",
        },
        $unset: { rejectionReason: "" },
        $setOnInsert: {
          subject: req.user._id,
          subjectType: "partner",
          documentType,
          verificationId: "VER-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4),
        },
      },
      { new: true, upsert: true }
    );

    successResponse(res, 200, "Document uploaded, pending review", { document: doc });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/partner/documents
const getPartnerDocuments = async (req, res) => {
  try {
    const documents = await VerificationDocument.find({ subject: req.user._id, subjectType: "partner" });
    successResponse(res, 200, "Partner documents fetched", { documents });
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

module.exports = {
  partnerSignup, getPartnerStatus, updatePartnerProfile, getPartnerDashboard,
  uploadPartnerDocument, getPartnerDocuments,
  getAllPartners, reviewPartner,
};
