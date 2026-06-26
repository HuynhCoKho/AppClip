export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "Chưa cấu hình OPENAI_API_KEY trên hosting." });
    return;
  }

  const { id } = req.query;
  const upstream = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}/content`, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    }
  });

  res.status(upstream.status);
  res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp4");
  res.setHeader("Content-Disposition", `inline; filename="${id}.mp4"`);

  if (!upstream.body) {
    res.end();
    return;
  }

  const arrayBuffer = await upstream.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
}
