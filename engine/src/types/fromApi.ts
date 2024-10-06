import { CANCEL_ORDER, CREATE_ORDER, GET_DEPTH, GET_OPEN_ORDERS, ON_RAMP } from "./toApi"

export type MessageFromApi = {
    type: typeof CREATE_ORDER,
    data: {
        market: string,
        userId: string,
        price: string,
        quantity: string,
        side: "buy" | "sell",
    }
} | {
    type :typeof CANCEL_ORDER,
    data: {
        market: string,
        orderId: string
    }
} | {
    type: typeof GET_DEPTH,
    data: {
        market: string
    }
} | {
    type: typeof ON_RAMP,
    data: {
        userId: string,
        amount: string,
        txnId: string
    }
} | {
    type: typeof GET_OPEN_ORDERS,
    data: {
        market: string,
        userId: string
    }
}