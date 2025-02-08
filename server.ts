import express, { Request, Response } from "express";
import { json } from "body-parser";
import { FixClient } from "./connect";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

interface MarketDataSubscription {
  symbol: string;
  client: FixClient;
}

const app = express();
app.use(json());

app.use(cors());

const activeSubscriptions: Map<string, MarketDataSubscription> = new Map();

function createFixClient(): FixClient {
  return new FixClient(
    process.env.FIX_MD_HOST || "",
    Number(process.env.FIX_MD_PORT) || 0,
    process.env.FIX_MD_SENDER_COMP_ID || "",
    process.env.FIX_MD_TARGET_COMP_ID || "",
    process.env.FIX_MD_USERNAME || "",
    process.env.FIX_MD_PASSWORD || ""
  );
}

app.post("/api/market-data/subscribe", (req: Request, res: Response) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }

    if (activeSubscriptions.has(symbol)) {
      res.status(409).json({ error: "Subscription already exists" });
      return;
    }

    const client = createFixClient();
    activeSubscriptions.set(symbol, { symbol, client });

    res.status(201).json({ message: `Subscribed to ${symbol}` });
    return;
  } catch (error) {
    console.error("Subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

app.delete(
  "/api/market-data/unsubscribe/:symbol",
  (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const subscription = activeSubscriptions.get(symbol);

      if (!subscription) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }

      subscription.client.close();
      activeSubscriptions.delete(symbol);

      res.json({ message: `Unsubscribed from ${symbol}` });
      return;
    } catch (error) {
      console.error("Unsubscribe error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

app.get("/api/market-data/subscriptions", (_req: Request, res: Response) => {
  try {
    const subscriptions = Array.from(activeSubscriptions.keys());
    res.json({ subscriptions });
    return;
  } catch (error) {
    console.error("List subscriptions error:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
