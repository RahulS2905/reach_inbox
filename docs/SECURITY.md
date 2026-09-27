# Security

## Authentication Flow
ReachInbox uses Google OAuth.
1. Client requests Login.
2. Redirect to Google OAuth.
3. Callback processed by API.
4. Session created in Redis.

## Session Management
- Redis backed sessions using `express-session`.
- HttpOnly, Secure cookies.

## Tenant Isolation
- App enforces `tenantId` on all Prisma queries.
- Middleware assigns current user's tenant to `req.tenant`.

## Encryption at Rest
- Sensitive credentials (like Sender SMTP passwords) are encrypted using AES-256-GCM.
- Encryption key stored in env `ENCRYPTION_KEY`.

## CSRF Protection
- SameSite cookies + CORS configuration.

## Rate Limiting
- API endpoints rate limited via Redis.

## Input Validation
- Zod is used across all API boundaries.

## Secrets Management
- All secrets via `.env`. DO NOT commit `.env`.

## Threat Model
- Main threats: Cross-tenant data access, unauthenticated scheduling, SMTP credential theft.
- Mitigations: Strict Prisma wrappers, Auth Middleware, AES-256-GCM.

## Security Headers
- Helmet is used in Express to set CSP, HSTS, X-Frame-Options, etc.
