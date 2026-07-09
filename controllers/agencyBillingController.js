const Invoice = require("../models/Invoice");
const Claim = require("../models/Claim");
const SpecializedBooking = require("../models/SpecializedBooking");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/specialized/agency/alerts
// "Recent Alerts" card — last few completed rides + a pending-invoices nudge.
const getAgencyAlerts = async (req, res) => {
  try {
    const [recentCompleted, pendingInvoiceCount] = await Promise.all([
      SpecializedBooking.find({ bookedByAgency: req.user._id, status: "completed" })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select("patientName updatedAt"),
      Invoice.countDocuments({ agency: req.user._id, status: "pending" }),
    ]);

    const alerts = recentCompleted.map((b) => ({
      type: "ride_completed",
      message: `${b.patientName} ride completed successfully`,
      timestamp: b.updatedAt,
    }));

    if (pendingInvoiceCount > 0) {
      alerts.push({
        type: "invoices_pending",
        message: `${pendingInvoiceCount} invoice${pendingInvoiceCount > 1 ? "s" : ""} pending review`,
        timestamp: new Date(),
      });
    }

    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    successResponse(res, 200, "Recent alerts", { alerts });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/billing/summary
// Financial management top cards — Paid / Pending / Overdue / Claims totals.
const getBillingSummary = async (req, res) => {
  try {
    const [invoiceAgg, claimsTotal] = await Promise.all([
      Invoice.aggregate([
        { $match: { agency: req.user._id } },
        { $group: { _id: "$status", total: { $sum: "$amount" } } },
      ]),
      Claim.aggregate([
        { $match: { agency: req.user._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const byStatus = { paid: 0, pending: 0, processing: 0, overdue: 0 };
    invoiceAgg.forEach((row) => { byStatus[row._id] = row.total; });

    successResponse(res, 200, "Billing summary", {
      paid: byStatus.paid,
      pending: byStatus.pending,
      overdue: byStatus.overdue,
      claims: claimsTotal[0]?.total || 0,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/billing/invoices?status=&search=
const getInvoices = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = { agency: req.user._id };
    if (status) filter.status = status;

    let query = Invoice.find(filter).populate("patient", "name").populate("booking", "bookingId").sort({ serviceDate: -1 });
    let invoices = await query;

    if (search) {
      const s = search.toLowerCase();
      invoices = invoices.filter((inv) =>
        inv.patient?.name?.toLowerCase().includes(s) || inv.invoiceNumber.toLowerCase().includes(s)
      );
    }

    successResponse(res, 200, "Invoices", { invoices, total: invoices.length });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/billing/claims?status=
const getClaims = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { agency: req.user._id };
    if (status) filter.status = status;

    const claims = await Claim.find(filter).populate("patient", "name").sort({ submittedDate: -1 });
    const processingCount = await Claim.countDocuments({ agency: req.user._id, status: { $in: ["submitted", "pending"] } });

    successResponse(res, 200, "Claims", { claims, total: claims.length, processingCount });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/specialized/agency/billing/claims
// "Submit New Claim" — files a Medicaid/Medicare claim against an existing invoice.
const submitClaim = async (req, res) => {
  try {
    const { invoiceId, payer } = req.body;
    if (!invoiceId || !["medicaid", "medicare"].includes(payer)) {
      return errorResponse(res, 400, "invoiceId and a valid payer (medicaid/medicare) are required");
    }

    const invoice = await Invoice.findOne({ _id: invoiceId, agency: req.user._id });
    if (!invoice) return errorResponse(res, 404, "Invoice not found");

    const claim = await Claim.create({
      agency: req.user._id,
      patient: invoice.patient,
      invoice: invoice._id,
      payer,
      amount: invoice.amount,
      serviceDate: invoice.serviceDate,
    });

    successResponse(res, 201, "Claim submitted", { claim });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/agency/billing/claims/:id/resubmit
const resubmitClaim = async (req, res) => {
  try {
    const claim = await Claim.findOne({ _id: req.params.id, agency: req.user._id });
    if (!claim) return errorResponse(res, 404, "Claim not found");
    if (claim.status !== "rejected") return errorResponse(res, 400, "Only rejected claims can be resubmitted");

    claim.status = "submitted";
    claim.submittedDate = new Date();
    await claim.save();
    successResponse(res, 200, "Claim resubmitted", { claim });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/reports/overview?month=YYYY-MM
// "Reports" tab — revenue/rides overview + payment method distribution.
const getReportsOverview = async (req, res) => {
  try {
    const now = req.query.month ? new Date(req.query.month + "-01") : new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);

    const [revenueAgg, totalRides, ridesThisWeek, paymentDist, invoiceStatusAgg] = await Promise.all([
      Invoice.aggregate([
        { $match: { agency: req.user._id, serviceDate: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      SpecializedBooking.countDocuments({ bookedByAgency: req.user._id, createdAt: { $gte: monthStart, $lt: monthEnd } }),
      SpecializedBooking.countDocuments({ bookedByAgency: req.user._id, createdAt: { $gte: weekStart } }),
      Invoice.aggregate([
        { $match: { agency: req.user._id, serviceDate: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: "$paymentType", count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { agency: req.user._id, serviceDate: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const revenue = revenueAgg[0]?.total || 0;
    const invoiceCount = revenueAgg[0]?.count || 0;
    const totalInvoices = invoiceStatusAgg.reduce((sum, r) => sum + r.count, 0);
    const paidInvoices = invoiceStatusAgg.find((r) => r._id === "paid")?.count || 0;

    const distTotal = paymentDist.reduce((sum, r) => sum + r.count, 0) || 1;
    const paymentMethodDistribution = paymentDist.map((r) => ({
      method: r._id,
      percent: Math.round((r.count / distTotal) * 100),
    }));

    successResponse(res, 200, "Reports overview", {
      revenue,
      totalRides,
      ridesThisWeek,
      avgPerRide: invoiceCount ? parseFloat((revenue / invoiceCount).toFixed(2)) : 0,
      collectionRate: totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0,
      paymentMethodDistribution,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/billing/export?format=csv
const exportBillingData = async (req, res) => {
  try {
    const invoices = await Invoice.find({ agency: req.user._id }).populate("patient", "name").sort({ serviceDate: -1 });

    const rows = [["Invoice #", "Patient", "Amount", "Status", "Payment Type", "Service Date"]];
    invoices.forEach((inv) => {
      rows.push([inv.invoiceNumber, inv.patient?.name || "", inv.amount, inv.status, inv.paymentType, inv.serviceDate.toISOString().slice(0, 10)]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=billing-export.csv");
    res.send(csv);
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getAgencyAlerts, getBillingSummary, getInvoices, getClaims, submitClaim, resubmitClaim,
  getReportsOverview, exportBillingData,
};
