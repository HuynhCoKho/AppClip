export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "Chưa cấu hình OPENAI_API_KEY trên hosting." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const form = new FormData();
    form.append("model", body.model || "sora-2");
    form.append("prompt", body.prompt || "");
    form.append("seconds", String(body.seconds || "8"));
    form.append("size", body.size || "1280x720");

    const upstream = await fetch("https://api.openai.com/v1/videos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: form
    });

    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
}
