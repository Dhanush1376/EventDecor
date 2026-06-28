# Database Entity Relationship Diagram

This document illustrates the core entity relationships within the EventDecor MongoDB database. Due to MongoDB's document-oriented nature, some relationships are nested sub-documents (arrays) while others are hard references (`ObjectId`).

```mermaid
erDiagram
    %% Core Entities
    USER {
        ObjectId _id
        String name
        String email
        String role "admin, customer"
        Object loyalty
        Array addresses
    }

    PRODUCT {
        ObjectId _id
        String name
        Number price
        Number stock
        String status
        ObjectId category
        Array images
    }

    CATEGORY {
        ObjectId _id
        String name
        ObjectId parentCategory "Optional"
    }

    ORDER {
        ObjectId _id
        ObjectId user
        Array orderItems
        Number total
        String paymentStatus
        String orderStatus
        Object shippingAddress
    }

    RENTAL_ORDER {
        ObjectId _id
        ObjectId user
        Array items "References Product"
        Date startDate
        Date endDate
        String status
        Number depositAmount
    }

    EVENT {
        ObjectId _id
        String title
        String type
        Date date
        ObjectId customer
    }

    REVIEW {
        ObjectId _id
        ObjectId user
        ObjectId product
        Number rating
        String comment
    }

    %% Relationships
    USER ||--o{ ORDER : "places"
    USER ||--o{ RENTAL_ORDER : "places"
    USER ||--o{ EVENT : "books"
    USER ||--o{ REVIEW : "writes"

    CATEGORY ||--o{ PRODUCT : "contains"
    CATEGORY ||--o| CATEGORY : "sub-category"

    ORDER ||--|{ PRODUCT : "contains items"
    RENTAL_ORDER ||--|{ PRODUCT : "contains rental items"
    REVIEW }o--|| PRODUCT : "belongs to"
```

## Key Architectural Notes

- **Referential Integrity**: MongoDB does not enforce foreign keys. We handle integrity via Mongoose middlewares and application-level checks.
- **Embedded vs Referenced**:
  - `Addresses` and `Loyalty` are embedded inside the `USER` document because they are bounded to the user context and rarely exceed document size limits.
  - `Reviews` are referenced (`ObjectId`) rather than embedded inside `PRODUCT` to prevent unbounded document growth (a product might get 10,000 reviews).
