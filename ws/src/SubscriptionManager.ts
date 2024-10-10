import { RedisClientType } from "@redis/client"
import { createClient } from "redis"
import { UserManager } from "./Usermanager"

export class SubscriptionManager{

    public static instance: SubscriptionManager
    private redisClient: RedisClientType
    private subscription: Map<string, string[]> = new Map()
    private reverseSubscription: Map<string, string[]> = new Map()


    constructor(){
        this.redisClient = createClient()
        this.redisClient.connect()
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new SubscriptionManager()
        }
        return this.instance
    }

    public subscribe(userId: string, subscription: string){

        if(this.subscription.get(userId)?.includes(subscription)){
            return 
        }

        this.subscription.set(userId, ((this.subscription.get(userId) || []) ?.concat(subscription)))
        this.reverseSubscription.set(subscription, ((this.reverseSubscription.get(subscription) || []).concat(userId)))

        if(this.reverseSubscription.get(subscription)?.length === 1){
            this.redisClient.subscribe(subscription, this.redisCallbackHandler)
        }

    }


    public unsubscribe(userId: string, subscription: string){

        const subscriptions = this.subscription.get(userId)

        if(!subscriptions || subscriptions.length === 0){
            return
        }

        this.subscription.set(userId, subscriptions.filter(channel => channel != subscription))
        
        this.reverseSubscription.set(subscription, this.reverseSubscription.get(subscription)?.filter(uid => uid != userId) || [])

        if(this.reverseSubscription.get(subscription)?.length === 0){
            this.reverseSubscription.delete(subscription)
            this.redisClient.unsubscribe(subscription);
        }

    }

    private redisCallbackHandler = (message: string, channel: string)=>{
        console.log( `Received message on channel ${channel}: ${message}`)
        const parsedMessage = JSON.parse(message)
        this.reverseSubscription.get(channel)?.forEach(user => UserManager.getInstance().getUser(user)?.emit(parsedMessage))
    }

    public userLeft(userId: string){
        this.subscription.get(userId)?.forEach(channel => this.unsubscribe(userId, channel))
    }

    getSubscriptions(userId: string){
        return this.subscription.get(userId) || []
    }
}