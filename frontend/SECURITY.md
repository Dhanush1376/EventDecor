# Frontend Security & XSS Mitigation Guide

This document outlines the security mechanisms implemented in the Siri Arts & Crafts frontend application to defend against Cross-Site Scripting (XSS), Data Exfiltration, and Client-Side vulnerabilities.

## 1. Safe HTML Rendering (React)

React automatically escapes values rendered in `{...}` expressions. However, for features requiring dynamic HTML rendering (like CMS content, policies, and email campaign previews), `dangerouslySetInnerHTML` is restricted.

**Rule:** Never pass untrusted, raw strings directly to `dangerouslySetInnerHTML`.
**Solution:** Always use the `createSafeHtml` utility from `src/utils/sanitize.js`.

```javascript
import { createSafeHtml } from '../utils/sanitize';

// UNSAFE:
// <div dangerouslySetInnerHTML={{ __html: userContent }} />

// SECURE:
<div dangerouslySetInnerHTML={createSafeHtml(userContent)} />;
```

`DOMPurify` is configured to automatically strip `<script>`, `<iframe src="javascript:...">`, and enforce `rel="noopener noreferrer"` on external links.

## 2. Browser Storage Policy

Local Storage (`localStorage`) and Session Storage (`sessionStorage`) are accessible to any JavaScript running on the domain. This makes them highly vulnerable if an XSS attack occurs.

**Rule:** Never store sensitive authentication tokens (e.g., JWT access tokens, refresh tokens, or passwords) in `localStorage`.

- We use `safeLocalStorage` wrappers (`src/utils/storage.js`) to handle quota errors and incognito modes gracefully.
- Authentication tokens must be handled exclusively by the backend and stored in **HttpOnly, Secure cookies**.

## 3. Content Security Policy (CSP)

A strong Content Security Policy (CSP) acts as a defense-in-depth mechanism. If an XSS vulnerability exists, the CSP limits the attacker's ability to execute external scripts or send stolen data to an external server.

The CSP is deployed via two methods to ensure coverage across hosting environments:

- **Vercel Deployments:** Defined in `vercel.json`.
- **Self-Hosted/Docker:** Defined in `nginx.example.conf`.

### Current CSP Allowlist

- **Scripts (`script-src`)**: 'self', 'unsafe-inline', `checkout.razorpay.com`
- **Styles (`style-src`)**: 'self', 'unsafe-inline', `fonts.googleapis.com`
- **Images (`img-src`)**: 'self', `data:`, `blob:`, `res.cloudinary.com`, `flagcdn.com`
- **Connect/API (`connect-src`)**: 'self', `api.siriartsandcrafts.com` (REST and WSS), `api.razorpay.com`
- **Iframes (`frame-src`)**: 'self', `checkout.razorpay.com`

_Note: If integrating a new third-party service (e.g., a chat widget or analytics tool), the CSP headers in `vercel.json` and `nginx.example.conf` MUST be updated to whitelist the specific domains._

## 4. Third-Party Script Validation

Do not load raw `<script>` tags from unknown CDNs. If a third-party script is required, verify its integrity using the `integrity` attribute (Subresource Integrity - SRI) wherever possible.

## 5. Prototype Pollution Avoidance

Avoid insecure object recursive merges (e.g., deep merge functions) that use untrusted JSON data directly without checking for `__proto__` or `constructor` properties.
