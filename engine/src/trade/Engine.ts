import { userInfo } from "os";
import { RedisManager } from "../RedisManager";
import { ORDER_ADD, ORDER_UPDATE, TRADE_ADDED } from "../types";
import { MessageFromApi } from "../types/fromApi";
import { CANCEL_ORDER, CREATE_ORDER, GET_BALANCE, GET_DEPTH, GET_OPEN_ORDERS, ON_RAMP } from "../types/toApi";
import { BASE_CURRENCY, Fill, Order, Orderbook } from "./Orderbook";
import fs from "fs"
import { availableMemory } from "process";
require('dotenv').config()

export interface UserBalance{
    [key: string]: {
        available: number,
        locked: number
    }
}
export class Engine {
    orderbooks: Orderbook[] = []
    balances: Map<string, UserBalance> = new Map()

    constructor(){
        let snapshot = null
        try {
            if(process.env.WITH_SNAPSHOT){
                snapshot = fs.readFileSync('./snapshot.json')
            } else {
                fs.writeFileSync('./snapshot.json', JSON.stringify({orderbooks: [], balances: []}))
            }
        } catch(e){
            console.log("No snapshot found")
        }

        if(snapshot){
            const snapShot = JSON.parse(snapshot.toString())
            this.orderbooks = snapShot.orderbooks.map((o: any) => new Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice))
            this.balances = new Map(snapShot.balances)
        } else {
            this.orderbooks = []
            this.saveSnapshot()
        }


