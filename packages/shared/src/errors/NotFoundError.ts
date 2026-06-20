import { BaseError } from "./BaseError";

export class AletheiaNotFoundError extends BaseError {
  constructor(description = "Not Found") {
    super("AletheiaNotFoundError", 404, description, true);
  }
}
