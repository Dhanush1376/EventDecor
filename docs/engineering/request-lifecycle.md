# The Request Lifecycle

Every incoming HTTP request in EventDecor follows a predictable, highly-structured path. Understanding this path is crucial for debugging and contributing.

## The 6-Step Pipeline

1. **API Gateway / Global Middleware**
   - The request hits Express (`app.ts`).
   - Global middlewares execute:
     - `helmet()` for security headers.
     - `cors()` for cross-origin access.
     - `express.json()` and `express.urlencoded()` for body parsing.
     - `mongoSanitize()` and custom `xssSanitizer` to strip malicious inputs.

2. **Route Resolution (`registerApiRoutes.ts`)**
   - The request is routed via `/api/v1/:domain`.
   - The `lazyRouter` dynamically requires the domain router (e.g., `productRoutes.ts`) if it's the first time the route is hit.

3. **Domain Middleware & Validation**
   - **Auth Check**: If the route is protected, `protect` or `authorizeRoles` middlewares verify the JWT.
   - **Rate Limiting**: Domain-specific limits (e.g., login attempts) check Redis.
   - **Validation**: Joi/Zod middlewares validate `req.body`, `req.query`, and `req.params`. If validation fails, a `400 Bad Request` is thrown immediately.

4. **Controller Orchestration**
   - The Controller receives the sanitized, validated request.
   - It extracts parameters and calls the appropriate Service function.
   - _Rule: No direct Mongoose queries here!_

5. **Service Layer (Business Logic)**
   - The Service executes the core logic.
   - It may read/write to MongoDB, acquire Redis locks, call Razorpay, or enqueue BullMQ jobs.
   - It throws custom `ApiError` instances if something goes wrong (e.g., `throw new ApiError(404, "Product not found")`).

6. **Response & Error Handling**
   - The Controller receives the Service result and sends a structured JSON response using `res.status(200).json({ success: true, data })`.
   - If ANY error was thrown during Steps 3-5, `express-async-handler` catches it and passes it to the **Global Error Handler** (`errorHandler.ts`).
   - The Error Handler formats the error, hides stack traces in production, and sends a consistent JSON error response to the client.
