const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTPEmail(to, otp, name = 'Admin') {
    const expiresIn = process.env.OTP_EXPIRES_MINUTES || 10;
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Cricket Platform <noreply@cricketplatform.com>',
      to,
      subject: '🔐 Your Cricket Platform Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background: #0a0a0f; color: #e0e0e0; margin: 0; padding: 20px; }
            .container { max-width: 480px; margin: 0 auto; background: #12121a; border-radius: 16px; overflow: hidden; border: 1px solid #1e2035; }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center; border-bottom: 1px solid #00d2ff22; }
            .header h1 { color: #00d2ff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
            .header p { color: #888; margin: 8px 0 0; font-size: 13px; }
            .body { padding: 32px; text-align: center; }
            .greeting { font-size: 16px; color: #ccc; margin-bottom: 24px; }
            .otp-box { background: #0d0d18; border: 2px solid #00d2ff; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .otp-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
            .otp-code { font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #00d2ff; font-family: 'Courier New', monospace; }
            .expires { font-size: 13px; color: #666; margin-top: 16px; }
            .warning { background: #1a1208; border: 1px solid #f59e0b44; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #f59e0b; }
            .footer { background: #0d0d18; padding: 20px; text-align: center; font-size: 12px; color: #444; border-top: 1px solid #1e2035; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏏 CRICKET PLATFORM</h1>
              <p>Tournament Management System</p>
            </div>
            <div class="body">
              <p class="greeting">Hello <strong style="color:#fff">${name}</strong>,</p>
              <p style="color:#888;font-size:14px;">Use the OTP below to complete your login.</p>
              <div class="otp-box">
                <div class="otp-label">Your One-Time Password</div>
                <div class="otp-code">${otp}</div>
                <div class="expires">⏱ Expires in <strong style="color:#fff">${expiresIn} minutes</strong></div>
              </div>
              <div class="warning">
                ⚠️ Never share this OTP with anyone. Our team will never ask for it.
              </div>
              <p style="color:#555;font-size:12px;">If you didn't request this, please ignore this email or contact support immediately.</p>
            </div>
            <div class="footer">
              Cricket Platform &bull; Secure Tournament Management<br>
              This is an automated message, please do not reply.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`OTP email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send OTP email:', error.message);
      throw new Error('Failed to send OTP email. Please check email configuration.');
    }
  }

  async sendWelcomeEmail(to, name, tempPassword = null) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Cricket Platform <noreply@cricketplatform.com>',
      to,
      subject: '🏏 Welcome to Cricket Platform - Your Admin Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background: #0a0a0f; color: #e0e0e0; margin: 0; padding: 20px; }
            .container { max-width: 480px; margin: 0 auto; background: #12121a; border-radius: 16px; overflow: hidden; border: 1px solid #1e2035; }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center; border-bottom: 1px solid #00d2ff22; }
            .header h1 { color: #00d2ff; margin: 0; font-size: 22px; font-weight: 700; }
            .body { padding: 32px; }
            .cred-box { background: #0d0d18; border: 1px solid #1e2035; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .cred-label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
            .cred-value { font-size: 16px; color: #00d2ff; font-family: monospace; margin-top: 4px; }
            .footer { background: #0d0d18; padding: 20px; text-align: center; font-size: 12px; color: #444; border-top: 1px solid #1e2035; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏏 CRICKET PLATFORM</h1>
            </div>
            <div class="body">
              <p>Hello <strong style="color:#fff">${name}</strong>,</p>
              <p style="color:#888;">Your Tournament Admin account has been created. Here are your login credentials:</p>
              <div class="cred-box">
                <div class="cred-label">Email</div>
                <div class="cred-value">${to}</div>
              </div>
              ${tempPassword ? `
              <div class="cred-box">
                <div class="cred-label">Temporary Password</div>
                <div class="cred-value">${tempPassword}</div>
              </div>
              <p style="color:#f59e0b;font-size:13px;">⚠️ Please change your password after first login.</p>
              ` : ''}
              <p style="color:#888;font-size:13px;">A 6-digit OTP will be sent to this email every time you log in as an additional security step.</p>
            </div>
            <div class="footer">Cricket Platform &bull; Tournament Management System</div>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service not configured:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
