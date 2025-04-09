export class ConflictError extends Error {
  public readonly code = 'CONFLICT_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
} 