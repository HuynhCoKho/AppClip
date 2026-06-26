export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "Chưa cấu hình OPENAI_API_KEY trên hosting." });
    return;
  }

  const { id } = req.query;
  const upstream = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    }
  });

  const text = await upstream.text();
  res.status(upstream.status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(text);
}
