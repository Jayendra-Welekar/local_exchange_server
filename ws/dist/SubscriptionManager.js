"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const redis_1 = require("redis");
const Usermanager_1 = require("./Usermanager");
class SubscriptionManager {
    constructor() {
        this.subscription = new Map();
        this.reverseSubscription = new Map();
        this.redisCallbackHandler = (message, channel) => {
            var _a;
            console.log(`Received message on channel ${channel}: ${message}`);
            const parsedMessage = JSON.parse(message);
            (_a = this.reverseSubscription.get(channel)) === null || _a === void 0 ? void 0 : _a.forEach(user => { var _a; return (_a = Usermanager_1.UserManager.getInstance().getUser(user)) === null || _a === void 0 ? void 0 : _a.emit(parsedMessage); });
        };
        this.redisClient = (0, redis_1.createClient)();
        this.redisClient.connect();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }
    subscribe(userId, subscription) {
        var _a, _b, _c;
        if ((_a = this.subscription.get(userId)) === null || _a === void 0 ? void 0 : _a.includes(subscription)) {
            return;
        }
        this.subscription.set(userId, ((_b = (this.subscription.get(userId) || [])) === null || _b === void 0 ? void 0 : _b.concat(subscription)));
        this.reverseSubscription.set(subscription, ((this.reverseSubscription.get(subscription) || []).concat(userId)));
        if (((_c = this.reverseSubscription.get(subscription)) === null || _c === void 0 ? void 0 : _c.length) === 1) {
            this.redisClient.subscribe(subscription, this.redisCallbackHandler);
        }
    }
    unsubscribe(userId, subscription) {
        var _a, _b;
        const subscriptions = this.subscription.get(userId);
        if (!subscriptions || subscriptions.length === 0) {
            return;
        }
        this.subscription.set(userId, subscriptions.filter(channel => channel != subscription));
        this.reverseSubscription.set(subscription, ((_a = this.reverseSubscription.get(subscription)) === null || _a === void 0 ? void 0 : _a.filter(uid => uid != userId)) || []);
        if (((_b = this.reverseSubscription.get(subscription)) === null || _b === void 0 ? void 0 : _b.length) === 0) {
            this.reverseSubscription.delete(subscription);
            this.redisClient.unsubscribe(subscription);
        }
    }
    userLeft(userId) {
        var _a;
        (_a = this.subscription.get(userId)) === null || _a === void 0 ? void 0 : _a.forEach(channel => this.unsubscribe(userId, channel));
    }
    getSubscriptions(userId) {
        return this.subscription.get(userId) || [];
    }
}
exports.SubscriptionManager = SubscriptionManager;
