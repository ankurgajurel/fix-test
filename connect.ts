import WebSocket from "ws";

const SOH = "\x01";

class FixClient {
  private ws: WebSocket;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sequenceNumber = 1;
  private senderCompId: string;
  private targetCompId: string;
  private username: string;
  private password: string;

  constructor(
    private host: string,
    private port: number,
    senderCompId: string,
    targetCompId: string,
    username: string,
    password: string
  ) {
    this.senderCompId = senderCompId;
    this.targetCompId = targetCompId;
    this.username = username;
    this.password = password;

    const url = `wss://${host}:${port}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => this.onOpen();
    this.ws.onmessage = (event) => this.onMessage(event.data.toString());
    this.ws.onerror = (event) => console.error("WebSocket error:", event);
    this.ws.onclose = () => this.onClose();
  }

  private onOpen() {
    console.log("WebSocket connection established.");
    this.sendLogon();

    setTimeout(() => {
      this.sendMarketDataRequest("BTCUSDT");
    }, 3000);
  }

  private onMessage(data: string) {
    console.log("Received:", data);
    const message = this.parseFIXMessage(data);

    if (message["35"] === "0") {
      console.log("Received Heartbeat.");
    } else if (message["35"] === "W") {
      console.log("Received Market Data:");
      console.log(`Symbol: ${message["55"]}`);
      console.log(
        `Bid Price: ${message["269"] === "0" ? message["270"] : "N/A"}`
      );
      console.log(
        `Ask Price: ${message["269"] === "1" ? message["270"] : "N/A"}`
      );
    } else if (message["35"] === "5") {
      console.log("Logout received, closing connection.");
      this.ws.close();
    }
  }

  private onClose() {
    console.log("WebSocket connection closed.");
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  private sendLogon() {
    const logonMessage = this.createFIXMessage({
      8: "FIX.4.4",
      35: "A",
      34: (this.sequenceNumber++).toString(),
      49: this.senderCompId,
      56: this.targetCompId,
      98: "0",
      108: "30",
      141: "Y",
      553: this.username,
      554: this.password,
      52: new Date().toISOString(),
    });

    console.log("Sending Logon...");
    this.ws.send(logonMessage);

    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000);
  }

  private sendHeartbeat() {
    const heartbeatMessage = this.createFIXMessage({
      8: "FIX.4.4",
      35: "0",
      34: (this.sequenceNumber++).toString(),
      49: this.senderCompId,
      56: this.targetCompId,
      52: new Date().toISOString(),
    });

    console.log("Sending Heartbeat...");
    this.ws.send(heartbeatMessage);
  }

  private sendMarketDataRequest(symbol: string) {
    const requestMessage = this.createFIXMessage({
      8: "FIX.4.4",
      35: "V",
      34: (this.sequenceNumber++).toString(),
      49: this.senderCompId,
      56: this.targetCompId,
      52: new Date().toISOString(),
      262: "BTCUSDT-MD-REQ",
      263: "1",
      264: "1",
      267: "2",
      268: "0",
      269: "1",
      55: symbol,
    });

    console.log(`requesting Market Data for ${symbol}...`);
    this.ws.send(requestMessage);
  }

  private createFIXMessage(fields: Record<number, string>): string {
    const keys = Object.keys(fields).sort((a, b) => Number(a) - Number(b));
    let message = keys.map((key) => `${key}=${fields[Number(key)]}`).join(SOH);

    const checksum = this.calculateChecksum(message + SOH);
    message += `${SOH}10=${checksum}${SOH}`;

    return message;
  }

  private calculateChecksum(message: string): string {
    const sum = message
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (sum % 256).toString().padStart(3, "0");
  }

  private parseFIXMessage(message: string): Record<string, string> {
    const fields = message.split(SOH);
    return fields.reduce((acc, field) => {
      const [tag, value] = field.split("=");
      if (tag) acc[tag] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.ws.close();
  }
}

export { FixClient };