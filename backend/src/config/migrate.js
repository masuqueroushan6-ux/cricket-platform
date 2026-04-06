require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function migrate() {
  console.log('🏏 Running Cricket Platform database migration...\n');
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Database schema created successfully!\n');

    // Create super admin
    const bcrypt = require('bcryptjs');
    const speakeasy = require('speakeasy');
    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@cricketplatform.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123!';
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(password, 12);
      const totpSecret = speakeasy.generateSecret({
        name: `${process.env.TOTP_ISSUER || 'CricketPlatform'}:${email}`,
        issuer: process.env.TOTP_ISSUER || 'CricketPlatform',
      });
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, is_email_verified, totp_secret)
         VALUES ($1, $2, $3, 'super_admin', true, true, $4)`,
        [name, email, hash, totpSecret.base32]
      );
      console.log(`✅ Super admin created: ${email}`);
      console.log(`✅ TOTP Secret (save this!): ${totpSecret.base32}`);
      console.log(`✅ TOTP QR URL: ${totpSecret.otpauth_url}`);
      console.log('\n⚠️  IMPORTANT: Set up Google Authenticator with the TOTP secret above!');
      console.log('    Or scan the QR code from the /auth/setup-2fa endpoint after first login.\n');
    } else {
      console.log('ℹ️  Super admin already exists, skipping...');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
