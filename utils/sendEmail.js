const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = ({ to, subject, html }) => {
  transporter.sendMail({
    from: `"Go Parcel" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  }).catch((err) => console.error("Email error:", err.message));
};

module.exports = sendEmail;
