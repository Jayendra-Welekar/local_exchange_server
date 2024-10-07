"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.pgClient = void 0;
const pg_1 = require("pg");
const redis_1 = require("redis");
exports.pgClient = new pg_1.Client({
    user: "your_user",
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432
});
exports.pgClient.connect();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        exports.redisClient = (0, redis_1.createClient)();
        yield exports.redisClient.connect();
        console.log("Connected to redis");
        while (true) {
            const response = yield exports.redisClient.rPop("db_processor");
            if (!response) {
            }
            else {
                const data = JSON.parse(response);
                if (data.type === "TRADE_ADDED") {
                    const price = data.data.price;
                    const timestamp = new Date(data.data.timestamp);
                    const volume = (parseFloat(data.data.quoteQuantity) * parseFloat(data.data.quantity)).toFixed(4);
                    const buyerMaker = data.data.isBuyerMaker;
                    const query = `INSERT INTO ${data.data.market.split('_')[0]}_prices (time, price, volume, isBuyerMaker) VALUES ($1, $2, $3, $4)`;
                    const values = [timestamp, price, volume, buyerMaker];
                    try {
                        yield exports.pgClient.query(query, values);
                    }
                    catch (error) {
                        console.log("error: ", error);
                    }
                }
                else if (data.type === "ORDER_ADD") {
                    const orderId = data.data.orderId;
                    const executedQty = data.data.executedQty;
                    const market = data.data.market || null;
                    const price = data.data.price || null;
                    const quantity = data.data.quantity || null;
                    const side = data.data.side || null;
                    const query = `INSERT INTO ${(market === null || market === void 0 ? void 0 : market.split('_')[0].toLowerCase()) || "sol"}_orders (order_id, executed_qty, price, quantity, side) VALUES ($1, $2, $3, $4, $5)`;
                    const values = [orderId, executedQty, price, quantity, side];
                    try {
                        yield exports.pgClient.query(query, values);
                    }
                    catch (error) {
                        console.log("error: ", error);
                    }
                }
                else {
                    const orderId = data.data.orderId;
                    const executedQty = data.data.executedQty;
                    const market = data.data.market;
                    const query = `UPDATE ${market === null || market === void 0 ? void 0 : market.split('_')[0].toLocaleLowerCase()}_orders SET executed_qty = $1 WHERE order_id = $2`;
                    const values = [executedQty, orderId];
                    try {
                        yield exports.pgClient.query(query, values);
                    }
                    catch (error) {
                        console.log("error: ", error);
                    }
                }
            }
        }
    });
}
main();
