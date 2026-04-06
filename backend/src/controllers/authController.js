const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const emailService = require('../services/emailService');
const totpService = require('../services/totpService');
const { logSecurityEvent } = require('../middleware/security');
const { validationResult } = require('express-validator');

// ─── Step 1: Email + Password Login ───────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;
  const lowerEmail = email.toLowerCase().trim();

  try {
    const result = await query(
      `SELECT id, name, email, password_hash, role, is_active,
              login_attempts, locked_until, totp_secret, totp_enabled, totp_verified
       FROM users WHERE email = $1`,
      [lowerEmail]
    );

    if (result.rows.length === 0) {
      await logSecurityEvent(req, 'LOGIN_FAILED_USER_NOT_FOUND', null, { email: lowerEmail });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check account lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minutes.`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      const attempts = user.login_attempts + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
      const lockUntil = attempts >= maxAttempts
        ? new Date(Date.now() + 15 * 60 * 1000) // Lock 15 minutes
        : null;

      await query(
        `UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3`,
        [attempts, lockUntil, user.id]
      );

      await logSecurityEvent(req, 'LOGIN_FAILED_WRONG_PASSWORD', user.id, { attempts });

      const remaining = maxAttempts - attempts;
      return res.status(401).json({
        success: false,
        message: remaining > 0
          ? `Invalid password. ${remaining} attempt(s) remaining.`
          : 'Account locked for 15 minutes due to too many failed attempts.',
      });
    }

    // Reset login attempts on password success
    await query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    // ── Super Admin: requires TOTP (Google Authenticator) ──
    if (user.role === 'super_admin') {
      // If TOTP not set up yet, send setup token
      if (!user.totp_verified) {
        const setupToken = generateTokenPair({ ...user, twofa_step: 'setup_totp' }).accessToken;
        return res.status(200).json({
          success: true,
          step: 'setup_totp',
          message: 'Set up Google Authenticator to continue.',
          setupToken,
        });
      }
      // TOTP is set up — require verification
      const pendingToken = generateTokenPair({ ...user, twofa_step: 'verify_totp' }).accessToken;
      return res.status(200).json({
        success: true,
        step: 'verify_totp',
        message: 'Enter your Google Authenticator code.',
        pendingToken,
      });
    }

    // ── Tournament Admin: requires Email OTP ──
    if (user.role === 'tournament_admin') {
      const otp = emailService.generateOTP();
      const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || '10') * 60000);

      await query(
        `UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_attempts = 0 WHERE id = $3`,
        [otp, expiresAt, user.id]
      );

      await emailService.sendOTPEmail(user.email, otp, user.name);
      await logSecurityEvent(req, 'OTP_SENT', user.id, {});

      return res.status(200).json({
        success: true,
        step: 'verify_otp',
        message: `OTP sent to ${user.email}`,
        userId: user.id, // needed for OTP verification step
      });
    }

    return res.status(400).json({ success: false, message: 'Unknown role' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ─── Step 2a: Verify Email OTP (Tournament Admin) ─────────────────────────────
const verifyOTP = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ success: false, message: 'User ID and OTP are required' });
  }

  try {
    const result = await query(
      `SELECT id, name, email, role, otp_code, otp_expires_at, otp_attempts
       FROM users WHERE id = $1 AND role = 'tournament_admin'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    // Max OTP attempts
    if (user.otp_attempts >= 5) {
      await query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1', [userId]);
      return res.status(429).json({
        success: false,
        message: 'Too many OTP attempts. Please login again.',
        code: 'OTP_MAX_ATTEMPTS',
      });
    }

    // Check expiry
    if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please login again.' });
    }

    // Verify OTP
    if (user.otp_code !== otp.trim()) {
      await query('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1', [userId]);
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP verified — clear it and issue tokens
    await query(
      `UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0,
       last_login_at = NOW(), last_login_ip = $2 WHERE id = $1`,
      [userId, req.ip]
    );

    // Fetch tournaments this admin manages
    const tournamentsResult = await query(
      `SELECT t.id, t.name FROM tournaments t
       JOIN admin_tournament_mappings atm ON t.id = atm.tournament_id
       WHERE atm.user_id = $1 AND atm.is_active = true`,
      [userId]
    );

    const tokens = generateTokenPair(user);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, userId]);
    await logSecurityEvent(req, 'LOGIN_SUCCESS', userId, { method: 'email_otp' });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tournaments: tournamentsResult.rows,
      ...tokens,
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// ─── Step 2b: Setup TOTP (Super Admin first time) ─────────────────────────────
const setupTOTP = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: 'Token required' });

  try {
    const jwt = require('../utils/jwt');
    const decoded = jwt.verifyAccessToken(authHeader.split(' ')[1]);

    if (decoded.twofa_step !== 'setup_totp') {
      return res.status(403).json({ success: false, message: 'Invalid step token' });
    }

    const result = await query(
      'SELECT id, name, email, totp_secret, totp_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    let secret = user.totp_secret;
    if (!secret) {
      const generated = totpService.generateSecret(user.email);
      secret = generated.base32;
      await query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, user.id]);
    }

    const issuer = process.env.TOTP_ISSUER || 'CricketPlatform';
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    const qrCode = await totpService.generateQRCode(otpauthUrl);

    return res.status(200).json({
      success: true,
      secret,
      otpauthUrl,
      qrCode, // base64 PNG
      message: 'Scan this QR code in Google Authenticator, then verify with verifyTOTP endpoint.',
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired setup token' });
  }
};

