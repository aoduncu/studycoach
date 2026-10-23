import http from "node:http";
http
  .createServer((req, res) => {
    const target = req.url?.startsWith("/auth/v1/")
      ? { port: 54325, path: req.url.slice(8) }
      : req.url?.startsWith("/rest/v1/")
        ? { port: 54326, path: req.url.slice(8) }
        : null;
    if (!target) {
      res.writeHead(404);
      res.end();
      return;
    }
    const proxy = http.request(
      {
        hostname: "127.0.0.1",
        ...target,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${target.port}` },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxy.on("error", () => {
      res.writeHead(503);
      res.end("Service unavailable");
    });
    req.pipe(proxy);
  })
  .listen(54321, "127.0.0.1", () =>
    console.log("Yerel Auth/REST gateway hazır."),
  );
