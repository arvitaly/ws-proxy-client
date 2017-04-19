import { BSON } from "bson";
import { createServer, IncomingMessage } from "http";
import { Socket } from "net";
import WebSocket = require("ws");
import HttpsRequest from "./HttpsRequest";
export interface IConfig {
    port: number;
    proxy: string;
    enableLogging?: boolean;
}
class Server {
    protected bson: BSON = new BSON();
    protected requests: { [index: string]: HttpsRequest } = {};
    protected wsClient: WebSocket;
    constructor(protected config: IConfig) {
        const server = createServer((req, res) => {
            res.write("ok");
            res.end();
        }).listen(this.config.port);
        server.on("connect", (request: IncomingMessage, socketRequest: Socket, bodyhead: Buffer) => {
            const url = request.url;
            const httpVersion = request.httpVersion;
            const { host, port } = getHostPortFromString(url + "");
            const r = this.createHttpsRequest(host, port, httpVersion, bodyhead);
            r.on("write", (chunk: any) => {
                this.log("To source:", chunk.length);
                socketRequest.write(chunk);
            });
            r.on("end", () => {
                socketRequest.end();
            });
            socketRequest.on("data", (chunk) => {
                r.write(chunk);
            });
            socketRequest.on("end", () => {
                r.end();
            });
            socketRequest.on("error", (err) => {
                r.error(err);
            });
        });
        this.wsConnect();
    }
    protected wsConnect() {
        const wsClient = new WebSocket(this.config.proxy);
        wsClient.on("error", (err) => {
            this.log("Client error:", err);
        });
        wsClient.on("open", () => {
            this.log("WebSocket proxy opened");
        });
        wsClient.on("close", () => {
            this.log("WebSocket proxy closed, reconnect after 1sec");
            setTimeout(() => this.wsConnect(), 1000);
        });
        wsClient.on("message", (message) => {
            const m = this.bson.deserialize(message, { promoteBuffers: true });
            this.log("received: ", m);
            this.requests[m.hash].message(m);
        });
        this.wsClient = wsClient;
    }
    protected createHttpsRequest(host: string, port: number, httpVersion: string, bodyhead: any) {
        const hash = parseInt((Math.random() * 1000000).toString(), 10).toString() + (+new Date()).toString();
        this.requests[hash] = new HttpsRequest({
            bodyhead,
            hash,
            host,
            httpVersion,
            port,
            wsClient: this.wsClient,
        });
        return this.requests[hash];
    }
    protected log(...args: any[]) {
        if (this.config.enableLogging) {
            console.log.apply(console, args);
        }
    }
}
const regexHostport = /^([^:]+)(:([0-9]+))?$/;
function getHostPortFromString(hostString: string, defaultPort = "443") {
    let host = hostString;
    let port = defaultPort;
    const result = regexHostport.exec(hostString);
    if (result != null) {
        host = result[1];
        if (result[2] != null) {
            port = result[3];
        }
    }
    return {
        host,
        port: parseInt(port, 10),
    };
}
export default Server;
