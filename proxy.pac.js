var proxyServer  = "PROXY 127.0.0.1:8111";
function FindProxyForURL(url, host) {
    return proxyServer;
}