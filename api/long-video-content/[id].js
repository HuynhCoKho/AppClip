export default function handler(req, res) {
  res.status(501).json({
    error:
      "Long video output không có trên bản serverless. Dùng local python server.py hoặc VPS có FFmpeg."
  });
}
