const express = require("express");
const router = express.Router();

const {
    registerStudent,
    loginStudent,
    requestPasswordReset,
    verifyOTP,
    resetPassword,
    updateBaselinePhoto
} = require("../controllers/authController");

// Student Registration
router.post("/register", registerStudent);

// Student Login
router.post("/login", loginStudent);

// Baseline Photo Update
router.put("/profile-photo", updateBaselinePhoto);

// Forgot Password Flow
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

module.exports = router;