import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { GET_DEPTH } from "../types";

export const depthRouter = Router()

depthRouter.get('/', async (req, res)=>{
    const { symbol: market } = req.query;

    try {
        const response = await RedisManager.getInstance().sendAndAwait({
            type: GET_DEPTH,
            data: {
                market: market as string
            }
        })
    
        res.json(response.payload)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})