// ─── Step 2c: Verify TOTP (Super Admin) ───────────────────────────────────────
const verifyTOTP = async (req, res) => {
  const { totpCode, pendingToken } = req.body;

  if (!totpCode || !pendingToken) {
    return res.status(400).json({ success: false, message: 'TOTP code and pending token required' });
  }

  try {
    const jwt = require('../utils/jwt');
    const decoded = jwt.verifyAccessToken(pendingToken);

    if (!['verify_totp', 'setup_totp'].includes(decoded.twofa_step)) {
      return res.status(403).json({ success: false, message: 'Invalid step token' });
    }

    const result = await query(
      'SELECT id, name, email, role, totp_secret FROM users WHERE id = $1 AND role = $2',
      [decoded.userId, 'super_admin']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const user = result.rows[0];

    if (!user.totp_secret) {
      return res.status(400).json({ success: false, message: 'TOTP not set up. Complete setup first.' });
    }

    const isValid = totpService.verifyToken(user.totp_secret, totpCode);
    if (!isValid) {
      await logSecurityEvent(req, 'TOTP_FAILED', user.id, {});
      return res.status(400).json({ success: false, message: 'Invalid TOTP code. Check your authenticator app.' });
    }

    // Mark TOTP as verified and issue tokens
    await query(
      `UPDATE users SET totp_verified = true, totp_enabled = true,
       last_login_at = NOW(), last_login_ip = $2 WHERE id = $1`,
      [user.id, req.ip]
    );

    const tokens = generateTokenPair(user);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);
    await logSecurityEvent(req, 'LOGIN_SUCCESS', user.id, { method: 'totp' });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    });
  } catch (err) {
    console.error('TOTP verification error:', err);
    return res.status(401).json({ success: false, message: 'Verification failed' });
  }
};

// ─── Refresh Token ─────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });

  try {
    const decoded = verifyRefreshToken(token);
    const result = await query(
      'SELECT id, name, email, role, refresh_token, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || result.rows[0].refresh_token !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    const tokens = generateTokenPair(user);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

    return res.status(200).json({ success: true, ...tokens });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    await logSecurityEvent(req, 'LOGOUT', req.user.id, {});
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

// ─── Resend OTP ────────────────────────────────────────────────────────────────
const resendOTP = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

  try {
    const result = await query(
      'SELECT id, name, email, otp_expires_at FROM users WHERE id = $1 AND role = $2',
      [userId, 'tournament_admin']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    // Prevent too-frequent resends
    if (user.otp_expires_at && (new Date(user.otp_expires_at) - new Date()) > 8 * 60 * 1000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 2 minutes before requesting a new OTP.',
      });
    }

    const otp = emailService.generateOTP();
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || '10') * 60000);
    await query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_attempts = 0 WHERE id = $3',
      [otp, expiresAt, userId]
    );

    await emailService.sendOTPEmail(user.email, otp, user.name);
    return res.status(200).json({ success: true, message: 'New OTP sent to your email.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
};

// ─── Get current user ─────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, phone, is_active, totp_enabled, last_login_at, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let tournaments = [];
    if (result.rows[0].role === 'tournament_admin') {
      const tResult = await query(
        `SELECT t.id, t.name, t.status FROM tournaments t
         JOIN admin_tournament_mappings atm ON t.id = atm.tournament_id
         WHERE atm.user_id = $1 AND atm.is_active = true`,
        [req.user.id]
      );
      tournaments = tResult.rows;
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
      tournaments,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get user info' });
  }
};

module.exports = { login, verifyOTP, setupTOTP, verifyTOTP, refreshToken, logout, resendOTP, getMe };