        setInterval(()=>{
            this.saveSnapshot()
        }, 3000)
    }

    saveSnapshot(){
        const snapSnapShot = {
            orderbooks: this.orderbooks.map(o => o.getSnapshot()),
            balances: Array.from(this.balances.entries())
        }

        fs.writeFileSync("./snapshot.json", JSON.stringify(snapSnapShot))
    }


    process({message, clientId}: {message: MessageFromApi, clientId: string}){
        switch(message.type){
            case CREATE_ORDER:
                try {
                   const {executedQty, fills, orderId} = this.createOrder(message.data.market, message.data.price, message.data.quantity, message.data.userId, message.data.side);
                    
                   RedisManager.getInstance().sendToApi(clientId, {type: "ORDER_PLACED",
                    payload: {
                        orderId: orderId! as string,
                        executedQty: executedQty!.toString() as string,
                        fills: fills!.map(fill => {
                            return {
                                price: fill.price,
                                quantity: fill.quantity,
                                tradeId: fill.tradeId
                            }
                        }) as {price: string, quantity: number, tradeId: number}[]
                    }})
                } catch(err){
                    console.log(err)
                    RedisManager.getInstance().sendToApi(clientId, {type: "ORDER_CANCELED",
                        payload: {
                            orderId: "",
                            quantity: 0,
                            executedQty: 0
                        }
                     })
                }
                break;
            
            case CANCEL_ORDER:
                try{
                    const orderId = message.data.orderId
                    const market = message.data.market
                    const orderbook = this.orderbooks.find(o => o.ticker() === market)
                    const quoteAsset = market.split("_")[0]

                    if(!orderbook){
                        throw new Error("No orderbook found")
                    }

                    const order = orderbook.asks.find(ask => ask.orderId === orderId) || orderbook.bids.find(bid => bid.orderId === orderId)

                    if(!order){
                        throw new Error("No order found")
                    }

                    if(order.side === "buy"){

                        const price = orderbook.cancelBid(order)
                        const leftQuantity = (order.quantity - order.filled)*(order.price)

                        this.balances.get(order.userId)![BASE_CURRENCY].available +=  leftQuantity

                        this.balances.get(order.userId)![BASE_CURRENCY].locked -= leftQuantity

                        RedisManager.getInstance().sendToApi(clientId, {
                            type: "ORDER_CANCELED", 
                            payload: {
                                orderId, 
                                quantity: order.quantity*order.price,
                                executedQty: order.filled*order.price
                            }
                        })

                    } else {

                        const price = orderbook.cancelAsk(order)
                        const leftQuantity = (order.quantity - order.filled)

                        this.balances.get(order.userId)![quoteAsset].available += leftQuantity
                        this.balances.get(order.userId)![quoteAsset].locked -= leftQuantity



                        RedisManager.getInstance().sendToApi(clientId, {
                            type: "ORDER_CANCELED",
                            payload: {
                                orderId,
                                quantity: order.quantity,
                                executedQty: order.filled
                            }
                        })

                    }

                    

                } catch(err){
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ERROR",
                        paylode: {
                            message: "Error occured while cancelling the order",
                            error: err as Error
                        }
                    })
                }
                break;
            
            case GET_OPEN_ORDERS:
                try{
                    const {market, userId} = message.data
                    const orderbook = this.orderbooks.find(o => o.ticker() === market)

                    if(!orderbook){
                        console.log("Orderbook not found")
                        throw new Error("No orderbook found")
                    }

                    const orders = orderbook.getOpenOrders(userId)

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: orders
                    })
                } catch(err ){
                    
                    console.log(err)

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ERROR",
                        paylode: {
                            message: "Error occured while Getting open orders",
                            error: err as Error
                        }
                    })

                }
                break;

            case ON_RAMP:
                try {
                    const userId = message.data.userId
                    const amount = message.data.amount
                    const currencyBalance =  this.onRamp(userId, amount)
                    if(currencyBalance === null){
                      RedisManager.getInstance().sendToApi(clientId, {
                        type: "RAMP",
                        payload: {
                            status: "FAILURE",
                            balance: null
                        }
                      }  )
                    }
                    console.log("Ramp successfull")
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "RAMP",
                        payload: {
                            status: "SUCCESS",
                            balance : currencyBalance
                        }
                    }) 
                } catch (err) {
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ERROR",
                        paylode: {
                            message: "Error occured while Ramping",
                            error: err as Error
                        }
                    })
                }
                break;
            
            case GET_DEPTH:
                try{
                    const market = message.data.market
                    const orderbook = this.orderbooks.find(o => o.ticker() === market)
                    if(!orderbook){
                        throw new Error("No orderbook found")
                    }
                    const depth = orderbook.getDepth()
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: depth.bids,
                            asks: depth.asks
                        }
                    })
                } catch(err){
                    console.log(err)
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ERROR",
                        paylode: {
                            message: "Error occured while fetching depth",
                            error: err as Error
                        }
                    })
                }
            case GET_BALANCE: 
                try{
                    if('userId' in message.data){
                        const userId = message.data.userId
                        let usersBalance = this.balances.get(userId)
                        if(!usersBalance){
                            this.setBaseBalances(message.data.userId)
                            usersBalance  = this.balances.get(userId) 
                        }

                        const returnBalance : {
                            [key: string]: {
                                available: string,
                                locked: string
                            }
                        } = {}
                        
                        if(usersBalance){
                            Object.keys(usersBalance).forEach(key => {
                                const balance = {
                                    available: usersBalance[key].available.toString(),
                                    locked: usersBalance[key].locked.toString()
                                }
                                returnBalance[key] = balance
                            });
                        }

                        if (returnBalance) {
                            console.log("returningin", returnBalance)
                            return RedisManager.getInstance().sendToApi(clientId, {
                                type: "BALANCE",
                                payload: returnBalance
                            });
                        } else {
                            throw new Error("Invalid user balance structure");
                        }

                    } else {
                        throw new Error("No userId provided")
                    }
                } catch(err){
                    return RedisManager.getInstance().sendToApi(clientId, {
                        type: "BALANCE",
                        payload: {}
                    })
                }
        }

    }

    createOrder(market: string, price: string, quantity: string, userId: string, side: "buy" | "sell"){

        let orderbook = this.orderbooks.find(o => o.ticker() === market);
        if(!orderbook){
            orderbook = new Orderbook(market.split('_')[0], [], [], 0, 140)
            this.orderbooks.push(orderbook)
        }
        const baseAsset = market.split('_')[0]
        const quoteAsset = market.split('_')[1]
        const order: Order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            filled: 0,
            side,
            userId
        }


        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quantity, price)
        const { executedQty, Fills: fills } = orderbook.addOrder(order);
    
        this.updateBalance(fills, baseAsset, quoteAsset, side, executedQty, userId)
        this.updateDbOrders(order, executedQty, fills, market)
        this.createDbTrades(fills, market, userId, Number(price))
        this.publishWsTrades(fills, userId, market, Number(price))
        return {executedQty, fills, orderId: order.orderId}
    }   

    addOrderBook(orderbook: Orderbook){
        this.orderbooks.push(orderbook)
    }

    updateDbOrders(order: Order, executedQty: number, fills: Fill[], market: string){
        RedisManager.getInstance().pushMessage({
            type: ORDER_ADD,
            data: {
                orderId: order.orderId,
                executedQty: executedQty,
                market: market,
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                side: order.side
            }
        })

        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: ORDER_UPDATE,
                data: {
                    market: market,
                    orderId: fill.markerOrderId,
                    executedQty: fill.quantity
                }
            })
        })
    }

    createDbTrades(fills: Fill[], market: string, userId: string, price: number){
        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: TRADE_ADDED,
                data: {
                    market: market,
                    id: fill.tradeId.toString(),
                    price: fill.price ,
                    isBuyerMaker: parseFloat(fill.price) == price ? true: false,
                    quantity: fill.quantity.toString(),
                    quoteQuantity: (fill.quantity * Number(fill.price)).toString(),
                    timestamp: Date.now()
                }
            })
        })
    }

    publishWsTrades(fills: Fill[], userId: string, market: string, price: number){
        fills.forEach(fill => {
            RedisManager.getInstance().publishMessage(`trade.${market}`, {
                stream: `trade.${market}`,
                data: {
                    "e": "trade",
                    "s": market,
                    "p": fill.price,
                    "q": fill.quantity.toString(),
                    "m": parseFloat(fill.price) == price ? true: false,
                    "t": fill.tradeId
                }
            })
        })
    }

    updateBalance(fills: Fill[], baseAsset: string, quoteAsset: string, side: "buy" | "sell", executedQty: number, userId: string){
        if(side == "buy"){
            fills.forEach(fill => {
                // @ts-ignore
                this.balances.get(fill.otherUserId)?.[quoteAsset].available = this.balances.get(fill.otherUserId)?.[quoteAsset].available + (fill.quantity * fill.price)
                
                //@ts-ignore
                this.balances.get(userId)?.[quoteAsset].locked = this.balances.get(userId)?.[quoteAsset].locked - (fill.price* fill.quantity)
            
                //@ts-ignore
                this.balances.get(userId)?.[baseAsset].available = this.balances.get(userId)?.[baseAsset].available + fill.quantity;
            
                //@ts-ignore
                this.balances.get(fill.otherUserId)?.[baseAsset].locked = this.balances.get(fill.otherUserId)?.[baseAsset].locked - fill.quantity;
            })
        } else {
            fills.forEach(fill => {
                // @ts-ignore
                this.balances.get(fill.otherUserId)?.[baseAsset].available = this.balances.get(fill.otherUserId)?.[baseAsset].available + fill.quantity 
                
                //@ts-ignore
                this.balances.get(userId)?.[baseAsset].locked = this.balances.get(userId)?.[baseAsset].locked - fill.quantity
            
                //@ts-ignore
                this.balances.get(userId)?.[quoteAsset].available = this.balances.get(userId)?.[quoteAsset].available + (fill.quantity*fill.price);
            
                //@ts-ignore
                this.balances.get(fill.otherUserId)?.[quoteAsset].locked = this.balances.get(fill.otherUserId)?.[quoteAsset].locked -( fill.quantity*fill.price);
            })
        }
    }

    checkAndLockFunds(baseAsset: string, quoteAsset: string, side: "buy" | "sell", userId: string, quantity: string, price: string){
        if(side == "buy"){
            if((this.balances.get(userId)?.[quoteAsset]?.available || 0) < Number(quantity)*Number(price)){
                throw new Error("Insufficient Asset")
            }
            // @ts-ignore
            this.balances.get(userId)?.[quoteAsset]?.available -=   Number(quantity)*Number(price);
            // @ts-ignore
            this.balances.get(userId)?.[quoteAsset]?.locked += Number(quantity)*Number(price)

        } else {

            if((this.balances.get(userId)?.[baseAsset]?.available || 0) < Number(quantity)){
                throw new Error("Insufficient Asset")
            }
            // @ts-ignore
            this.balances.get(userId)?.[baseAsset]?.available -= Number(quantity)
            // @ts-ignore
            this.balances.get(userId)?.[baseAsset]?.locked += Number(quantity)
        }
    } 

    onRamp(userId: string, amount: string){
  
            let userBalance = this.balances.get(userId)
            if(!userBalance){
                this.balances.set(userId, {
                    BASE_CURRENCY : {
                        available: 0,
                        locked: 0
                    }
                })
                userBalance = this.balances.get(userId)
            }
            if(!userBalance){
                return null
            }
            userBalance![BASE_CURRENCY].available += Number(amount)
            return userBalance![BASE_CURRENCY].available.toString()
    }

    setBaseBalances(userId: string) {
        this.balances.set(userId, {
            [BASE_CURRENCY]: {
                available: 10000000,
                locked: 0
            },
            "BTC": {
                available: 10000000,
                locked: 0
            },
            "SOL": {
                available: 10000000,
                locked: 0
            },
            "ETH": {
                available: 10000000,
                locked: 0
            },
            "UNI": {
                available: 10000000,
                locked: 0
            },
            "HNT": {
                available: 10000000,
                locked: 0
            }
        });
    }
}   