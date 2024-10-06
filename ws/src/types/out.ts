export type TickerMessage = {
    "e": string,          // Event type
  "E": number,  // Event time in microseconds
  "s": string,         // Symbol
  "o": string,           // First price
  "c": string,           // Last price
  "h": string,           // High price
  "l": string,           // Low price
  "v": string,           // Base asset volume
  "V": string,          // Quote asset volume
  "n": number              // Number of trades
}

export type TradeMessage = {
    "e": string,                   // Event type
  "E": number,          // Event time in microseconds
  "s": string,                // Symbol
  "p": string,                   // Price
  "q": string,                   // Quantity
  "b": string,      // Buyer order ID
  "a": string,      // Seller order ID
  "t": number,                     // Trade ID
  "T": number,          // Engine timestamp in microseconds
  "m": boolean   
}

export type OutgoingMessage = TickerMessage | TradeMessage