# 🏏 Cricket Platform — Complete Deployment Guide

## Overview
This guide deploys your full-stack cricket platform for FREE using:
- **Database**: Supabase (free PostgreSQL)
- **Backend**: Render.com (free Node.js hosting)
- **Frontend**: Vercel (free Next.js hosting)

---

## ✅ STEP 1 — Set Up Database (Supabase)

### 1.1 Create Project
1. Go to **https://supabase.com** → Sign up (free)
2. Click **"New Project"**
3. Fill in:
   - Project name: `cricket-platform`
   - Database password: (save this!)
   - Region: Asia (Mumbai) — closest to India
4. Click **Create Project** (takes ~2 minutes)

### 1.2 Run Database Schema
1. In Supabase dashboard → Click **"SQL Editor"** (left sidebar)
2. Click **"New Query"**
3. Open file: `backend/src/config/schema.sql`
4. Copy the ENTIRE content and paste it into the SQL editor
5. Click **"Run"** — you should see: *"Cricket Platform database schema created successfully!"*

### 1.3 Get Connection String
1. Go to **Settings** (left sidebar) → **Database**
2. Scroll to **"Connection string"** section
3. Select **URI** tab
4. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
5. **Save this** — you'll need it in Step 2

---

## ✅ STEP 2 — Deploy Backend (Render)

### 2.1 Push Code to GitHub
```bash
# In the cricket-platform folder:
git init
git add .
git commit -m "Initial commit — Cricket Platform MVP"

# Create a new GitHub repo at github.com → New Repository
# Then:
git remote add origin https://github.com/YOUR_USERNAME/cricket-platform.git
git branch -M main
git push -u origin main
```

### 2.2 Create Render Service
1. Go to **https://render.com** → Sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `cricket-platform-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 2.3 Set Environment Variables
In Render → Your Service → **Environment** tab → Add these:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `DATABASE_URL` | *(paste from Supabase step 1.3)* |
| `JWT_SECRET` | *(generate: run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)* |
| `JWT_REFRESH_SECRET` | *(generate another random 64-byte hex)* |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `TOTP_ISSUER` | `CricketPlatform` |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_SECURE` | `false` |
| `EMAIL_USER` | `your_gmail@gmail.com` |
| `EMAIL_PASS` | *(your 16-char Gmail App Password — see 2.4)* |
| `OTP_EXPIRES_MINUTES` | `10` |
| `MAX_LOGIN_ATTEMPTS` | `5` |
| `SUPER_ADMIN_EMAIL` | `your_email@gmail.com` |
| `SUPER_ADMIN_PASSWORD` | `YourStrongPassword@123` |
| `SUPER_ADMIN_NAME` | `Your Name` |
| `FRONTEND_URL` | `https://your-app.vercel.app` *(fill after Step 3)* |

### 2.4 Set Up Gmail App Password (for OTP emails)
1. Go to **myaccount.google.com** → Security
2. Enable **2-Step Verification** (if not already)
3. Go to **Security** → **App Passwords**
4. Select app: **Mail** → Select device: **Other** → Type "Cricket Platform"
5. Click **Generate** → Copy the 16-character password
6. Use this as `EMAIL_PASS` in Render

### 2.5 Run Database Migration
After deploy, in Render → **Shell** tab (or click "Connect"):
```bash
npm run db:migrate
```
This creates the Super Admin and shows the TOTP secret.

**IMPORTANT**: Save the TOTP secret shown in the output! You'll need it for Google Authenticator.

### 2.6 Verify Backend
Visit: `https://your-backend.onrender.com/health`
Should return: `{"status":"ok","service":"Cricket Platform API"}`

---

## ✅ STEP 3 — Deploy Frontend (Vercel)

### 3.1 Create Vercel Project
1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **"Add New Project"**
3. Import your GitHub repo
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.2 Set Environment Variables in Vercel
In Vercel → Project → **Settings** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://your-backend.onrender.com` |

### 3.3 Deploy
Click **"Deploy"** → Wait ~2 minutes → Your site is live!

### 3.4 Update FRONTEND_URL in Render
Go back to Render → Environment variables → Update:
```
FRONTEND_URL = https://your-app.vercel.app
```
Then click **"Manual Deploy"** to restart with the new URL.

---

## ✅ STEP 4 — Set Up Google Authenticator (Super Admin)

