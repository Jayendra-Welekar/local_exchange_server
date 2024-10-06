import { response, Router } from "express";
import { pgClient } from "..";
export const tradeRouter = Router()



tradeRouter.get('/', async (req, res)=>{
    const { symbol: market }  = req.query as {symbol?: string};

    const query = `SELECT * FROM ${market!.split('_')[0]}_prices ORDER BY time DESC LIMIT 100`;
    const result = await pgClient.query(query)

    res.json({data: result.rows})
})