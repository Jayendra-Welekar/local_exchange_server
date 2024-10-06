import { Router } from "express";
import { pgClient } from "..";

export const klineRouter = Router()

klineRouter.get('/', async (req, res)=>{
    const {symbol, interval, startTime, endTime} = req.query
    const market = symbol as string

    const query = `SELECT 
    bucket AS time,
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
    time DESC
LIMIT 100; `
    
    const values = [startTime, endTime]

    try {
        const response = await pgClient.query(query, values)    
        res.json({data: response.rows})
    } catch (error) {
        res.status(404).json({data: []});
    }
})