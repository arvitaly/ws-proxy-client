"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bson_1 = require("bson");
const events_1 = require("events");
class HttpsRequest extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.bson = new bson_1.BSON();
        this.send("create", {
            host: this.config.host,
            port: this.config.port,
            httpVersion: this.config.httpVersion,
            bodyhead: this.config.bodyhead,
        });
    }
    message(m) {
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
    send(method, data) {
        try {
            this.config.wsClient.send(this.bson.serialize({ hash: this.config.hash, method, data }, false, true, false));
        }
        catch (e) {
            console.error(e);
        }
    }
    write(chunk) {
        this.log("To proxy:", chunk.length);
        this.send("write", chunk);
    }
    end() {
        this.send("end", null);
    }
    error(err) {
        this.log("Source error:", err);
        this.send("error", err);
    }
    log(...args) {
        console.log.apply(console, args);
    }
}
exports.default = HttpsRequest;
