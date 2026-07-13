const PromoCode = require("../models/PromoCode");
const { successResponse, errorResponse } = require("../utils/response");

// @route POST /api/promo/apply
const applyPromoCode = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code || !orderAmount) return errorResponse(res, 422, "code and orderAmount are required");

    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true });
    if (!promo) return errorResponse(res, 404, "Invalid or inactive promo code");

    const now = new Date();
    if (now < promo.validFrom || now > promo.validTill) return errorResponse(res, 410, "Promo code has expired");

    if (orderAmount < promo.minOrderAmount) {
      return errorResponse(res, 422, `Minimum order amount is ₹${promo.minOrderAmount}`);
    }

    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return errorResponse(res, 410, "Promo code usage limit reached");
    }

    if (promo.usedBy.includes(req.user._id)) {
      return errorResponse(res, 409, "You have already used this promo code");
    }

    let discount = 0;
    if (promo.discountType === "flat") {
      discount = promo.discountValue;
    } else {
      discount = (orderAmount * promo.discountValue) / 100;
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    }
    discount = parseFloat(discount.toFixed(2));
    const finalAmount = parseFloat((orderAmount - discount).toFixed(2));

    successResponse(res, 200, "Promo code applied successfully", {
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discount,
      originalAmount: orderAmount,
      finalAmount,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/promo/available
const getAvailablePromos = async (req, res) => {
  try {
    const now = new Date();
    const promos = await PromoCode.find({
      isActive: true,
      validFrom: { $lte: now },
      validTill: { $gte: now },
    }).select("-usedBy");

    successResponse(res, 200, "Available promo codes", { promos });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { applyPromoCode, getAvailablePromos };
