# ⚠️ Production Secrets Rotation Checklist

> **IMPORTANT:** This document outlines all secrets that must be rotated before production deployment.  
> The `.env` file currently contains **live production credentials** which must be replaced with test/sandbox keys for development.

## Required Rotations

| Secret | Current Status | Action Required |
|--------|:----:|----------|
| `RAZORPAY_KEY_ID` | ⚠️ Live key (`rzp_live_*`) | Generate new live keys in Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | ⚠️ Live key | Regenerate alongside key ID |
| `RAZORPAY_WEBHOOK_SECRET` | ⚠️ Weak value | Generate strong secret: `openssl rand -hex 32` |
| `MONGO_URI` | ⚠️ Production Atlas URI | Rotate MongoDB Atlas user password |
| `JWT_SECRET` | ⚠️ May be shared | Generate new: `openssl rand -hex 64` |
| `FIELD_ENCRYPTION_KEY` | ⚠️ May be shared | Generate new: `openssl rand -hex 32` (WARNING: existing encrypted 2FA secrets will become unreadable) |
| `CLOUDINARY_API_KEY` | ⚠️ Production key | Rotate in Cloudinary Dashboard → Settings → Security |
| `CLOUDINARY_API_SECRET` | ⚠️ Production key | Rotate alongside API key |
| `SMTP_PASS` | ⚠️ Gmail app password | Regenerate in Google Account → App Passwords |
| `GROQ_API_KEY` | ⚠️ Production key | Regenerate in Groq Dashboard |
| `ADMIN_PASSWORD` | ⚠️ Plaintext in env | Hash with bcrypt and store hash: `npx bcrypt-cli hash "newpassword"` |

## Development Environment Setup

Create a `.env.development` with sandbox/test keys:

```env
# Use Razorpay TEST mode keys for development
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=test_secret
RAZORPAY_WEBHOOK_SECRET=dev_webhook_secret_for_testing

# Use a separate dev MongoDB database
MONGO_URI=mongodb://localhost:27017/siri-arts-dev

# Dev-only secrets (not production-grade)
JWT_SECRET=dev_jwt_secret_change_me_in_production_32chars_min
FIELD_ENCRYPTION_KEY=dev_encryption_key_change_me_prod_32c
```

## Post-Rotation Verification

1. [ ] Verify customer login flow works
2. [ ] Verify admin login + 2FA flow works
3. [ ] Verify Razorpay test payment flow works
4. [ ] Verify Cloudinary image uploads work
5. [ ] Verify email sending works (OTP emails)
6. [ ] Verify webhook signature validation works
7. [ ] Run `envSchema.ts` production refinements pass
