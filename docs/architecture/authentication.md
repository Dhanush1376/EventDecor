# Authentication & Authorization Flow

EventDecor implements a robust JWT-based authentication system with Access Tokens (short-lived) and Refresh Tokens (long-lived, HTTP-only cookies).

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant AuthRouter
    participant AuthService
    participant TokenUtil
    participant DB
    participant Cache

    %% Login Flow
    User->>Client: Enters credentials
    Client->>AuthRouter: POST /api/v1/auth/login
    AuthRouter->>AuthService: validateCredentials(email, pwd)
    AuthService->>DB: findOne({ email })
    DB-->>AuthService: User Document
    AuthService->>AuthService: comparePasswords()

    %% Token Generation
    AuthService->>TokenUtil: generateTokens(user)
    TokenUtil-->>AuthService: { accessToken, refreshToken }

    %% Session Storage
    AuthService->>Cache: storeRefreshTokenHash(userId, hash)

    %% Response
    AuthService-->>AuthRouter: Tokens & User Info
    AuthRouter-->>Client: Set-Cookie: refreshToken (HTTPOnly)<br/>JSON: { accessToken, user }

    %% Authenticated Request
    Note over Client,AuthRouter: Subsequent API Requests
    Client->>AuthRouter: GET /api/v1/orders (Bearer token)
    AuthRouter->>AuthRouter: verifyJWT(accessToken)
    AuthRouter->>DB: req.user = User
    AuthRouter-->>Client: 200 OK Response
```

## Security Mechanisms

- **XSS Protection**: The `accessToken` is stored in memory on the frontend (React Context) and never in `localStorage`, mitigating XSS risks.
- **CSRF Protection**: The `refreshToken` is stored in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie to prevent interception and CSRF attacks.
- **Token Revocation / Reuse Detection**: If a refresh token is used after it has been revoked or rotated, the system triggers a **Security Alert** and invalidates ALL active sessions for that user by clearing the Redis token hashes.
- **Rate Limiting & Lockout**: Login attempts are rate-limited via Redis. Consecutive failures trigger an account lockout.
