export default function handler(req, res) {
  res.status(501).json({
    error:
      "Long video job không chạy trên bản serverless. Dùng local python server.py hoặc VPS có FFmpeg."
  });
}
