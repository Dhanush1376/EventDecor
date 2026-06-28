# Notification & Event Pipeline

The notification system uses a centralized service to aggregate, queue, and dispatch multi-channel alerts (Email, SMS, Push, In-App).

```mermaid
graph LR
    %% Triggers
    Order[Order Placed]
    Stock[Low Stock Alert]
    Event[Security Event]

    %% Notification Service
    Service{Notification<br/>Dispatcher}

    %% Queue
    Queue[(Redis Queue)]

    %% Workers
    EmailWorker[Email Worker]
    SMSWorker[SMS Worker]
    PushWorker[WebSocket/Push Worker]

    %% External
    SendGrid[SendGrid/SES]
    Twilio[Twilio]
    Client[Client App]

    Order --> Service
    Stock --> Service
    Event --> Service

    Service -->|Format & Enqueue| Queue

    Queue --> EmailWorker
    Queue --> SMSWorker
    Queue --> PushWorker

    EmailWorker --> SendGrid
    SMSWorker --> Twilio
    PushWorker --> Client
```

## Features

- **Decoupling**: Business logic (e.g., checkout) does not block waiting for emails to send. It simply dispatches a payload to the queue.
- **Retries**: BullMQ handles robust backoff and retry mechanisms for failing email/SMS APIs.
- **Admin Alerts**: System events (like low stock or security locks) are routed specifically to Admin dashboard push notifications.
