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
const pg_1 = require("pg");
const pgClient = new pg_1.Client({
    user: "your_user",
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432
});
pgClient.connect();
const market = ["BTC_USDC", "SOL_USDC", "ETH_USDC", "UNI_USDC", "LINK_USDC", "HNT_USDC"];
function refreshMaterializeView(mkt) {
    return __awaiter(this, void 0, void 0, function* () {
        yield pgClient.query(`REFRESH MATERIALIZED VIEW ${mkt}_klines_1m`);
        yield pgClient.query(`REFRESH MATERIALIZED VIEW ${mkt}_klines_1h`);
        yield pgClient.query(`REFRESH MATERIALIZED VIEW ${mkt}_klines_1w`);
        console.log(`Refreshed Materialized view for ${mkt}`);
    });
}
setInterval(() => {
    market.forEach(mkt => {
        refreshMaterializeView(mkt);
    });
}, 1000 * 10);
