import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { GET_BALANCE } from "../types";


export const balanceRouter = Router()
balanceRouter.get('/', async (req, res) => {
    const {userId} = req.query as {userId: string};
    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_BALANCE,
        data: {userId}
    })
    const data = response.payload
    res.json(data)
})

balanceRouter.post('/onRamp', async (req, res)=>{
    const {userId, amount} = req.body as {userId: string, amount: string}
    const response = await RedisManager.getInstance().sendAndAwait({
        type: 'ON_RAMP',
        data: {userId, amount}
    })
    
    const responsePayload: {status: string, balance: string} = response.payload as {status: string, balance: string}

    const data = responsePayload
    console.log(data)

    if(data.status === 'SUCCESS'){
        res.status(200).json({balance: data.balance})
    } else{
        res.status(400).json({balance: "-1"})
    }    
})

