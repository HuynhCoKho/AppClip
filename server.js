const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const apiKey = process.env.OPENAI_API_KEY;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mp4": "video/mp4",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/generate-video") {
      if (!apiKey) return json(res, 500, { error: "Chưa có OPENAI_API_KEY trong môi trường server." });
      const body = await readJson(req);
      const payload = {
        model: body.model || "sora-2",
        prompt: body.prompt,
        seconds: String(body.seconds || "8"),
        size: body.size || "1280x720",
      };

      const upstream = await fetch("https://api.openai.com/v1/videos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return pipeJson(upstream, res);
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/video-status/")) {
      if (!apiKey) return json(res, 500, { error: "Chưa có OPENAI_API_KEY trong môi trường server." });
      const id = url.pathname.split("/").pop();
      const upstream = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return pipeJson(upstream, res);
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/video-content/")) {
      if (!apiKey) return json(res, 500, { error: "Chưa có OPENAI_API_KEY trong môi trường server." });
      const id = url.pathname.split("/").pop();
      const upstream = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}/content`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      res.writeHead(upstream.status, {
        "Content-Type": upstream.headers.get("content-type") || "video/mp4",
        "Content-Disposition": `inline; filename="${id}.mp4"`,
      });
      if (!upstream.body) return res.end();
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      return res.end();
    }

    serveStatic(url.pathname, res);
  } catch (error) {
    json(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, () => {
  console.log(`AppClip Toon chạy tại http://localhost:${port}`);
});

function serveStatic(route, res) {
  const safePath = route === "/" ? "/index.html" : decodeURIComponent(route);
  const filePath = path.normalize(path.join(root, safePath));
  if (!filePath.startsWith(root)) return json(res, 403, { error: "Forbidden" });
  fs.readFile(filePath, (error, data) => {
    if (error) return json(res, 404, { error: "Not found" });
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Request quá lớn."));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("JSON không hợp lệ."));
      }
    });
  });
}

async function pipeJson(upstream, res) {
  const text = await upstream.text();
  res.writeHead(upstream.status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(text);
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
