import { response, Router } from "express";
import { pgClient } from "..";
export const tradeRouter = Router()



tradeRouter.get('/', async (req, res)=>{
    const { symbol: market }  = req.query as {symbol?: string};
    console.log("Requested market: ", market)

    try {
        const query = `SELECT 
        isbuyermaker AS isBuyerMaker,
        price,
        volume AS quantity,
        volume AS quoteQuantity,
        time as timestamp
        FROM ${market!.split('_')[0]}_prices ORDER BY time DESC LIMIT 100`;
        const result = await pgClient.query(query)
        console.log(result.rows[0])
        res.json({data: result.rows})
    } catch (error) {
        res.status(500).json({error: "Internal Server Error"})
    }
})