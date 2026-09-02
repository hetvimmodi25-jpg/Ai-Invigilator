require("dotenv").config({path: "./.env"});
const nodemailer = require("nodemailer");

const dns = require("dns");
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // send to self
    subject: 'Test Email',
    text: 'This is a test email.'
};

transporter.sendMail(mailOptions)
    .then(info => console.log("Email sent:", info.response))
    .catch(err => console.error("Error sending email:", err));
