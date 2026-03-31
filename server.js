const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  const target = req.url;

  try {
    proxy.web(req, res, { target: target, changeOrigin: true });
  } catch (err) {
    res.writeHead(500);
    res.end("Proxy error");
  }
});

server.on('connect', (req, clientSocket, head) => {
  const { port, hostname } = new URL(`http://${req.url}`);

  const serverSocket = require('net').connect(port || 80, hostname, () => {
    clientSocket.write(
      'HTTP/1.1 200 Connection Established\r\n\r\n'
    );
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
