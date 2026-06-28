/**
 * Custom API Error class
 *
 * Used to throw HTTP errors with specific status codes.
 * Handled globally by the errorMiddleware.
 */
class ApiError extends Error {
  statusCode: number;
  success: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
