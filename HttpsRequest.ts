import { BSON } from "bson";
import { EventEmitter } from "events";
import WebSocket = require("ws");
export interface IConfig {
    hash: string;
    host: string;
    port: number;
    httpVersion: string;
    bodyhead: any;
    wsClient: WebSocket;
}
export interface IData {
    host: string;
    port: number;
    httpVersion: string;
    bodyhead: any;
}
class HttpsRequest extends EventEmitter {
    protected bson: BSON = new BSON();
    constructor(protected config: IConfig) {
        super();
        this.send("create", {
            host: this.config.host,
            port: this.config.port,
            httpVersion: this.config.httpVersion,
            bodyhead: this.config.bodyhead,
        });
    }
    public message(m: any) {
        switch (m.method) {
            case "write":
                this.emit("write", m.data);
                break;
            case "end":
                this.emit("end");
                break;
            case "error":
                this.emit("error", m.data);
                break;
        }
    }
    public send(method: "create" | "write" | "end" | "error", data: IData | any) {
        try {
            this.config.wsClient.send(
                this.bson.serialize({ hash: this.config.hash, method, data }, false, true, false));
        } catch (e) {
            console.error(e);
        }
    }
    public write(chunk: any) {
        this.log("To proxy:", chunk.length);
        this.send("write", chunk);
    }
    public end() {
        this.send("end", null);
    }
    public error(err: any) {
        this.log("Source error:", err);
        this.send("error", err);
    }
    protected log(...args: any[]) {
        console.log.apply(console, args);
    }
}
export default HttpsRequest;
