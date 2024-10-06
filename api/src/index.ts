import express from "express"
import cors from "cors"

import {Client} from "pg"
import { tradeRouter } from "./routes/trades"
import { orderRouter } from "./routes/order"
import { depthRouter } from "./routes/depth"
import { tickerRouter } from "./routes/ticker"
import { klineRouter } from "./routes/kline"

export const pgClient = new Client({
    user: "your_user",
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432
})

pgClient.connect()
const app = express()
const PORT = 3000
app.use(cors())
app.use(express.json())

app.use('/api/v1/order', orderRouter)
app.use('/api/v1/trade', tradeRouter)
app.use('/api/v1/depth', depthRouter)
app.use('/api/v1/ticker', tickerRouter)
app.use('/api/v1/kline', klineRouter)

app.listen(PORT, ()=>{
    console.log("Listening on port: ", PORT)
})