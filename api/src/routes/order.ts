import { Router } from "express";
import {  RedisManager } from "../RedisManager";
import { CANCEL_ORDER, CREATE_ORDER, GET_OPEN_ORDERS } from "../types";

export const orderRouter = Router()

orderRouter.post('/', async (req, res)=>{
    const {market, price, quantity, side, userId} = req.body

   try {
     const response = await RedisManager.getInstance().sendAndAwait({
         type: CREATE_ORDER,
         data: {
             market, 
             price,
             quantity,
             userId,
             side
         }
     })
 
     res.json(response.payload)
   } catch (error) {
    console.log(error)
    res.status(404).json([])
   }
})

orderRouter.delete('/', async (req, res)=>{
    const {market, orderId} = req.query as {market: string, orderId: string}

   try {
     const response = await RedisManager.getInstance().sendAndAwait({
         type: CANCEL_ORDER,
         data: {
             market,
             orderId
         }
     })
 
     res.json(response.payload)
   } catch (error) {
     console.log(error)
     res.status(404).json([])
   }
})

orderRouter.get('/open', async (req, res)=>{
    const {market, userId} = req.query as {market: string, userId: string}

    try {
        const response = await RedisManager.getInstance().sendAndAwait({
            type: GET_OPEN_ORDERS,
            data: {
                market,
                userId
            }
        })
        console.log("response: ", response)
        res.json(response.payload)
    } catch (error) {
        console.log(error)
        res.status(404).json([])
    }
})