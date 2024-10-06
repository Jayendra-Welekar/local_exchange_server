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
exports.tickerRouter = void 0;
const express_1 = require("express");
const __1 = require("..");
exports.tickerRouter = (0, express_1.Router)();
exports.tickerRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { symbol: market } = req.query;
    try {
        const query = `SELECT
     MIN(price) FILTER (WHERE time >= NOW() - INTERVAL '24 hours') AS "low",
     MAX(price) FILTER (WHERE time >= NOW() - INTERVAL '24 hours') AS "high",
     FIRST(price, time) FILTER (WHERE time >= NOW() - INTERVAL '24 hours') AS "firstPrice",
     LAST(price, time) FILTER (WHERE time >= NOW() - INTERVAL '24 hours') AS "lastPrice",
     LAST(price, time) - FIRST(price, time) FILTER (WHERE time >= NOW() - INTERVAL '24 hours') AS "priceChange",
     ROUND(CAST((LAST(price, time) - FIRST(price, time)) / FIRST(price, time) * 100 AS NUMERIC), 2) AS "priceChangePercent",
     SUM(volume) FILTER (WHERE time >= NOW() - INTERVAL '24 hours') AS "volume",
     SUM(volume * price) FILTER (WHERE time >= NOW() - INTERVAL '24 hours') AS "quoteVolume",
     COUNT(*) FILTER (WHERE time >= NOW() - INTERVAL '24 hours') AS "trades",
     '${market === null || market === void 0 ? void 0 : market.split("_")[0]}_prices' AS "symbol"
 FROM
     ${market === null || market === void 0 ? void 0 : market.split("_")[0]}_prices
 WHERE
     time >= NOW() - INTERVAL '24 hours';`;
        const response = yield __1.pgClient.query(query);
        res.json({ response: response.rows[0] });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ response: "Internal Server Error" });
    }
}));
