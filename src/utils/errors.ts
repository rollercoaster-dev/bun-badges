/**
 * Base error class for API errors
 */
export class APIError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

/**
 * Error for 400 Bad Request responses
 */
export class BadRequestError extends APIError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * Error for 401 Unauthorized responses
 */
export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Error for 403 Forbidden responses
 */
export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Error for 404 Not Found responses
 */
export class NotFoundError extends APIError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}

/**
 * Error for 409 Conflict responses
 */
export class ConflictError extends APIError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
} 