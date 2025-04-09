export class NotFoundError extends Error {
  public readonly code = 'NOT_FOUND_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
} 