# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enterprise-level dynamic social sharing metadata (Open Graph and Twitter Cards) with dynamically generated product preview images via backend APIs.
- Edge proxy interception configured for both Vercel (`vercel.json`) and Nginx (`nginx.conf`) to serve metadata directly to social crawlers (e.g., WhatsApp, LinkedIn, Facebook, Twitter) while keeping the SPA intact for real users.
- Production data loss security audit patches, including robust backup mechanisms and database hardening.
- Enterprise data protection implementation with forensic logging, query timeout guards, rate limiters, and payload sanitizers.
- Dynamic Server-Side OG Image composer using \`sharp\` to overlay logos, product text, and dynamic prices.

### Changed
- Improved error handling in order checkout and Razorpay webhook flows to prevent silent drops.
- Cleaned up repository structure by removing old textual data dumps, forensic logs, and debug artifacts.
- Migrated legacy architecture documents to \`docs/architecture.md\`.

### Security
- Introduced \`helmetMiddleware\` and CSRF protection endpoints.
- Deployed strict payload size limitations (10KB - 50KB internally) across all non-upload routes.
- Suppressed Nginx version headers to mitigate automated fingerprinting.
