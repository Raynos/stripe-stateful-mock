import * as stripe from "stripe";
import { AccountData } from "./AccountData";
import log = require("loglevel");
import { StripeError } from "./StripeError";
import { applyListOptions, generateId } from "./utils";
import { customers } from "./customers"
import { subscriptions } from "./subscriptions";

export namespace invoices {
    const accountInvoices = new AccountData<
        stripe.invoices.IInvoice
    >();

    export function _createInvoice(
        accountId: string,
        params: stripe.invoices.IInvoiceCreationOptions
    ) {
        log.debug("invoices.create", accountId, params)

        const paramId = (params as any).id
        if (paramId && accountInvoices.contains(accountId, paramId)) {
            throw new StripeError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: "Invoice already exists.",
                type: "invalid_request_error"
            });
        }

        const invoiceId = paramId || `in_${generateId(14)}`

        const customerObj = customers.retrieve(
            accountId, params.customer, "id"
        );
        const subscriptionObj = subscriptions.retrieve(
            accountId, params.subscription, "id"
        )

        const invoice: stripe.invoices.IInvoice = {
            id: invoiceId,
            object: 'invoice',
            account_country: 'US',
            account_name: 'Stripe.com',
            amount_due: subscriptionObj.plan.amount,
            amount_paid: 0,
            amount_remaining: subscriptionObj.plan.amount
        }
    }

    export function retrieve(
        accountId: string,
        invoiceId: string,
        paramName: string
    ): stripe.invoices.IInvoice {
        log.debug("invoices.retrieve");

        const invoice = accountInvoices.get(accountId, invoiceId);
        if (!invoice) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such invoice: ${invoiceId}`,
                param: paramName,
                type: "invalid_request_error"
            })
        }
        return invoice;
    }

    export function list(
        accountId: string,
        params: stripe.invoices.IInvoiceListOptions
    ) {
        log.debug("invoices.list")

        let data = accountInvoices.getAll(accountId)

        if (params.customer) {
            data = data.filter(d => {
                if (typeof d.customer === 'string') {
                    return d.customer === params.customer
                } else {
                    return d.customer.id === params.customer
                }
            })
        }

        if (params.subscription) {
            data = data.filter(d => {
                if (typeof d.subscription === 'string') {
                    return d.subscription === params.subscription
                } else {
                    return d.subscription.id === params.subscription
                }
            })
        }

        return applyListOptions(data, params, (id, paramName) => {
            return retrieve(accountId, id, paramName);
        });
    }
}
