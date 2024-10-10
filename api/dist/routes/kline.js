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
exports.klineRouter = void 0;
const express_1 = require("express");
const __1 = require("..");
exports.klineRouter = (0, express_1.Router)();
exports.klineRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { symbol, interval, startTime, endTime } = req.query;
    const market = symbol;
    const query = `SELECT 
    bucket AS start,
    CASE
        WHEN $3 = '1m' THEN bucket + INTERVAL '1 minute' - INTERVAL '1 second'
        WHEN $3 = '1h' THEN bucket + INTERVAL '1 hour' - INTERVAL '1 second'
        WHEN $3 = '1d' THEN bucket + INTERVAL '1 day' - INTERVAL '1 second'
        ELSE bucket  
    END AS end,
    open,
    high,
    low,
    close,
    volume,
    currency_code
FROM 
    ${market}_kline_${interval}
WHERE 
    bucket >= TO_TIMESTAMP($1::BIGINT / 1000) AND bucket <= TO_TIMESTAMP($2::BIGINT / 1000)
ORDER BY 
    start DESC
LIMIT 100;
`;
    const values = [startTime, endTime, interval];
    try {
        const response = yield __1.pgClient.query(query, values);
        console.log("Rseponse for klines: ", response.rows);
        res.json({ data: response.rows });
    }
    catch (error) {
        console.log("Error while fetching klines: ", error);
        res.status(404).json({ data: [] });
    }
}));
