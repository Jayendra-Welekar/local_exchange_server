export const CREATE_ORDER = "CREATE_ORDER"
export const CANCEL_ORDER = "CANCEL_ORDER"
export const ON_RAMP = "ON_RAMP"
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS"
export const GET_DEPTH = "GET_DEPTH"
export const GET_BALANCE = "GET_BALANCE"

export type MessageFromOrderBook = {
    type: "DEPTH",
    payload: {
        market: string,
        bids: [string, string][],
        asks: [string, string][]
    }
}  | {
    type: "ORDER_PLACED",
    payload: {
        orderId: string,
        executedQty: string,
        fills: [
            {
                price: string,
                quantity: number,
                tradeId: string
            }
        ]
    }
} | {
    type: "ORDER_CANCELED",
    payload: {
        orderid: string, 
        executedQty: number,
        remainingQty: number
    }
} | {
    type: "OPEN_ORDERS",
    payload: {
        orderId: string,
        executedQty: number,
        price: string,
        quantity: string,
        side: "buy" | "sell",
        userId: string
    }[]
} | {
    type: "BALANCE",
    payload: {
        [key: string]: {
            available: string,
            locked :string
        }
    }
} | {
    type: "RAMP",
    payload: {
        status: "SUCCESS" | "FAILURE",
        balance: string | null
    }
}