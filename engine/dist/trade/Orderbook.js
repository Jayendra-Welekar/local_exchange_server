"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orderbook = exports.BASE_CURRENCY = void 0;
const RedisManager_1 = require("../RedisManager");
exports.BASE_CURRENCY = "USDC";
class Orderbook {
    constructor(baseAsset, bids, asks, lastTradeId, currentPrice) {
        this.bidsObj = {};
        this.asksObj = {};
        this.quoteAsset = exports.BASE_CURRENCY;
        this.bids = bids;
        bids.forEach(bid => {
            if (!this.bidsObj[bid.price]) {
                this.bidsObj[bid.price] = 0;
            }
            this.bidsObj[bid.price] += bid.quantity - bid.filled;
        });
        this.asks = asks;
        asks.forEach(ask => {
            if (!this.asksObj[ask.price]) {
                this.asksObj[ask.price] = 0;
            }
            this.asksObj[ask.price] += ask.quantity - ask.filled;
        });
        this.baseAsset = baseAsset;
        this.lastTradeId = lastTradeId;
        this.currentPrice = currentPrice;
    }
    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }
    getSnapshot() {
        return {
            baseAsset: this.baseAsset,
            bids: this.bids,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        };
    }
    addOrder(order) {
        var _a, _b;
        if (order.side == "buy") {
            const { executedQty, Fills, toSentAsk } = this.matchBid(order);
            order.filled = executedQty;
            let b = [];
            if (!(executedQty == order.quantity)) {
                this.bids.push(order);
                const ind = toSentAsk.findIndex(x => x[0] == order.price.toString());
                if (!this.bidsObj[order.price]) {
                    this.bidsObj[order.price] = 0;
                }
                this.bidsObj[order.price] += order.quantity - executedQty;
                b.push([order.price.toString(), this.bidsObj[order.price].toString()]);
                console.log(toSentAsk);
                console.log(b);
            }
            this.currentPrice = parseFloat((_a = Fills[Fills.length - 1]) === null || _a === void 0 ? void 0 : _a.price) || this.currentPrice;
            RedisManager_1.RedisManager.getInstance().publishMessage(`depth.${this.baseAsset}_USDC`, {
                stream: `depth.${this.baseAsset}_USDC`,
                data: {
                    a: toSentAsk,
                    b: b,
                    e: "depth"
                }
            });
            return {
                executedQty, Fills
            };
        }
        else {
            const { executedQty, Fills, toSentBid } = this.matchAsk(order);
            order.filled = executedQty;
            let a = [];
            if (!(executedQty == order.quantity)) {
                this.asks.push(order);
                const ind = toSentBid.findIndex(x => x[0] == order.price.toString());
                if (!this.asksObj[order.price]) {
                    this.asksObj[order.price] = 0;
                }
                this.asksObj[order.price] += order.quantity - order.filled;
                a.push([order.price.toString(), this.asksObj[order.price].toString()]);
                console.log(a);
            }
            this.currentPrice = parseFloat((_b = Fills[Fills.length - 1]) === null || _b === void 0 ? void 0 : _b.price) || this.currentPrice;
            RedisManager_1.RedisManager.getInstance().publishMessage(`depth.${this.baseAsset}_USDC`, {
                stream: `depth.${this.baseAsset}_USDC`,
                data: {
                    a: a,
                    b: toSentBid,
                    e: "depth"
                }
            });
            return {
                executedQty,
                Fills
            };
        }
    }
    matchBid(order) {
        const fills = [];
        let executedQty = 0;
        let askmap = new Map;
        for (var i = 0; i < this.asks.length; i++) {
            if (this.asks[i].userId != order.userId && this.asks[i].price <= order.price && executedQty < order.quantity) {
                const filledQty = Math.min(this.asks[i].quantity - this.asks[i].filled, (order.quantity - executedQty));
                executedQty += filledQty;
                this.asks[i].filled += filledQty;
                if (this.asksObj[this.asks[i].price]) {
                    this.asksObj[this.asks[i].price] -= filledQty;
                    askmap.set(this.asks[i].price.toString(), this.asksObj[this.asks[i].price].toString());
                    if (this.asksObj[this.asks[i].price] == 0) {
                        console.log("Befor delete", this.asksObj);
                        delete this.asksObj[this.asks[i].price];
                        console.log("After delete", this.asksObj);
                    }
                }
                fills.push({
                    price: this.asks[i].price.toString(),
                    quantity: filledQty,
                    tradeId: this.lastTradeId++,
                    otherUserId: this.asks[i].userId,
                    markerOrderId: order.orderId
                });
                if (this.asks[i].filled == this.asks[i].quantity) {
                    this.asks.splice(i--, 1);
                }
            }
        }
        let toSentAsk = [];
        askmap.forEach((value, key) => {
            toSentAsk.push([key, value]);
        });
        return { Fills: fills, executedQty, toSentAsk };
    }
    matchAsk(order) {
        const fills = [];
        let executedQty = 0;
        let bidMap = new Map;
        for (var i = 0; i < this.bids.length; i++) {
            if (this.bids[i].userId != order.userId && this.bids[i].price >= order.price && executedQty < order.quantity) {
                const filledQty = Math.min(this.bids[i].quantity - this.bids[i].filled, (order.quantity - executedQty));
                executedQty += filledQty;
                this.bids[i].filled += filledQty;
                if (this.bidsObj[this.bids[i].price]) {
                    this.bidsObj[this.bids[i].price] -= filledQty;
                    bidMap.set(this.bids[i].price.toString(), this.bidsObj[this.bids[i].price].toString());
                    if (this.bidsObj[this.bids[i].price] == 0) {
                        delete this.bidsObj[this.bids[i].price];
                    }
                }
                fills.push({
                    price: this.bids[i].price.toString(),
                    quantity: filledQty,
                    tradeId: this.lastTradeId++,
                    otherUserId: this.bids[i].userId,
                    markerOrderId: order.orderId
                });
                if (this.bids[i].filled == this.bids[i].quantity) {
                    this.bids.splice(i--, 1);
                }
            }
        }
        let toSentBid = [];
        bidMap.forEach((value, key) => {
            toSentBid.push([key, value]);
        });
        return { Fills: fills, executedQty, toSentBid };
    }
    getDepth() {
        const bids = [];
        const asks = [];
        for (const price in this.bidsObj) {
            bids.push([price.toString(), this.bidsObj[price].toString()]);
        }
        for (const price in this.asksObj) {
            asks.push([price.toString(), this.asksObj[price].toString()]);
        }
        console.log("Get Depth");
        return {
            lastTradeId: this.lastTradeId,
            bids,
            asks
        };
    }
    getOpenOrders(userId) {
        const asks = this.asks.filter(ask => ask.userId === userId);
        const bids = this.bids.filter(bid => bid.userId === userId);
        return [...bids, ...asks];
    }
    cancelBid(order) {
        const index = this.bids.findIndex(bid => order.orderId === bid.orderId);
        if (index !== -1) {
            const price = this.bids[index].price;
            this.bidsObj[price] -= (this.bids[index].quantity - this.bids[index].filled);
            this.bids.splice(index, 1);
            RedisManager_1.RedisManager.getInstance().publishMessage(`depth.${this.ticker()}`, {
                stream: `depth.${this.ticker()}`,
                data: {
                    "b": [[price.toString(), this.bidsObj[price].toString()]],
                    "a": [],
                    "e": "depth"
                }
            });
            return price;
        }
    }
    cancelAsk(order) {
        const index = this.asks.findIndex(ask => order.orderId === ask.orderId);
        if (index !== -1) {
            const price = this.asks[index].price;
            this.asksObj[price] -= (this.asks[index].quantity - this.asks[index].filled);
            this.asks.splice(index, 1);
            RedisManager_1.RedisManager.getInstance().publishMessage(`depth.${this.ticker()}`, {
                stream: `depth.${this.ticker()}`,
                data: {
                    "b": [[price.toString(), this.asksObj[price].toString()]],
                    "a": [],
                    "e": "depth"
                }
            });
            return price;
        }
    }
}
exports.Orderbook = Orderbook;
