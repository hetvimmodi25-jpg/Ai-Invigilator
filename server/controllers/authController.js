const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const dns = require("dns");

// Force IPv4 resolution to prevent ENETUNREACH errors on networks without IPv6 support
dns.setDefaultResultOrder('ipv4first');

// --- Nodemailer Configuration ---
// Configure this in your .env file
const service = process.env.EMAIL_SERVICE || 'gmail';
const transporter = nodemailer.createTransport({
  host: service === 'gmail' ? 'smtp.gmail.com' : undefined,
  port: service === 'gmail' ? 587 : undefined,
  secure: service === 'gmail' ? false : undefined,
  service: service !== 'gmail' ? service : undefined,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Student Registration
exports.registerStudent = async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        const existingUser = await pool.query(
            "SELECT * FROM students WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
`INSERT INTO students
(enrollment_no, full_name, email, password, phone, course, semester, profile_photo)
VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
[
req.body.enrollment_no,
req.body.full_name,
req.body.email,
hashedPassword,
req.body.phone,
req.body.course,
req.body.semester,
req.body.profile_photo || null
]
);

        res.json({
            success: true,
            message: "Registration Successful"
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

// Student Login
exports.loginStudent = async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await pool.query(
            "SELECT * FROM students WHERE email=$1",
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password
        );

        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: "Incorrect Password"
            });
        }

       const token = jwt.sign(
{
    student_id: user.rows[0].student_id,
    email: user.rows[0].email
},
process.env.JWT_SECRET,
{ expiresIn: "24h" }
);

        res.json({
            success: true,
            token,
            student: user.rows[0]
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

// --- FORGOT PASSWORD FLOW ---

// In-memory store for OTPs
const otpStore = new Map();

exports.requestPasswordReset = async (req, res) => {
    try {
        const { contact } = req.body;
        
        if (!contact) {
            return res.status(400).json({ success: false, message: "Email or phone number is required" });
        }

        // Check if user exists by email or phone
        let user;
        if (contact.includes('@')) {
            user = await pool.query(
                "SELECT * FROM students WHERE email = $1",
                [contact]
            );
        } else {
            user = await pool.query(
                "SELECT * FROM students WHERE phone = $1",
                [contact]
            );
        }

        if (user.rows.length === 0) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const student = user.rows[0];

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with 10-minute expiration
        otpStore.set(student.email, {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000,
            student_id: student.student_id
        });
        if (student.phone) {
             otpStore.set(student.phone, {
                otp,
                expiresAt: Date.now() + 10 * 60 * 1000,
                student_id: student.student_id
             });
        }

        // Send OTP via Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: student.email,
            subject: 'AI Invigilator - Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
            html: `<p>Your OTP for password reset is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>`
        };
        
        try {
            await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] OTP sent to ${student.email}`);
        } catch (mailErr) {
            console.error("Failed to send email:", mailErr);
            return res.status(500).json({ success: false, message: "Failed to send email OTP. Check server configuration." });
        }

        if (!contact.includes('@')) {
            console.log(`[MOCK SMS] Sending OTP ${otp} to phone ${contact}`);
        }

        res.json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { contact, otp } = req.body;
        
        if (!contact || !otp) {
            return res.status(400).json({ success: false, message: "Contact and OTP are required" });
        }

        const storedData = otpStore.get(contact);

        if (!storedData) {
            return res.status(400).json({ success: false, message: "OTP expired or invalid" });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(contact);
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // OTP is valid. Issue a temporary token for password reset
        const resetToken = jwt.sign(
            { student_id: storedData.student_id, contact },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.json({
            success: true,
            message: "OTP verified",
            resetToken
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ success: false, message: "Reset token and new password are required" });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (e) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset session" });
        }

        const { student_id, contact } = decoded;

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update DB
        await pool.query(
            "UPDATE students SET password = $1 WHERE student_id = $2",
            [hashedPassword, student_id]
        );

        // Clear OTP
        otpStore.delete(contact);

        res.json({
            success: true,
            message: "Password reset successful"
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Update Baseline Photo (Anti-Impersonation Profile Photo)
exports.updateBaselinePhoto = async (req, res) => {
    try {
        const { student_id, profile_photo } = req.body;

        if (!student_id || !profile_photo) {
            return res.status(400).json({
                success: false,
                message: "Student ID and baseline photo are required"
            });
        }

        const result = await pool.query(
            "UPDATE students SET profile_photo = $1 WHERE student_id = $2 RETURNING student_id, enrollment_no, full_name, email, phone, course, semester, profile_photo",
            [profile_photo, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        res.json({
            success: true,
            message: "Baseline photo updated successfully",
            student: result.rows[0]
        });
    } catch (err) {
        console.error("Update baseline photo error:", err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};