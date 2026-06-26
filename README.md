# AppClip Toon

Ứng dụng web tĩnh giúp nhập mô tả app và tạo clip hoạt hình ngắn trên canvas.

## Cách dùng bản xem thử canvas

1. Mở `index.html` bằng trình duyệt.
2. Nhập mô tả app.
3. Chọn phong cách và thời lượng.
4. Bấm `Tạo clip`.
5. Bấm `Xuất video` để tạo file `.webm`.

## Cách dùng video AI thật qua API

Không mở trực tiếp `index.html` nếu muốn gọi API. Hãy chạy server để giữ API key ở phía máy chủ:

### Cách dễ nhất

Double click file:

```text
Chay AppClip.bat
```

Lần đầu file sẽ hỏi `OPENAI_API_KEY` và lưu vào `.env`. Những lần sau chỉ cần double click là app tự mở trình duyệt.

### Cách chạy bằng terminal

Nếu máy có Python:

```powershell
$env:OPENAI_API_KEY="sk-..."
python server.py
```

Nếu máy có Node.js:

```powershell
$env:OPENAI_API_KEY="sk-..."
node server.js
```

Sau đó mở:

```text
http://localhost:4173
```

Bấm `Tạo video AI thật`. App sẽ gọi OpenAI Videos API với model `sora-2`, poll tiến độ, rồi hiện MP4 khi render xong.

## Deploy online bằng Vercel

Repo này đã có thư mục `api/` cho Vercel Serverless Functions. Deploy repo lên Vercel, sau đó thêm biến môi trường:

```text
OPENAI_API_KEY=sk-...
```

Bản online hỗ trợ tạo clip Sora 4/8/12 giây. Chế độ 5 phút cần worker chạy lâu + FFmpeg, nên dùng local `python server.py` hoặc VPS/Render Worker.

Bản canvas chỉ là xem thử nội bộ. Nút `Tạo video AI thật` mới dùng API để sinh video theo prompt.

Lưu ý: Videos API chỉ nhận thời lượng 4, 8 hoặc 12 giây. Nếu chọn dài hơn, app sẽ gửi tối đa 12 giây.

## Pipeline kiểu MoneyPrinterTurbo

Bản hiện tại đã đổi sang pipeline gần với MoneyPrinterTurbo:

1. Tạo `script.json` gồm script, search terms và danh sách scene.
2. Mỗi scene có narration, search term và prompt riêng cho Sora.
3. Gọi Sora tạo từng clip scene.
4. Tạo `subtitle.srt` theo timeline.
5. Ghép clip bằng FFmpeg.
6. Burn subtitle vào video final.

Các file sinh ra nằm trong:

```text
generated_videos/<job_id>/
```

Trong đó có `script.json`, `subtitle.srt`, từng `scene_001.mp4`, `timeline.mp4`, và `final.mp4`.

## Video 5 phút

Chọn `5 phút - ghép 25 clip Sora` để app tự tạo 25 clip, mỗi clip 12 giây, rồi nối thành một file MP4.

Máy cần có FFmpeg trong PATH để ghép video. Kiểm tra bằng:

```powershell
ffmpeg -version
```

Nếu chưa có FFmpeg, cài từ https://ffmpeg.org hoặc qua winget:

```powershell
winget install Gyan.FFmpeg
```

Sau khi cài, mở terminal mới rồi chạy lại `python server.py`.
