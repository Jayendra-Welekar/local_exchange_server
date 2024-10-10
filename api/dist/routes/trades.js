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
exports.tradeRouter = void 0;
const express_1 = require("express");
const __1 = require("..");
exports.tradeRouter = (0, express_1.Router)();
exports.tradeRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { symbol: market } = req.query;
    console.log("Requested market: ", market);
    try {
        const query = `SELECT 
        isbuyermaker AS isBuyerMaker,
        price,
        volume AS quantity,
        volume AS quoteQuantity,
        time as timestamp
        FROM ${market.split('_')[0]}_prices ORDER BY time DESC LIMIT 100`;
        const result = yield __1.pgClient.query(query);
        console.log(result.rows[0]);
        res.json({ data: result.rows });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
