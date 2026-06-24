const VerificationDocument = require("../models/VerificationDocument");
const Incident = require("../models/Incident");
const SafetyAudit = require("../models/SafetyAudit");
const Driver = require("../models/Driver");
const { successResponse, errorResponse } = require("../utils/response");

// ── DOCUMENT VERIFICATIONS ────────────────────────────────────────────────────

// @route GET /api/admin/compliance/verifications
const getVerifications = async (req, res) => {
  try {
    const { status, type, subjectType, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.documentType = type;
    if (subjectType) filter.subjectType = subjectType;
    if (search) filter.$or = [{ verificationId: { $regex: search, $options: "i" } }, { subjectName: { $regex: search, $options: "i" } }];

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000);

    const [pendingReview, approved, rejected, expiringSoon, docs] = await Promise.all([
      VerificationDocument.countDocuments({ status: "pending_review" }),
      VerificationDocument.countDocuments({ status: "approved" }),
      VerificationDocument.countDocuments({ status: "rejected" }),
      VerificationDocument.countDocuments({ status: "approved", expiryDate: { $gte: now, $lte: thirtyDaysLater } }),
      VerificationDocument.find(filter)
        .populate("subject", "name phone email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const total = await VerificationDocument.countDocuments(filter);
    successResponse(res, 200, "Verifications", {
      stats: { pendingReview, approved, rejected, expiringSoon },
      documents: docs, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/compliance/verifications
const createVerification = async (req, res) => {
  try {
    const doc = await VerificationDocument.create(req.body);
    successResponse(res, 201, "Verification created", { doc });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/compliance/verifications/:id
const updateVerification = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.status === "approved" || req.body.status === "rejected") {
      updates.reviewedBy = req.user._id;
      updates.reviewedAt = new Date();
    }
    const doc = await VerificationDocument.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return errorResponse(res, 404, "Verification not found");
    successResponse(res, 200, "Verification updated", { doc });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── INCIDENT REPORTS ──────────────────────────────────────────────────────────

// @route GET /api/admin/compliance/incidents
const getIncidents = async (req, res) => {
  try {
    const { status, type, severity, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (search) filter.$or = [{ incidentId: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];

    const [open, underInvestigation, resolvedThisWeek, highSeverity, incidents] = await Promise.all([
      Incident.countDocuments({ status: "open" }),
      Incident.countDocuments({ status: "under_investigation" }),
      Incident.countDocuments({ status: "resolved", updatedAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
      Incident.countDocuments({ severity: { $in: ["high", "critical"] }, status: { $ne: "closed" } }),
      Incident.find(filter)
        .populate("reportedBy", "name phone")
        .populate("involvedDriver")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const total = await Incident.countDocuments(filter);
    successResponse(res, 200, "Incidents", {
      stats: { open, underInvestigation, resolvedThisWeek, highSeverity },
      incidents, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/compliance/incidents
const createIncident = async (req, res) => {
  try {
    const incident = await Incident.create({ ...req.body, reportedBy: req.user._id, reportedByType: "admin" });
    successResponse(res, 201, "Incident reported", { incident });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/compliance/incidents/:id
const updateIncident = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.status === "resolved" || req.body.status === "closed") {
      updates.resolvedAt = new Date();
      updates.resolvedBy = req.user._id;
    }
    const incident = await Incident.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!incident) return errorResponse(res, 404, "Incident not found");
    successResponse(res, 200, "Incident updated", { incident });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── SAFETY AUDITS ─────────────────────────────────────────────────────────────

// @route GET /api/admin/compliance/audits
const getAudits = async (req, res) => {
  try {
    const { status, auditType, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (auditType) filter.auditType = auditType;
    if (search) filter.$or = [{ auditId: { $regex: search, $options: "i" } }, { auditedEntityName: { $regex: search, $options: "i" } }];

    const [scheduled, inProgress, completed, failed, audits] = await Promise.all([
      SafetyAudit.countDocuments({ status: "scheduled" }),
      SafetyAudit.countDocuments({ status: "in_progress" }),
      SafetyAudit.countDocuments({ status: "completed" }),
      SafetyAudit.countDocuments({ status: "failed" }),
      SafetyAudit.find(filter)
        .populate("auditedEntity", "name phone email")
        .sort({ scheduledDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
    ]);

    const total = await SafetyAudit.countDocuments(filter);
    successResponse(res, 200, "Safety audits", {
      stats: { scheduled, inProgress, completed, failed },
      audits, total,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/compliance/audits
const createAudit = async (req, res) => {
  try {
    const audit = await SafetyAudit.create(req.body);
    successResponse(res, 201, "Audit scheduled", { audit });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/compliance/audits/:id
const updateAudit = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.status === "completed") updates.completedAt = new Date();
    const audit = await SafetyAudit.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!audit) return errorResponse(res, 404, "Audit not found");
    successResponse(res, 200, "Audit updated", { audit });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getVerifications, createVerification, updateVerification, getIncidents, createIncident, updateIncident, getAudits, createAudit, updateAudit };
