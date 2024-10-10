import { Order } from "../trade/Orderbook"

export const CREATE_ORDER = "CREATE_ORDER"
export const GET_DEPTH = "GET_DEPTH"
export const ON_RAMP = "ON_RAMP"
export const CANCEL_ORDER = "CANCEL_ORDER"
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS"
export const GET_BALANCE = "GET_BALANCE"

export type MessageToApi = {
    type: "DEPTH",
    payload: {
        bids: [string, string][]
        asks: [string, string][]
    }
} | {
    type: "ORDER_PLACED",
    payload: {
        orderId: string,
        executedQty: string,
        fills: {
            price: string,
            quantity: number,
            tradeId: number
        }[]
    }
} | {
    type: "ORDER_CANCELED",
    payload: {
        orderId: string,
        quantity: number,
        executedQty: number,
    }
} | {
    type: "OPEN_ORDERS",
    payload: Order[]
} | {
    type: "ERROR",
    paylode: {
        message: string,
        error: Error
    }
} | {
    type: "BALANCE",
    payload: {
        [key: string]: {
            available: string,
            locked: string
        }
    }
} | {
    type: "RAMP",
    payload: {
        status: "SUCCESS" | "FAILURE",
        balance: string | null
    }
}