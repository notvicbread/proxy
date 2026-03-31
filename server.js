const http = require('http');
const net = require('net');
const url = require('url');

// 🔐 AUTH (CHANGE THIS)
const USERNAME = process.env.PROXY_USER || "vic";
const PASSWORD = process.env.PROXY_PASS || "1234";

function checkAuth(req) {
  const auth = req.headers['proxy-authorization'];
  if (!auth) return false;

  const base64 = auth.split(' ')[1];
  const decoded = Buffer.from(base64, 'base64').toString();
  const [user, pass] = decoded.split(':');

  return user === USERNAME && pass === PASSWORD;
}

const server = http.createServer((req, res) => {
  // 🔐 Require auth
  if (!checkAuth(req)) {
    res.writeHead(407, {
      'Proxy-Authenticate': 'Basic realm="Proxy"'
    });
    return res.end('Authentication required');
  }

  try {
    const parsed = url.parse(req.url);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.path,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    req.pipe(proxyReq);

    proxyReq.on('error', () => {
      res.writeHead(500);
      res.end('Proxy error');
    });

  } catch (err) {
    res.writeHead(500);
    res.end('Proxy error');
  }
});

// 🔥 HTTPS (CONNECT tunneling)
server.on('connect', (req, clientSocket, head) => {
  if (!checkAuth(req)) {
    clientSocket.write(
      'HTTP/1.1 407 Proxy Authentication Required\r\n\r\n'
    );
    return clientSocket.end();
  }

  const { port, hostname } = new URL(`http://${req.url}`);

  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write(
      'HTTP/1.1 200 Connection Established\r\n\r\n'
    );
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', () => {
    clientSocket.end();
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🔥 Advanced Proxy running on port ${PORT}`);
});
