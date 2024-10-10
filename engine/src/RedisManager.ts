import { createClient, RedisClientType } from "redis";
import { ORDER_ADD, ORDER_UPDATE, TRADE_ADDED } from "./types";
import { WsMessage } from "./types/toWs";
import { MessageToApi } from "./types/toApi";

type DBMessasge = {
    type: typeof TRADE_ADDED,
    data: {
        id: string,
        isBuyerMaker: boolean,
        price: string,
        quantity: string,
        quoteQuantity: string,
        timestamp: number,
        market: string,
    }
} | {
    type: typeof ORDER_ADD,
    data: {
        orderId: string,
        executedQty: number,
        market?: string,
        price?: string,
        quantity? :string,
        side?: "buy" | "sell"
    }
} | {
    type: typeof ORDER_UPDATE,
    data: {
        orderId: string,
        executedQty: number,
        market: string,
    }
}

export class RedisManager{
    private client: RedisClientType
    private static instance: RedisManager

    constructor(){
        this.client = createClient()
        this.client.connect()
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager()
        }
        return this.instance
    }

    public pushMessage(message: DBMessasge){
        this.client.lPush("db_processor", JSON.stringify(message))
    }

    public publishMessage(channel: string, message: WsMessage){
        console.log("publishing message to channel", channel)
        this.client.publish(channel, JSON.stringify(message))
    }

    public sendToApi(clientId: string, message: MessageToApi){
        this.client.publish(clientId, JSON.stringify(message))
    }
}