"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require("loglevel");
const AccountData_1 = require("./AccountData");
const StripeError_1 = require("./StripeError");
const utils_1 = require("./utils");
const customers_1 = require("./customers");
const FILE_START = Date.now();
var subscriptions;
(function (subscriptions) {
    const accountSubscriptions = new AccountData_1.AccountData();
    const accountSubscriptionItems = new AccountData_1.AccountData();
    function create(accountId, params) {
        log.debug("subscriptions.create", accountId, params);
        const paramId = params.id;
        if (paramId && accountSubscriptions.contains(accountId, paramId)) {
            throw new StripeError_1.StripeError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: "Subscription already exists.",
                type: "invalid_request_error"
            });
        }
        let default_source;
        let paramsDefaultSource = params.default_source;
        if (paramsDefaultSource && typeof paramsDefaultSource !== 'string') {
            const customer = params.customer;
            const card = customers_1.customers.createCard(accountId, customer, {
                source: paramsDefaultSource
            });
            default_source = card.id;
        }
        else if (typeof paramsDefaultSource === 'string') {
            default_source = paramsDefaultSource;
        }
        let plan = params.plan;
        if (!plan) {
            plan = params.items[0].plan;
        }
        const subscriptionId = paramId || `sub_${utils_1.generateId(14)}`;
        const now = Math.floor((Date.now() / 1000));
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        let paramQuantity = +params.quantity;
        if (!params.quantity && params.items.length === 1) {
            paramQuantity = +params.items[0].quantity;
        }
        const subscription = {
            id: subscriptionId,
            object: "subscription",
            application_fee_percent: +params.application_fee_percent || null,
            billing: params.billing || "charge_automatically",
            collection_method: params.billing || "charge_automatically",
            billing_cycle_anchor: +params.billing_cycle_anchor || now,
            billing_thresholds: null,
            cancel_at: null,
            cancel_at_period_end: false,
            canceled_at: null,
            created: now,
            current_period_end: Math.floor(nextMonth.getTime() / 1000),
            /** Hard coded to assume month long subscriptions */
            current_period_start: now,
            customer: params.customer,
            days_until_due: +params.days_until_due || null,
            default_payment_method: null,
            default_source: default_source || null,
            /*default_tax_rates*/
            discount: null,
            ended_at: null,
            items: {
                object: "list",
                total_count: params.items ? params.items.length : 0,
                data: [],
                has_more: false,
                url: `/v1/subscription_items?subscription=${subscriptionId}`
            },
            latest_invoice: `in_${utils_1.generateId(14)}`,
            livemode: false,
            metadata: utils_1.stringifyMetadata(params.metadata),
            plan: createPlanObj(plan),
            quantity: paramQuantity || 1,
            start: Math.floor(Date.now() / 1000),
            start_date: Math.floor(Date.now() / 1000),
            status: 'active',
            tax_percent: +params.tax_percent || null,
            trial_end: null,
            trial_start: null
        };
        if (params.items) {
            for (const item of params.items) {
                subscription.items.data.push(createItem(accountId, item, subscription.id));
            }
        }
        accountSubscriptions.put(accountId, subscription);
        customers_1.customers.addSubscription(accountId, typeof subscription.customer === 'string' ?
            subscription.customer : subscription.customer.id, subscription);
        return subscription;
    }
    subscriptions.create = create;
    function createPlanObj(planName) {
        const plan = {
            id: planName,
            object: 'plan',
            active: true,
            aggregate_usage: null,
            amount: 10 * 100,
            billing_scheme: 'per_unit',
            created: Math.floor(FILE_START / 1000),
            currency: 'usd',
            interval: 'month',
            interval_count: 1,
            livemode: false,
            metadata: {},
            nickname: null,
            product: `prod_${planName.substr(5)}`,
            tiers: null,
            tiers_mode: null,
            transform_usage: null,
            trial_period_days: null,
            usage_type: 'licensed'
        };
        return plan;
    }
    function createItem(accountId, item, subscriptionId) {
        const paramId = item.id;
        const subItemId = paramId || `si_${utils_1.generateId(14)}`;
        const subscriptionItem = {
            object: 'subscription_item',
            id: subItemId,
            billing_thresholds: null,
            created: Math.floor(Date.now() / 1000),
            metadata: utils_1.stringifyMetadata(item.metadata),
            plan: createPlanObj(item.plan),
            quantity: +item.quantity || 1,
            subscription: subscriptionId
        };
        accountSubscriptionItems.put(accountId, subscriptionItem);
        return subscriptionItem;
    }
    function update(accountId, subscriptionId, params) {
        log.debug("subscriptions.update", accountId, subscriptionId, params);
        const subscription = retrieve(accountId, subscriptionId, "id");
        /* TODO: support update */
        return subscription;
    }
    subscriptions.update = update;
    function updateItem(accountId, subscriptionItemId, params) {
        log.debug("subscriptionITems.update", accountId, subscriptionItemId, params);
        const subscriptionItem = retrieveItem(accountId, subscriptionItemId, "id");
        if (params.quantity) {
            subscriptionItem.quantity = +params.quantity;
            const sub = retrieve(accountId, subscriptionItem.subscription, "id");
            if (sub.items.data.length === 1) {
                sub.quantity = +params.quantity;
            }
        }
        return subscriptionItem;
    }
    subscriptions.updateItem = updateItem;
    function retrieve(accountId, subscriptionId, paramName) {
        log.debug("subscriptions.retrieve");
        const subscription = accountSubscriptions.get(accountId, subscriptionId);
        if (!subscription) {
            throw new StripeError_1.StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such subscription: ${subscriptionId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return subscription;
    }
    subscriptions.retrieve = retrieve;
    function retrieveItem(accountId, subscriptionItemId, paramName) {
        log.debug("subscriptionItems.retrieve");
        const subscriptionItem = accountSubscriptionItems.get(accountId, subscriptionItemId);
        if (!subscriptionItem) {
            throw new StripeError_1.StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such subscription_item: ${subscriptionItemId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return subscriptionItem;
    }
    subscriptions.retrieveItem = retrieveItem;
    function list(accountId, params) {
        let data = accountSubscriptions.getAll(accountId);
        if (params.customer) {
            data = data.filter(d => {
                if (typeof d.customer === 'string') {
                    return d.customer === params.customer;
                }
                else {
                    return d.customer.id === params.customer;
                }
            });
        }
        return utils_1.applyListOptions(data, params, (id, paramName) => {
            return retrieve(accountId, id, paramName);
        });
    }
    subscriptions.list = list;
    function listItem(accountId, params) {
        let data = accountSubscriptionItems.getAll(accountId);
        if (params.subscription) {
            data = data.filter(d => {
                return d.subscription === params.subscription;
            });
        }
        return utils_1.applyListOptions(data, params, (id, paramName) => {
            return retrieveItem(accountId, id, paramName);
        });
    }
    subscriptions.listItem = listItem;
    /**
     * TODO: export function update()
     */
})(subscriptions = exports.subscriptions || (exports.subscriptions = {}));
//# sourceMappingURL=subscriptions.js.map