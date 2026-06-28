# Payment & Checkout Flow

This diagram illustrates the e-commerce checkout pipeline, including integration with Razorpay, payment reconciliation, and asynchronous post-order processing.

```mermaid
sequenceDiagram
    actor Customer
    participant Frontend
    participant CheckoutService
    participant InventoryDB
    participant Razorpay
    participant OrderDB
    participant JobQueue

    %% Checkout Initialization
    Customer->>Frontend: Clicks "Checkout"
    Frontend->>CheckoutService: POST /api/v1/orders/create
    CheckoutService->>InventoryDB: Check Stock & Apply Distributed Lock

    %% Gateway Order Creation
    CheckoutService->>Razorpay: Create Razorpay Order
    Razorpay-->>CheckoutService: razorpay_order_id

    %% Save Pending Order
    CheckoutService->>OrderDB: Save Order (Status: Pending)
    CheckoutService-->>Frontend: Order Details & Payment Key

    %% Payment Client-Side
    Frontend->>Razorpay: Open Razorpay Modal
    Customer->>Razorpay: Enters Payment Details
    Razorpay-->>Frontend: Payment Success (razorpay_payment_id, signature)

    %% Payment Verification
    Frontend->>CheckoutService: POST /api/v1/orders/verify
    CheckoutService->>CheckoutService: verifySignature(HMAC)

    alt Signature Valid
        CheckoutService->>OrderDB: Update Order (Status: Paid)
        CheckoutService->>InventoryDB: Deduct Stock, Release Lock
        CheckoutService->>JobQueue: Enqueue Notifications (Email)
        CheckoutService-->>Frontend: 200 OK (Payment Success)
    else Signature Invalid
        CheckoutService->>OrderDB: Update Order (Status: Failed)
        CheckoutService->>InventoryDB: Release Lock
        CheckoutService-->>Frontend: 400 Bad Request
    end
```

## Resilience & Reconciliation

- **Distributed Locks**: During the checkout phase, Redis locks are applied to inventory items to prevent overselling. If the payment modal is closed or times out, a background worker releases the lock.
- **Webhooks**: Razorpay sends asynchronous webhooks (`payment.captured`, `payment.failed`) which the backend uses to reconcile orders in case the client disconnects before sending the verification request.
