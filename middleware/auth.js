const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { errorResponse } = require("../utils/response");

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return errorResponse(res, 401, "Not authorized, no token");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return errorResponse(res, 401, "User not found");
    if (req.user.isBlocked) return errorResponse(res, 403, "Your account has been blocked");
    next();
  } catch (error) {
    return errorResponse(res, 401, "Token invalid or expired");
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, `Role '${req.user.role}' is not authorized`);
    }
    next();
  };
};

module.exports = { protect, authorize };
