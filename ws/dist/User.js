"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const SubscriptionManager_1 = require("./SubscriptionManager");
class User {
    constructor(id, ws) {
        this.subscriptions = [];
        this.id = id;
        this.ws = ws;
        this.addListeners();
    }
    subscribe(subscription) {
        if (!this.subscriptions.includes(subscription)) {
            this.subscriptions.push(subscription);
        }
    }
    unsubscribe(subscriptions) {
        if (this.subscriptions.includes(subscriptions)) {
            this.subscriptions.filter(s => s != subscriptions);
        }
    }
    emit(message) {
        this.ws.send(JSON.stringify(message));
    }
    addListeners() {
        this.ws.on("message", (message) => {
            const parsedMessage = JSON.parse(message);
            console.log(parsedMessage);
            if (parsedMessage.method === "SUBSCRIBE") {
                parsedMessage.params.forEach((channel) => {
                    console.log("Subscribing to channel: ", channel);
                    SubscriptionManager_1.SubscriptionManager.getInstance().subscribe(this.id, channel);
                });
            }
            if (parsedMessage.method === "UNSUBSCRIBE") {
                parsedMessage.params.forEach((channel) => {
                    console.log("Unsubscribing from channel: ", channel);
                    SubscriptionManager_1.SubscriptionManager.getInstance().unsubscribe(this.id, channel);
                });
            }
        });
    }
}
exports.User = User;
