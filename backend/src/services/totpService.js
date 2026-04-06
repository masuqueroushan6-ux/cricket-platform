const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TOTPService {
  generateSecret(email) {
    const issuer = process.env.TOTP_ISSUER || 'CricketPlatform';
    const secret = speakeasy.generateSecret({
      name: `${issuer}:${email}`,
      issuer,
      length: 32,
    });
    return {
      base32: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      });
      return qrCodeDataURL;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  verifyToken(secret, token) {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: token.toString().replace(/\s/g, ''),
        window: 2, // Allow 2 time steps before/after (±1 minute tolerance)
      });
    } catch (error) {
      return false;
    }
  }

  generateCurrentToken(secret) {
    // For testing only
    return speakeasy.totp({
      secret,
      encoding: 'base32',
    });
  }
}

module.exports = new TOTPService();
