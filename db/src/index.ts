import {Client} from "pg"
import { createClient } from "redis"
import { DbMessage } from "./types"
import { RedisClientType } from "@redis/client";


export const pgClient = new Client({
    user: "your_user",
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432
})
export let redisClient: RedisClientType;
pgClient.connect()

async function main(){

    redisClient = createClient()
    await redisClient.connect()
    console.log("Connected to redis")

    while(true){
        const response = await redisClient.rPop("db_processor" as string)

        if(!response){

        } else {
            const data: DbMessage = JSON.parse(response)
            if(data.type === "TRADE_ADDED"){
                const price = data.data.price
                const timestamp = new Date(data.data.timestamp)
                const volume =( parseFloat(data.data.quoteQuantity) * parseFloat(data.data.quantity)).toFixed(4)
                const buyerMaker = data.data.isBuyerMaker
                const query = `INSERT INTO ${data.data.market.split('_')[0]}_prices (time, price, volume, isBuyerMaker) VALUES ($1, $2, $3, $4)`
                const values = [timestamp, price, volume, buyerMaker]

                try {
                    await pgClient.query(query, values)
                    
                } catch (error) {
                    console.log("error: ", error)
                }
                
            } else if(data.type === "ORDER_ADD"){
                const orderId =   data.data.orderId
                const executedQty = data.data.executedQty
                const market =  data.data.market || null
                const price = data.data.price || null
                const quantity = data.data.quantity || null
                const side = data.data.side || null
                
                const query = `INSERT INTO ${market?.split('_')[0].toLowerCase() || "sol"}_orders (order_id, executed_qty, price, quantity, side) VALUES ($1, $2, $3, $4, $5)`
                const values = [orderId, executedQty, price, quantity, side]

                try {
                    await pgClient.query(query, values)
                } catch (error) {
                    console.log("error: ", error)
                }
                
            }  else {

                const orderId =   data.data.orderId
                const executedQty = data.data.executedQty
                const market =  data.data.market
                const query = `UPDATE ${market?.split('_')[0].toLocaleLowerCase()}_orders SET executed_qty = $1 WHERE order_id = $2`
                const values = [executedQty, orderId]

                try {
                    await pgClient.query(query, values)
                } catch (error) {
                    console.log("error: ", error)
                }
            }
            
        }
    }

}

main()