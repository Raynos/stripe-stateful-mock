"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StripeError extends Error {
    constructor(statusCode, error) {
        super(error.message);
        this.statusCode = statusCode;
        this.error = error;
    }
}
exports.StripeError = StripeError;
//# sourceMappingURL=StripeError.js.map