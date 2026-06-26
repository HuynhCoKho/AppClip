export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    has_key: Boolean(process.env.OPENAI_API_KEY),
    has_ffmpeg: false,
    runtime: "vercel-serverless"
  });
}
