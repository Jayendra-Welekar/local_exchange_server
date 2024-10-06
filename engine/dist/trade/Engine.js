"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = void 0;
const RedisManager_1 = require("../RedisManager");
const types_1 = require("../types");
const toApi_1 = require("../types/toApi");
const Orderbook_1 = require("./Orderbook");
const fs_1 = __importDefault(require("fs"));
require('dotenv').config();
class Engine {
    constructor() {
        this.orderbooks = [];
        this.balances = new Map();
        let snapshot = null;
        try {
            if (process.env.WITH_SNAPSHOT) {
                snapshot = fs_1.default.readFileSync('./snapshot.json');
            }
        }
        catch (e) {
            console.log("No snapshot found");
        }
        if (snapshot) {
            const snapShot = JSON.parse(snapshot.toString());
            this.orderbooks = snapShot.orderbooks.map((o) => new Orderbook_1.Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
            this.balances = new Map(snapShot.balances);
        }
        else {
            this.orderbooks = [];
            this.saveSnapshot();
        }
        setInterval(() => {
            this.saveSnapshot();
        }, 3000);
    }
    saveSnapshot() {
        const snapSnapShot = {
            orderbooks: this.orderbooks.map(o => o.getSnapshot()),
            balances: Array.from(this.balances.entries())
        };
        fs_1.default.writeFileSync("./snapshot.json", JSON.stringify(snapSnapShot));
    }
    process({ message, clientId }) {
        switch (message.type) {
            case toApi_1.CREATE_ORDER:
                try {
                    const { executedQty, fills, orderId } = this.createOrder(message.data.market, message.data.price, message.data.quantity, message.data.userId, message.data.side);
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, { type: "ORDER_PLACED",
                        payload: {
                            orderId: orderId,
                            executedQty: executedQty.toString(),
                            fills: fills.map(fill => {
                                return {
                                    price: fill.price,
                                    quantity: fill.quantity,
                                    tradeId: fill.tradeId
                                };
                            })
                        } });
                }
                catch (err) {
                    console.log(err);
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, { type: "ORDER_CANCELED",
                        payload: {
                            orderId: "",
                            quantity: 0,
                            executedQty: 0
                        }
                    });
                }
                break;
            case toApi_1.CANCEL_ORDER:
                try {
                    const orderId = message.data.orderId;
                    const market = message.data.market;
                    const orderbook = this.orderbooks.find(o => o.ticker() === market);
                    const quoteAsset = market.split("_")[0];
                    if (!orderbook) {
                        throw new Error("No orderbook found");
                    }
                    const order = orderbook.asks.find(ask => ask.orderId === orderId) || orderbook.bids.find(bid => bid.orderId === orderId);
                    if (!order) {
                        throw new Error("No order found");
                    }
                    if (order.side === "buy") {
                        const price = orderbook.cancelBid(order);
                        const leftQuantity = (order.quantity - order.filled) * (order.price);
                        this.balances.get(order.userId)[Orderbook_1.BASE_CURRENCY].available += leftQuantity;
                        this.balances.get(order.userId)[Orderbook_1.BASE_CURRENCY].locked -= leftQuantity;
                        RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                            type: "ORDER_CANCELED",
                            payload: {
                                orderId,
                                quantity: order.quantity * order.price,
                                executedQty: order.filled * order.price
                            }
                        });
                    }
                    else {
                        const price = orderbook.cancelAsk(order);
                        const leftQuantity = (order.quantity - order.filled);
                        this.balances.get(order.userId)[quoteAsset].available += leftQuantity;
                        this.balances.get(order.userId)[quoteAsset].locked -= leftQuantity;
                        RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                            type: "ORDER_CANCELED",
                            payload: {
                                orderId,
                                quantity: order.quantity,
                                executedQty: order.filled
                            }
                        });
                    }
                }
                catch (err) {
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "ERROR",
                        paylode: {
                            message: "Error occured while cancelling the order",
                            error: err
                        }
                    });
                }
                break;
            case toApi_1.GET_OPEN_ORDERS:
                try {
                    const { market, userId } = message.data;
                    const orderbook = this.orderbooks.find(o => o.ticker() === market);
                    if (!orderbook) {
                        console.log("Orderbook not found");
                        throw new Error("No orderbook found");
                    }
                    const orders = orderbook.getOpenOrders(userId);
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: orders
                    });
                }
                catch (err) {
                    console.log(err);
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "ERROR",
                        paylode: {
                            message: "Error occured while Getting open orders",
                            error: err
                        }
                    });
                }
                break;
            case toApi_1.ON_RAMP:
                try {
                    const userId = message.data.userId;
                    const amount = message.data.amount;
                    this.onRamp(userId, amount);
                }
                catch (err) {
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "ERROR",
                        paylode: {
                            message: "Error occured while Ramping",
                            error: err
                        }
                    });
                }
                break;
            case toApi_1.GET_DEPTH:
                try {
                    const market = message.data.market;
                    const orderbook = this.orderbooks.find(o => o.ticker() === market);
                    if (!orderbook) {
                        throw new Error("No orderbook found");
                    }
                    const depth = orderbook.getDepth();
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: depth.bids,
                            asks: depth.asks
                        }
                    });
                }
                catch (err) {
                    console.log(err);
                    RedisManager_1.RedisManager.getInstance().sendToApi(clientId, {
                        type: "ERROR",
                        paylode: {
                            message: "Error occured while fetching depth",
                            error: err
                        }
                    });
                }
        }
    }
    createOrder(market, price, quantity, userId, side) {
        let orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            orderbook = new Orderbook_1.Orderbook(market.split('_')[0], [], [], 0, 140);
            this.orderbooks.push(orderbook);
        }
        const baseAsset = market.split('_')[0];
        const quoteAsset = market.split('_')[1];
        const order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            filled: 0,
            side,
            userId
        };
        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quantity, price);
        const { executedQty, Fills: fills } = orderbook.addOrder(order);
        this.updateBalance(fills, baseAsset, quoteAsset, side, executedQty, userId);
        this.updateDbOrders(order, executedQty, fills, market);
        this.createDbTrades(fills, market, userId, Number(price));
        this.publishWsTrades(fills, userId, market, Number(price));
        return { executedQty, fills, orderId: order.orderId };
    }
    addOrderBook(orderbook) {
        this.orderbooks.push(orderbook);
    }
    updateDbOrders(order, executedQty, fills, market) {
        RedisManager_1.RedisManager.getInstance().pushMessage({
            type: types_1.ORDER_ADD,
            data: {
                orderId: order.orderId,
                executedQty: executedQty,
                market: market,
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                side: order.side
            }
        });
        fills.forEach(fill => {
            RedisManager_1.RedisManager.getInstance().pushMessage({
                type: types_1.ORDER_UPDATE,
                data: {
                    market: market,
                    orderId: fill.markerOrderId,
                    executedQty: fill.quantity
                }
            });
        });
    }
    createDbTrades(fills, market, userId, price) {
        fills.forEach(fill => {
            RedisManager_1.RedisManager.getInstance().pushMessage({
                type: types_1.TRADE_ADDED,
                data: {
                    market: market,
                    id: fill.tradeId.toString(),
                    price: fill.price,
                    isBuyerMaker: parseFloat(fill.price) == price ? true : false,
                    quantity: fill.quantity.toString(),
                    quoteQuantity: (fill.quantity * Number(fill.price)).toString(),
                    timestamp: Date.now()
                }
            });
        });
    }
    publishWsTrades(fills, userId, market, price) {
        fills.forEach(fill => {
            RedisManager_1.RedisManager.getInstance().publishMessage(`trade.${market}`, {
                stream: `trade.${market}`,
                data: {
                    "e": "trade",
                    "s": market,
                    "p": fill.price,
                    "q": fill.quantity.toString(),
                    "m": parseFloat(fill.price) == price ? true : false,
                    "t": fill.tradeId
                }
            });
        });
    }
    updateBalance(fills, baseAsset, quoteAsset, side, executedQty, userId) {
        if (side == "buy") {
            fills.forEach(fill => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                // @ts-ignore
                (_a = this.balances.get(fill.otherUserId)) === null || _a === void 0 ? void 0 : _a[quoteAsset].available = ((_b = this.balances.get(fill.otherUserId)) === null || _b === void 0 ? void 0 : _b[quoteAsset].available) + (fill.quantity * fill.price);
                //@ts-ignore
                (_c = this.balances.get(userId)) === null || _c === void 0 ? void 0 : _c[quoteAsset].locked = ((_d = this.balances.get(userId)) === null || _d === void 0 ? void 0 : _d[quoteAsset].locked) - (fill.price * fill.quantity);
                //@ts-ignore
                (_e = this.balances.get(userId)) === null || _e === void 0 ? void 0 : _e[baseAsset].available = ((_f = this.balances.get(userId)) === null || _f === void 0 ? void 0 : _f[baseAsset].available) + fill.quantity;
                //@ts-ignore
                (_g = this.balances.get(fill.otherUserId)) === null || _g === void 0 ? void 0 : _g[baseAsset].locked = ((_h = this.balances.get(fill.otherUserId)) === null || _h === void 0 ? void 0 : _h[baseAsset].locked) - fill.quantity;
            });
        }
        else {
            fills.forEach(fill => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                // @ts-ignore
                (_a = this.balances.get(fill.otherUserId)) === null || _a === void 0 ? void 0 : _a[baseAsset].available = ((_b = this.balances.get(fill.otherUserId)) === null || _b === void 0 ? void 0 : _b[baseAsset].available) + fill.quantity;
                //@ts-ignore
                (_c = this.balances.get(userId)) === null || _c === void 0 ? void 0 : _c[baseAsset].locked = ((_d = this.balances.get(userId)) === null || _d === void 0 ? void 0 : _d[baseAsset].locked) - fill.quantity;
                //@ts-ignore
                (_e = this.balances.get(userId)) === null || _e === void 0 ? void 0 : _e[quoteAsset].available = ((_f = this.balances.get(userId)) === null || _f === void 0 ? void 0 : _f[quoteAsset].available) + (fill.quantity * fill.price);
                //@ts-ignore
                (_g = this.balances.get(fill.otherUserId)) === null || _g === void 0 ? void 0 : _g[quoteAsset].locked = ((_h = this.balances.get(fill.otherUserId)) === null || _h === void 0 ? void 0 : _h[quoteAsset].locked) - (fill.quantity * fill.price);
            });
        }
    }
    checkAndLockFunds(baseAsset, quoteAsset, side, userId, quantity, price) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        if (side == "buy") {
            if ((((_b = (_a = this.balances.get(userId)) === null || _a === void 0 ? void 0 : _a[quoteAsset]) === null || _b === void 0 ? void 0 : _b.available) || 0) < Number(quantity) * Number(price)) {
                throw new Error("Insufficient Asset");
            }
            // @ts-ignore
            (_d = (_c = this.balances.get(userId)) === null || _c === void 0 ? void 0 : _c[quoteAsset]) === null || _d === void 0 ? void 0 : _d.available -= Number(quantity) * Number(price);
            // @ts-ignore
            (_f = (_e = this.balances.get(userId)) === null || _e === void 0 ? void 0 : _e[quoteAsset]) === null || _f === void 0 ? void 0 : _f.locked += Number(quantity) * Number(price);
        }
        else {
            if ((((_h = (_g = this.balances.get(userId)) === null || _g === void 0 ? void 0 : _g[baseAsset]) === null || _h === void 0 ? void 0 : _h.available) || 0) < Number(quantity)) {
                throw new Error("Insufficient Asset");
            }
            // @ts-ignore
            (_k = (_j = this.balances.get(userId)) === null || _j === void 0 ? void 0 : _j[baseAsset]) === null || _k === void 0 ? void 0 : _k.available -= Number(quantity);
            // @ts-ignore
            (_m = (_l = this.balances.get(userId)) === null || _l === void 0 ? void 0 : _l[baseAsset]) === null || _m === void 0 ? void 0 : _m.locked += Number(quantity);
        }
    }
    onRamp(userId, amount) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            this.balances.set(userId, {
                BASE_CURRENCY: {
                    available: 0,
                    locked: 0
                }
            });
            userBalance[Orderbook_1.BASE_CURRENCY].available += Number(amount);
        }
    }
    setBaseBalances() {
        this.balances.set("1", {
            [Orderbook_1.BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "BTC": {
                available: 10000000,
                locked: 0
            },
            "SOL": {
                available: 10000000,
                locked: 0
            },
            "ETH": {
                available: 10000000,
                locked: 0
            },
            "UNI": {
                available: 10000000,
                locked: 0
            }
        });
        this.balances.set("2", {
            [Orderbook_1.BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "BTC": {
                available: 10000000,
                locked: 0
            },
            "SOL": {
                available: 10000000,
                locked: 0
            },
            "ETH": {
                available: 10000000,
                locked: 0
            },
            "UNI": {
                available: 10000000,
                locked: 0
            }
        });
        this.balances.set("5", {
            [Orderbook_1.BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "BTC": {
                available: 10000000,
                locked: 0
            },
            "SOL": {
                available: 10000000,
                locked: 0
            },
            "ETH": {
                available: 10000000,
                locked: 0
            },
            "UNI": {
                available: 10000000,
                locked: 0
            }
        });
    }
}
exports.Engine = Engine;
