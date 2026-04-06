const rateLimit = require('express-rate-limit');
const { query } = require('../config/database');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Strict login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Account temporarily locked. Try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req) => {
    // Rate limit by IP + email combination
    return `${req.ip}-${(req.body.email || '').toLowerCase()}`;
  },
});

// OTP rate limiter
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 3,
  message: { success: false, message: 'Too many OTP requests. Try again in 5 minutes.' },
});

// Log security events to DB
const logSecurityEvent = async (req, action, userId = null, details = {}) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        action,
        JSON.stringify(details),
        req.ip || req.connection?.remoteAddress,
        req.headers['user-agent'],
      ]
    );
  } catch (err) {
    // Don't fail request if audit logging fails
    console.error('Audit log failed:', err.message);
  }
};

// Validate request body keys (prevent pollution)
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Remove potential prototype pollution keys
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerous) {
      delete req.body[key];
    }
  }
  next();
};

module.exports = {
  apiLimiter,
  loginLimiter,
  otpLimiter,
  logSecurityEvent,
  sanitizeInput,
};
