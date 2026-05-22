# Frontend CSP — style-src remediation

## Change (CRITICAL-02)

`frontend/vercel.json` no longer allows `'unsafe-inline'` on `style-src` (blocks injected `<style>` tags).

Dynamic React `style={{ ... }}` props are allowed via `style-src-attr 'unsafe-inline'`, which is narrower than full `style-src 'unsafe-inline'`.

## Residual risk

- **Framer Motion** may inject `<style>` elements for keyframe animations. If animations break in production, migrate those animations to CSS classes or add hashed `style-src-elem` entries.
- **Recharts** (admin analytics) may inject SVG `<style>` nodes. Verify admin charts after deploy.

## Target state

1. Audit Framer Motion usage for `<style>` injection; prefer `transform` / CSS variables / Tailwind classes.
2. Replace Recharts inline SVG styles with themed CSS where possible.
3. Remove `style-src-attr 'unsafe-inline'` once all dynamic styling uses classes.

**Timeline:** address Recharts/Framer `<style>` injection in the next security sprint.
