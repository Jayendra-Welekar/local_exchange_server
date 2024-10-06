import { Client } from "pg";

const pgClient = new Client({
    user: "your_user",
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432
})

pgClient.connect();

const market = ["BTC_USDC", "SOL_USDC", "ETH_USDC", "UNI_USDC", "LINK_USDC", "HNT_USDC"]

async function refreshMaterializeView (mkt: string){
    await pgClient.query(`REFRESH MATERIALIZED VIEW ${mkt}_klines_1m`)
    await pgClient.query(`REFRESH MATERIALIZED VIEW ${mkt}_klines_1h`)
    await pgClient.query(`REFRESH MATERIALIZED VIEW ${mkt}_klines_1w`)

    console.log(`Refreshed Materialized view for ${mkt}`)
}


setInterval(()=>{

    market.forEach(mkt => {
        refreshMaterializeView(mkt)
    })

}, 1000 * 10)