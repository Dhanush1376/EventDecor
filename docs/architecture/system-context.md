# System Context Architecture

This diagram illustrates the high-level architecture of the EventDecor platform, showing how external actors interact with the system and how internal components communicate.

```mermaid
graph TD
    %% Actors
    Customer((Customer))
    Admin((Administrator))
    Webhook((Payment Webhooks))

    %% External Systems
    Razorpay[Razorpay API]
    Cloudinary[Cloudinary CDN]
    EmailProvider[Email Service<br/>SendGrid/AWS SES]

    %% Infrastructure Boundaries
    subgraph EventDecor Cloud Environment
        %% Presentation Layer
        Frontend[Frontend Application<br/>Vite + React + Tailwind]

        %% API Gateway / Load Balancer (Abstracted)
        Gateway[API Gateway / Nginx]

        %% Application Layer
        Backend[Backend Node.js Service<br/>Express + TypeScript]

        %% Data Layer
        DB[(MongoDB<br/>Primary Store)]
        Cache[(Redis<br/>Cache & Rate Limits)]
        Queue[(Redis<br/>BullMQ Workers)]
    end

    %% Connections
    Customer -->|Browses, Buys, Books| Frontend
    Admin -->|Manages Inventory, Orders| Frontend
    Webhook -->|Payment Callbacks| Gateway

    Frontend -->|REST API & WebSockets| Gateway
    Gateway --> Backend

    Backend <-->|Reads/Writes| DB
    Backend <-->|Tiered Caching & Locks| Cache
    Backend -->|Enqueues Jobs| Queue
    Queue -->|Executes Jobs| Backend

    Backend -->|Payment Intent/Verify| Razorpay
    Backend -->|Uploads Images| Cloudinary
    Queue -->|Sends Emails| EmailProvider
```

## Core Components

- **Frontend**: A React SPA that consumes the REST API. Contains a customer storefront and an Admin Dashboard.
- **Backend Node.js**: The core monolith that orchestrates business logic (Authentication, Commerce, Recommendations).
- **MongoDB**: The primary persistence layer.
- **Redis**: Used heavily for tiered caching, distributed locking (to prevent double bookings), rate limiting, and BullMQ task queues.
- **Razorpay**: Handles all payment processing and verification.
- **Cloudinary**: Handles all media transformations (WebP/AVIF auto-negotiation) and image hosting.
