import { StringMappingType } from "typescript";
import { pgClient } from ".";
import { redisClient } from ".";

const market = ["BTC_USDC", "SOL_USDC", "ETH_USDC", "UNI_USDC", "LINK_USDC", "HNT_USDC"]

async function initializeDB(market: string){
    await pgClient.query(`
    
        DROP TABLE IF EXISTS ${market.split('_')[0]}_prices;
        CREATE TABLE ${market.split('_')[0]}_prices(
            time  TIMESTAMP WITH TIME ZONE NOT NULL,
            price DOUBLE PRECISION,
            volume DOUBLE PRECISION,
            currency_code VARCHAR(10),
            isbuyermaker BOOLEAN
        );

        SELECT create_hypertable('${market.split('_')[0]}_prices', 'time', 'price', 2);
        
    `)

    await pgClient.query(`
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
    `)

    await pgClient.query(`
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
    `)

    await pgClient.query(`
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
    `)
     await pgClient.query(`
    
        DROP TABLE IF EXISTS ${market.split('_')[0]}_orders;
        CREATE TABLE ${market.split('_')[0]}_orders(
            time  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            order_id VARCHAR(255) NOT NULL,
            executed_qty DOUBLE PRECISION,
            price DOUBLE PRECISION,
            quantity DOUBLE PRECISION,
            side VARCHAR(10)
        );
    `)


    console.log("Database initilised successfully")
}

market.forEach(mkt => {
    initializeDB(mkt).catch(console.error)
})