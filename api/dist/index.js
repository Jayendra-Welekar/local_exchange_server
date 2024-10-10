"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pgClient = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pg_1 = require("pg");
const trades_1 = require("./routes/trades");
const order_1 = require("./routes/order");
const depth_1 = require("./routes/depth");
const ticker_1 = require("./routes/ticker");
const kline_1 = require("./routes/kline");
const balance_1 = require("./routes/balance");
exports.pgClient = new pg_1.Client({
    user: "your_user",
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432
});
exports.pgClient.connect();
const app = (0, express_1.default)();
const PORT = 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/v1/order', order_1.orderRouter);
app.use('/api/v1/trade', trades_1.tradeRouter);
app.use('/api/v1/depth', depth_1.depthRouter);
app.use('/api/v1/ticker', ticker_1.tickerRouter);
app.use('/api/v1/kline', kline_1.klineRouter);
app.use('/api/v1/balance', balance_1.balanceRouter);
app.listen(PORT, () => {
    console.log("Listening on port: ", PORT);
});
