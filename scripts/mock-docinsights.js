// Minimal mock of the DocInsights API for local smoke testing.
const http = require("http");

const SAMPLE_TEXT = `STARBUCKS COFFEE
123 Market Street, San Francisco
Date: 05/13/2026
Latte            4.95
Croissant        3.50
Subtotal         8.45
Tax              0.76
TOTAL           $9.21
Thank you!`;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        text: SAMPLE_TEXT,
        summary: "Receipt from Starbucks Coffee in San Francisco for a latte and a croissant, total $9.21.",
        classification: "receipt",
      })
    );
  });
});

server.listen(9099, () => console.log("mock docinsights on :9099"));
