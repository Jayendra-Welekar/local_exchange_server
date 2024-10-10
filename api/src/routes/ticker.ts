import { response, Router } from "express";
import { pgClient } from "..";
import { symbolName } from "typescript";

export const tickerRouter = Router()

tickerRouter.get('/', async (req, res)=>{

    const {symbol: market} = req.query as {symbol?: string};

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
     '${market?.split("_")[0]}_USDC' AS "symbol"
 FROM
     ${market?.split("_")[0]}_prices
 WHERE
     time >= NOW() - INTERVAL '24 hours';`
 
     const response = await pgClient.query(query)
 
    console.log("request for ticker from ", market)

    console.log(response.rows[0])


     res.json({data: response.rows[0]})
   } catch (error) {
    console.log(error)
    res.status(500).json({response: "Internal Server Error"})
   }
})