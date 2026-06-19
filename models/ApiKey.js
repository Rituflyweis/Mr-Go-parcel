const mongoose = require("mongoose");
const crypto = require("crypto");

const apiKeySchema = new mongoose.Schema(
  {
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    name: { type: String, required: true }, // e.g. "Production Key", "Test Key"
    key: { type: String, unique: true },
    secret: { type: String },
    environment: { type: String, enum: ["test", "production"], default: "test" },
    permissions: {
      type: [String],
      enum: ["orders:read", "orders:write", "tracking:read", "webhooks:write"],
      default: ["orders:read", "tracking:read"],
    },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
    requestCount: { type: Number, default: 0 },
    webhookUrl: { type: String },
    webhookSecret: { type: String },
  },
  { timestamps: true }
);

apiKeySchema.pre("save", function (next) {
  if (!this.key) {
    this.key = "gp_" + this.environment + "_" + crypto.randomBytes(20).toString("hex");
    this.secret = "gps_" + crypto.randomBytes(32).toString("hex");
  }
  next();
});

module.exports = mongoose.model("ApiKey", apiKeySchema);
