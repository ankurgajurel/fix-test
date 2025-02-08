import { FixClient } from "./connect";
import dotenv from "dotenv";

dotenv.config();

interface FixCredentials {
  host: string;
  port: number;
  senderCompId: string;
  targetCompId: string;
  username: string;
  password: string;
}

function validateEnvironment(): FixCredentials {
  const required = [
    "FIX_MD_HOST",
    "FIX_MD_PORT",
    "FIX_MD_SENDER_COMP_ID",
    "FIX_MD_TARGET_COMP_ID",
    "FIX_MD_USERNAME",
    "FIX_MD_PASSWORD",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    host: process.env.FIX_MD_HOST!,
    port: Number(process.env.FIX_MD_PORT),
    senderCompId: process.env.FIX_MD_SENDER_COMP_ID!,
    targetCompId: process.env.FIX_MD_TARGET_COMP_ID!,
    username: process.env.FIX_MD_USERNAME!,
    password: process.env.FIX_MD_PASSWORD!,
  };
}

async function testFixConnection() {
  console.log("🔄 Testing FIX connection...");

  let client: FixClient | null = null;

  try {
    const credentials = validateEnvironment();

    client = new FixClient(
      credentials.host,
      credentials.port,
      credentials.senderCompId,
      credentials.targetCompId,
      credentials.username,
      credentials.password
    );

    console.log("🔄 Waiting for market data responses...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log("Test completed successfully!");
  } catch (error) {
    console.error(
      "Connection test failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  } finally {
    if (client) {
      try {
        client.close();
        console.log("Connection closed properly");
      } catch (error) {
        console.error("Error while closing connection:", error);
      }
    }
  }
}

process.on("SIGINT", () => {
  console.log("\nTest interrupted by user");
  process.exit(0);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

console.log("Starting FIX connection test...");
testFixConnection().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
