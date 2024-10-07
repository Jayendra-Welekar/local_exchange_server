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
const _1 = require(".");
const market = ["BTC_USDC", "SOL_USDC", "ETH_USDC", "UNI_USDC", "LINK_USDC", "HNT_USDC"];
function initializeDB(market) {
    return __awaiter(this, void 0, void 0, function* () {
        yield _1.pgClient.query(`
    
        DROP TABLE IF EXISTS ${market.split('_')[0]}_prices;
        CREATE TABLE ${market.split('_')[0]}_prices(
            time  TIMESTAMP WITH TIME ZONE NOT NULL,
            price DOUBLE PRECISION,
            volume DOUBLE PRECISION,
            currency_code VARCHAR(10)
        );

        SELECT create_hypertable('${market.split('_')[0]}_prices', 'time', 'price', 2);
        
    `);
        yield _1.pgClient.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${market}_kline_1m AS 
        SELECT  
            time_bucket('1 minute', time) AS bucket,
            first(price, time) AS open,
            max(price) AS high,
            min(price) AS low,
            last( price, time) AS close,
            sum(volume) AS volume,
            currency_code
        FROM ${market.split('_')[0]}_prices
        GROUP BY bucket, currency_code;
    `);
        yield _1.pgClient.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${market}_kline_1h AS 
        SELECT  
            time_bucket('1 hour', time) AS bucket,
            first(price, time) AS open,
            max(price) AS high,
            min(price) AS low,
            last( price, time) AS close,
            sum(volume) AS volume,
            currency_code
        FROM ${market.split('_')[0]}_prices
        GROUP BY bucket, currency_code;
    `);
        yield _1.pgClient.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${market}_kline_1w AS 
        SELECT  
            time_bucket('1 week', time) AS bucket,
            first(price, time) AS open,
            max(price) AS high,
            min(price) AS low,
            last( price, time) AS close,
            sum(volume) AS volume,
            currency_code
        FROM ${market.split('_')[0]}_prices
        GROUP BY bucket, currency_code;
    `);
        yield _1.pgClient.query(`
    
        DROP TABLE IF EXISTS ${market.split('_')[0]}_orders;
        CREATE TABLE ${market.split('_')[0]}_orders(
            time  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            order_id VARCHAR(255) NOT NULL,
            executed_qty DOUBLE PRECISION,
            price DOUBLE PRECISION,
            quantity DOUBLE PRECISION,
            side VARCHAR(10)
        );

        
        
    `);
        console.log("Database initilised successfully");
    });
}
market.forEach(mkt => {
    initializeDB(mkt).catch(console.error);
});
