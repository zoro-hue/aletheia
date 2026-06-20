import { BaseError } from "./BaseError";

export class AletheiaConflictError extends BaseError {
  constructor(description = "Conflict") {
    super("AletheiaConflictError", 409, description, true);
  }
}
