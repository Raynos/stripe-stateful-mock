"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require("loglevel");
const AccountData_1 = require("./AccountData");
const StripeError_1 = require("./StripeError");
const disputes_1 = require("./disputes");
const utils_1 = require("./utils");
const charges_1 = require("./charges");
var refunds;
(function (refunds) {
    const accountRefunds = new AccountData_1.AccountData();
    function create(accountId, params) {
        log.debug("refunds.create", accountId, params);
        if (params.hasOwnProperty("amount")) {
            if (params.amount < 1) {
                throw new StripeError_1.StripeError(400, {
                    code: "parameter_invalid_integer",
                    doc_url: "https://stripe.com/docs/error-codes/parameter-invalid-integer",
                    message: "Invalid positive integer",
                    param: "amount",
                    type: "invalid_request_error"
                });
            }
            if (params.amount > 99999999) {
                throw new StripeError_1.StripeError(400, {
                    code: "amount_too_large",
                    doc_url: "https://stripe.com/docs/error-codes/amount-too-large",
                    message: "Amount must be no more than $999,999.99",
                    param: "amount",
                    type: "invalid_request_error"
                });
            }
        }
        const charge = charges_1.charges.retrieve(accountId, params.charge, "id");
        if (charge.amount_refunded >= charge.amount) {
            throw new StripeError_1.StripeError(400, {
                code: "charge_already_refunded",
                doc_url: "https://stripe.com/docs/error-codes/charge-already-refunded",
                message: `Charge ${charge.id} has already been refunded.`,
                type: "invalid_request_error"
            });
        }
        if (charge.dispute) {
            const dispute = disputes_1.disputes.retrieve(accountId, charge.dispute, "dispute");
            if (!dispute.is_charge_refundable) {
                throw new StripeError_1.StripeError(400, {
                    code: "charge_disputed",
                    doc_url: "https://stripe.com/docs/error-codes/charge-disputed",
                    message: `Charge ${charge.id} has been charged back; cannot issue a refund.`,
                    type: "invalid_request_error"
                });
            }
        }
        let refundAmount = params.hasOwnProperty("amount") ? +params.amount : charge.amount - charge.amount_refunded;
        if (refundAmount > charge.amount - charge.amount_refunded) {
            throw new StripeError_1.StripeError(400, {
                message: `Refund amount (\$${refundAmount / 100}) is greater than unrefunded amount on charge (\$${(charge.amount - charge.amount_refunded) / 100})`,
                param: "amount",
                type: "invalid_request_error"
            });
        }
        if (!charge.captured && charge.amount !== refundAmount) {
            throw new StripeError_1.StripeError(400, {
                message: "You cannot partially refund an uncaptured charge. Instead, capture the charge for an amount less than the original amount",
                param: "amount",
                type: "invalid_request_error"
            });
        }
        const refund = {
            id: "re_" + utils_1.generateId(24),
            object: "refund",
            amount: refundAmount,
            balance_transaction: "txn_" + utils_1.generateId(24),
            charge: charge.id,
            created: (Date.now() / 1000) | 0,
            currency: charge.currency.toLowerCase(),
            metadata: utils_1.stringifyMetadata(params.metadata),
            reason: params.reason || null,
            receipt_number: null,
            source_transfer_reversal: null,
            status: "succeeded",
            transfer_reversal: null
        };
        charge.refunds.data.unshift(refund);
        charge.refunds.total_count++;
        charge.amount_refunded += refundAmount;
        charge.refunded = charge.amount_refunded === charge.amount;
        accountRefunds.put(accountId, refund);
        return refund;
    }
    refunds.create = create;
    function retrieve(accountId, refundId, paramName) {
        log.debug("refunds.retrieve", accountId, refundId);
        const refund = accountRefunds.get(accountId, refundId);
        if (!refund) {
            throw new StripeError_1.StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such refund: ${refundId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return refund;
    }
    refunds.retrieve = retrieve;
    function list(accountId, params) {
        log.debug("refunds.list", accountId, params);
        let data = accountRefunds.getAll(accountId);
        if (params.charge) {
            data = data.filter(d => d.charge === params.charge);
        }
        return utils_1.applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }
    refunds.list = list;
})(refunds = exports.refunds || (exports.refunds = {}));
//# sourceMappingURL=refunds.js.map