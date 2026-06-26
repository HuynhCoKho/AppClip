export default function handler(req, res) {
  res.status(501).json({
    error:
      "Bản online serverless chỉ hỗ trợ clip Sora 4/8/12 giây. Video 5 phút cần worker chạy lâu + FFmpeg, hãy chạy local bằng python server.py hoặc deploy lên VPS/Render worker."
  });
}
