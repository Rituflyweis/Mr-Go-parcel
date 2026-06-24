const mongoose = require("mongoose");

const safetyAuditSchema = new mongoose.Schema(
  {
    auditId: { type: String, unique: true },
    auditType: {
      type: String,
      enum: ["driver_safety", "partner_compliance", "vehicle_inspection", "background_check", "document_review"],
      required: true,
    },
    auditedEntity: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    auditedEntityName: { type: String },
    auditedEntityType: { type: String, enum: ["driver", "partner", "vehicle"] },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "failed", "cancelled"],
      default: "scheduled",
    },
    score: { type: Number, min: 0, max: 100 },
    auditor: { type: String },
    scheduledDate: { type: Date },
    completedAt: { type: Date },
    findings: { type: String },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  },
  { timestamps: true }
);

safetyAuditSchema.pre("save", function (next) {
  if (!this.auditId) {
    this.auditId = "AUD-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4);
  }
  next();
});

module.exports = mongoose.model("SafetyAudit", safetyAuditSchema);
