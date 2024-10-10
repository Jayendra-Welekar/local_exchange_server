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
exports.orderRouter = void 0;
const express_1 = require("express");
const RedisManager_1 = require("../RedisManager");
const types_1 = require("../types");
exports.orderRouter = (0, express_1.Router)();
exports.orderRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { market, price, quantity, side, userId } = req.body;
    try {
        const response = yield RedisManager_1.RedisManager.getInstance().sendAndAwait({
            type: types_1.CREATE_ORDER,
            data: {
                market,
                price,
                quantity,
                userId,
                side
            }
        });
        res.json(response.payload);
    }
    catch (error) {
        console.log(error);
        res.status(404).json([]);
    }
}));
exports.orderRouter.delete('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { market, orderId } = req.query;
    try {
        const response = yield RedisManager_1.RedisManager.getInstance().sendAndAwait({
            type: types_1.CANCEL_ORDER,
            data: {
                market,
                orderId
            }
        });
        res.json(response.payload);
    }
    catch (error) {
        console.log(error);
        res.status(404).json([]);
    }
}));
exports.orderRouter.get('/open', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { market, userId } = req.query;
    try {
        const response = yield RedisManager_1.RedisManager.getInstance().sendAndAwait({
            type: types_1.GET_OPEN_ORDERS,
            data: {
                market,
                userId
            }
        });
        console.log("response: ", response);
        res.json(response.payload);
    }
    catch (error) {
        console.log(error);
        res.status(404).json([]);
    }
}));
