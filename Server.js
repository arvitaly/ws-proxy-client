"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bson_1 = require("bson");
const http_1 = require("http");
const WebSocket = require("ws");
const HttpsRequest_1 = require("./HttpsRequest");
class Server {
    constructor(config) {
        this.config = config;
        this.bson = new bson_1.BSON();
        this.requests = {};
        const server = http_1.createServer((req, res) => {
            res.write("ok");
            res.end();
        }).listen(this.config.port);
        server.on("connect", (request, socketRequest, bodyhead) => {
            const url = request.url;
            const httpVersion = request.httpVersion;
            const { host, port } = getHostPortFromString(url + "");
            const r = this.createHttpsRequest(host, port, httpVersion, bodyhead);
            r.on("write", (chunk) => {
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
    wsConnect() {
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
            if (!this.requests[m.hash]) {
                this.log("connection already closed");
                return;
            }
            this.requests[m.hash].message(m);
        });
        this.wsClient = wsClient;
    }
    createHttpsRequest(host, port, httpVersion, bodyhead) {
        const hash = parseInt((Math.random() * 1000000).toString(), 10).toString() + (+new Date()).toString();
        this.requests[hash] = new HttpsRequest_1.default({
            bodyhead,
            hash,
            host,
            httpVersion,
            port,
            wsClient: this.wsClient,
        });
        return this.requests[hash];
    }
    log(...args) {
        if (this.config.enableLogging) {
            console.log.apply(console, args);
        }
    }
}
const regexHostport = /^([^:]+)(:([0-9]+))?$/;
function getHostPortFromString(hostString, defaultPort = "443") {
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
exports.default = Server;
