import { SubscriptionManager } from "./SubscriptionManager"
import { IncomingMessage } from "./types/in"
import { OutgoingMessage } from "./types/out"
import WebSocket from "ws"

export class User {
    private id: string
    private ws: WebSocket

    constructor(id: string, ws: WebSocket){
        this.id = id
        this.ws = ws
        this.addListeners()
    }

    private subscriptions: string[] = []

    public subscribe(subscription: string){
        if(!this.subscriptions.includes(subscription)){
            this.subscriptions.push(subscription)
        }
    }

    public unsubscribe(subscriptions: string){
        if(this.subscriptions.includes(subscriptions)){
            this.subscriptions.filter(s => s != subscriptions)
        }
    }


    emit(message: OutgoingMessage){
        console.log("Emmiting message: ", message)
        this.ws.send(JSON.stringify(message))
    }

    private addListeners(){
        this.ws.on("message", (message: string)=>{
            const parsedMessage: IncomingMessage = JSON.parse(message)
            console.log(parsedMessage)
            if(parsedMessage.method === "SUBSCRIBE"){
                parsedMessage.params.forEach((channel: string) => {
                    console.log("Subscribing to channel: ", channel)
                    SubscriptionManager.getInstance().subscribe(this.id, channel)
                })
            }
            if(parsedMessage.method === "UNSUBSCRIBE"){
                parsedMessage.params.forEach((channel: string) => {
                    console.log("Unsubscribing from channel: ", channel)
                    SubscriptionManager.getInstance().unsubscribe(this.id, channel)
                })
            }
        })

    }
}