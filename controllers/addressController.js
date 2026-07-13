const Address = require("../models/Address");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/address
const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id });
    successResponse(res, 200, "Addresses", { addresses });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/address
const addAddress = async (req, res) => {
  try {
    const { label, name, phone, address, landmark, city, state, pincode, location, isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    const newAddress = await Address.create({
      user: req.user._id,
      label, name, phone, address, landmark, city, state, pincode, location,
      isDefault: isDefault || false,
    });

    successResponse(res, 201, "Address added", { address: newAddress });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/address/:id
const updateAddress = async (req, res) => {
  try {
    if (req.body.isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!address) return errorResponse(res, 404, "Address not found");
    successResponse(res, 200, "Address updated", { address });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/address/:id
const deleteAddress = async (req, res) => {
  try {
    await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    successResponse(res, 200, "Address deleted");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress };
