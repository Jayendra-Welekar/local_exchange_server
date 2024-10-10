import { Router } from "express";
import { pgClient } from "..";

export const klineRouter = Router()

klineRouter.get('/', async (req, res)=>{
    const {symbol, interval, startTime, endTime} = req.query
    const market = symbol as string

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
`
    
    const values = [startTime, endTime, interval]

    try {
        const response = await pgClient.query(query, values)    

        console.log("Rseponse for klines: ", response.rows)
        res.json({data: response.rows})
    } catch (error) {
        console.log("Error while fetching klines: ", error)
        res.status(404).json({data: []});
    }
})