### 4.1 Install the App
Download **Google Authenticator** on your phone:
- [Android (Play Store)](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
- [iOS (App Store)](https://apps.apple.com/app/google-authenticator/id388497605)

### 4.2 First Login Flow
1. Go to your Vercel URL → click **Admin Login**
2. Enter your super admin email + password
3. You'll be redirected to **"Setup Authenticator"** page
4. Open Google Authenticator → tap **"+"** → **"Scan QR code"**
5. Scan the QR code shown on screen
6. Enter the 6-digit code from the app
7. Click **"Verify & Complete Setup"**

### 4.3 Future Logins
Email + Password → Enter 6-digit code from Google Authenticator → Done!

---

## ✅ STEP 5 — First Steps After Deployment

### 5.1 Create Your First Tournament
1. Login as Super Admin
2. Go to **Tournaments** → **New Tournament**
3. Fill in name, dates, format
4. Click **Create**

### 5.2 Create a Tournament Admin
1. Go to **Manage Admins** → **Create Admin**
2. Fill in name, email, assign to tournament
3. They'll receive an email with login credentials

### 5.3 Add Teams and Players
1. Go to **Teams & Players** → select tournament
2. Click **Add Team** → create 2+ teams
3. Click the team → **Add Player** for each player

### 5.4 Schedule and Score a Match
1. Go to **Matches** → **Schedule Match**
2. Select teams, overs, venue → **Schedule**
3. Click **Score** on the match
4. Record toss → starts live scoring
5. Use the scoring pad to record each ball

---

## 🔒 Security Checklist

- [ ] Strong JWT secrets (64+ random bytes each)
- [ ] Strong Super Admin password (12+ chars, mixed case + symbols)
- [ ] Google Authenticator set up for Super Admin
- [ ] Gmail App Password (not your main Gmail password)
- [ ] FRONTEND_URL set correctly (prevents CORS issues)
- [ ] `NODE_ENV=production` on Render
- [ ] Database password is strong and saved securely

---

## 💻 Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/cricket-platform.git
cd cricket-platform

# 2. Install dependencies
npm run install:all

# 3. Set up backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase DATABASE_URL + email config

# 4. Set up frontend environment
cp frontend/.env.example frontend/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
# NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# 5. Run migration (creates tables + super admin)
npm run db:migrate

# 6. Start both servers
npm run dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# Health:   http://localhost:5000/health
```

---

## 📊 Free Tier Limits

| Service | Free Limit | Notes |
|---------|-----------|-------|
| **Supabase** | 500MB DB, 2GB bandwidth | Enough for hundreds of tournaments |
| **Render** | 750 hrs/month, sleeps after 15min idle | Wakes up in ~30s on first request |
| **Vercel** | 100GB bandwidth, unlimited deployments | More than enough |
| **Gmail SMTP** | 500 emails/day | Sufficient for OTPs |

### Render Sleep Issue
The free tier backend "sleeps" after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. To fix this for production:
- Upgrade to Render Starter ($7/month) — no sleep
- OR use **Cron-job.org** (free) to ping `/health` every 10 minutes

---

## 🚀 Next Steps / Scaling

When you're ready to scale beyond MVP:

1. **Ball-by-ball stats** → Player performance auto-calculation
2. **Push notifications** → Firebase FCM for score alerts
3. **Player photos** → Cloudinary integration
4. **Custom domain** → Vercel domain settings
5. **Upgrade DB** → Supabase Pro ($25/month) for more storage
6. **Upgrade backend** → Render Starter ($7/month) for no sleep

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Check `DATABASE_URL` has no spaces and correct password
- In Supabase → Settings → Database → make sure SSL is not enforced for the password

### "OTP email not received"
- Check `EMAIL_USER` and `EMAIL_PASS` are correct
- Make sure you used App Password (not Gmail password)
- Check spam folder

### "TOTP code invalid"
- Make sure phone time is synchronized (Settings → Date & Time → Automatic)
- The code changes every 30 seconds — try again with fresh code

### "CORS error"
- Make sure `FRONTEND_URL` in Render matches your exact Vercel URL (no trailing slash)
- Redeploy backend after changing env vars

### Render shows "Service unavailable"
- Check Render logs for errors
- Make sure all required env vars are set
- Try "Manual Deploy" to restart
