import json
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def load_env_file():
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()

PORT = int(os.environ.get("PORT", "4173"))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_TEXT_MODEL = os.environ.get("OPENAI_TEXT_MODEL", "gpt-4.1-mini")
ROOT = Path(__file__).resolve().parent
JOBS_DIR = ROOT / "generated_videos"
JOBS_DIR.mkdir(exist_ok=True)
LONG_JOBS = {}
JOBS_LOCK = threading.Lock()


class AppHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/generate-video":
            self.generate_video()
            return
        if self.path == "/api/generate-long-video":
            self.generate_long_video()
            return
        if self.path == "/api/generate-project-video":
            self.generate_project_video()
            return
        self.send_json(404, {"error": "Not found"})

    def do_GET(self):
        if self.path == "/api/health":
            self.send_json(200, {"ok": True, "has_key": bool(OPENAI_API_KEY), "has_ffmpeg": bool(shutil.which("ffmpeg"))})
            return

        if self.path.startswith("/api/long-video-status/"):
            job_id = self.path.rsplit("/", 1)[-1]
            with JOBS_LOCK:
                job = LONG_JOBS.get(job_id)
            if not job:
                self.send_json(404, {"error": "Không tìm thấy job video dài."})
                return
            self.send_json(200, public_job(job))
            return

        if self.path.startswith("/api/long-video-content/"):
            job_id = self.path.rsplit("/", 1)[-1]
            with JOBS_LOCK:
                job = LONG_JOBS.get(job_id)
            if not job or job.get("status") != "completed":
                self.send_json(404, {"error": "Video dài chưa sẵn sàng."})
                return
            self.serve_local_video(Path(job["output_path"]))
            return

        if self.path.startswith("/api/video-status/"):
            video_id = self.path.rsplit("/", 1)[-1]
            self.proxy_json(f"https://api.openai.com/v1/videos/{urllib.parse.quote(video_id)}")
            return

        if self.path.startswith("/api/video-content/"):
            video_id = self.path.rsplit("/", 1)[-1]
            self.proxy_video(f"https://api.openai.com/v1/videos/{urllib.parse.quote(video_id)}/content")
            return

        super().do_GET()

    def generate_video(self):
        if not OPENAI_API_KEY:
            self.send_json(500, {"error": "Chưa có OPENAI_API_KEY trong môi trường server."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            payload = {
                "model": body.get("model", "sora-2"),
                "prompt": body.get("prompt", ""),
                "seconds": str(body.get("seconds", "8")),
                "size": body.get("size", "1280x720"),
            }
            self.proxy_json("https://api.openai.com/v1/videos", method="POST", payload=payload, multipart=True)
        except Exception as error:
            self.send_json(500, {"error": str(error)})

    def generate_long_video(self):
        if not OPENAI_API_KEY:
            self.send_json(500, {"error": "Chưa có OPENAI_API_KEY trong môi trường server."})
            return
        if not shutil.which("ffmpeg"):
            self.send_json(500, {"error": "Thiếu FFmpeg. Cài FFmpeg rồi mở terminal mới để ghép video 5 phút."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            prompt = body.get("prompt", "").strip()
            if not prompt:
                self.send_json(400, {"error": "Prompt trống."})
                return

            job_id = uuid.uuid4().hex[:12]
            job_dir = JOBS_DIR / job_id
            job_dir.mkdir(exist_ok=True)
            scenes = build_scene_prompts(prompt, int(body.get("total_seconds", 300)), int(body.get("segment_seconds", 12)))
            job = {
                "id": job_id,
                "status": "queued",
                "progress": 0,
                "message": "Đang xếp hàng tạo video dài.",
                "total_scenes": len(scenes),
                "done_scenes": 0,
                "scenes": scenes,
                "job_dir": str(job_dir),
                "output_path": str(job_dir / "final.mp4"),
            }
            with JOBS_LOCK:
                LONG_JOBS[job_id] = job

            args = {
                "model": body.get("model", "sora-2"),
                "size": body.get("size", "1280x720"),
                "segment_seconds": int(body.get("segment_seconds", 12)),
            }
            threading.Thread(target=run_long_video_job, args=(job_id, args), daemon=True).start()
            self.send_json(200, public_job(job))
        except Exception as error:
            self.send_json(500, {"error": str(error)})

    def generate_project_video(self):
        if not OPENAI_API_KEY:
            self.send_json(500, {"error": "Chưa có OPENAI_API_KEY trong môi trường server."})
            return
        if not shutil.which("ffmpeg"):
            self.send_json(500, {"error": "Thiếu FFmpeg. Cài FFmpeg để ghép video theo pipeline MoneyPrinterTurbo."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            subject = body.get("prompt", "").strip()
            if not subject:
                self.send_json(400, {"error": "Prompt trống."})
                return

            total_seconds = int(body.get("total_seconds", 300))
            segment_seconds = int(body.get("segment_seconds", 12))
            job_id = uuid.uuid4().hex[:12]
            job_dir = JOBS_DIR / job_id
            job_dir.mkdir(exist_ok=True)
            plan = build_project_plan(subject, total_seconds, segment_seconds)
            (job_dir / "script.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
            (job_dir / "subtitle.srt").write_text(build_srt(plan["scenes"], segment_seconds), encoding="utf-8")

            job = {
                "id": job_id,
                "status": "queued",
                "progress": 0,
                "message": "Đã tạo script, terms và storyboard. Đang xếp hàng render.",
                "total_scenes": len(plan["scenes"]),
                "done_scenes": 0,
                "scenes": plan["scenes"],
                "script": plan["script"],
                "terms": plan["terms"],
                "job_dir": str(job_dir),
                "output_path": str(job_dir / "final.mp4"),
            }
            with JOBS_LOCK:
                LONG_JOBS[job_id] = job

            args = {
                "model": body.get("model", "sora-2"),
                "size": body.get("size", "1280x720"),
                "segment_seconds": segment_seconds,
                "subtitle_path": str(job_dir / "subtitle.srt"),
            }
            threading.Thread(target=run_project_video_job, args=(job_id, args), daemon=True).start()
            self.send_json(200, public_job(job))
        except Exception as error:
            self.send_json(500, {"error": str(error)})

    def proxy_json(self, url, method="GET", payload=None, multipart=False):
        if not OPENAI_API_KEY:
            self.send_json(500, {"error": "Chưa có OPENAI_API_KEY trong môi trường server."})
            return

        data = None
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        if payload is not None and multipart:
            data, content_type = make_multipart(payload)
            headers["Content-Type"] = content_type
        elif payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                raw = response.read()
                self.send_response(response.status)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(raw)
        except urllib.error.HTTPError as error:
            self.send_response(error.code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(error.read())
        except Exception as error:
            self.send_json(500, {"error": str(error)})

    def proxy_video(self, url):
        if not OPENAI_API_KEY:
            self.send_json(500, {"error": "Chưa có OPENAI_API_KEY trong môi trường server."})
            return

        request = urllib.request.Request(url, headers={"Authorization": f"Bearer {OPENAI_API_KEY}"})
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                self.send_response(response.status)
                self.send_header("Content-Type", response.headers.get("Content-Type", "video/mp4"))
                self.send_header("Content-Disposition", "inline; filename=video.mp4")
                self.end_headers()
                while True:
                    chunk = response.read(1024 * 256)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except urllib.error.HTTPError as error:
            self.send_response(error.code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(error.read())
        except Exception as error:
            self.send_json(500, {"error": str(error)})

    def serve_local_video(self, file_path):
        if not file_path.exists():
            self.send_json(404, {"error": "Không tìm thấy file video."})
            return
        self.send_response(200)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Content-Disposition", f'inline; filename="{file_path.name}"')
        self.send_header("Content-Length", str(file_path.stat().st_size))
        self.end_headers()
        with file_path.open("rb") as handle:
            shutil.copyfileobj(handle, self.wfile)

    def send_json(self, status, body):
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def make_multipart(fields):
    boundary = f"----AppClipToon{uuid.uuid4().hex}"
    chunks = []
    for name, value in fields.items():
        chunks.append(f"--{boundary}\r\n".encode("utf-8"))
        chunks.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        chunks.append(str(value).encode("utf-8"))
        chunks.append(b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def public_job(job):
    return {
        "id": job["id"],
        "status": job["status"],
        "progress": job["progress"],
        "message": job["message"],
        "total_scenes": job["total_scenes"],
        "done_scenes": job["done_scenes"],
        "error": job.get("error"),
        "script": job.get("script", ""),
        "terms": job.get("terms", []),
        "scenes": [
            {
                "index": scene.get("index"),
                "title": scene.get("title"),
                "narration": scene.get("narration"),
                "search_term": scene.get("search_term"),
            }
            for scene in job.get("scenes", [])[:30]
        ],
    }


def build_scene_prompts(prompt, total_seconds, segment_seconds):
    scene_count = max(1, (total_seconds + segment_seconds - 1) // segment_seconds)
    parts = [part.strip() for part in prompt.replace("\n", ", ").split(",") if part.strip()]
    style = ", ".join(parts[:8]) if parts else prompt
    scenes = []
    for index in range(scene_count):
        focus = parts[index % len(parts)] if parts else prompt
        scenes.append(
            f"{prompt}\n\n"
            f"Scene {index + 1} of {scene_count}, duration {segment_seconds} seconds. "
            f"Focus this scene on: {focus}. Keep the same visual style across all scenes: {style}. "
            "Create smooth cinematic motion, coherent lighting, and make this scene usable as one segment in a longer continuous video."
        )
    return scenes


def build_project_plan(subject, total_seconds, segment_seconds):
    scene_count = max(1, (total_seconds + segment_seconds - 1) // segment_seconds)
    try:
        return generate_project_plan_with_openai(subject, scene_count, segment_seconds)
    except Exception as error:
        print(f"LLM plan failed, fallback local planner: {error}")
        return build_local_project_plan(subject, scene_count, segment_seconds)


def generate_project_plan_with_openai(subject, scene_count, segment_seconds):
    instruction = (
        "You are a short-video producer. Return strict JSON only. "
        "Create a MoneyPrinterTurbo-style production plan from the user's video idea. "
        "The JSON shape must be: "
        "{\"script\":\"...\", \"terms\":[\"...\"], \"scenes\":[{\"index\":1,\"title\":\"...\","
        "\"narration\":\"...\",\"search_term\":\"...\",\"visual_prompt\":\"...\"}]}. "
        f"Create exactly {scene_count} scenes. Each scene is {segment_seconds} seconds. "
        "Make visual_prompt detailed for Sora video generation. Keep all scenes visually consistent, cinematic, and coherent. "
        "Use Vietnamese for narration when the user's text is Vietnamese; otherwise keep the user's language."
    )
    payload = {
        "model": OPENAI_TEXT_MODEL,
        "input": [
            {"role": "system", "content": instruction},
            {"role": "user", "content": subject},
        ],
        "text": {"format": {"type": "json_object"}},
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=data,
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        result = json.loads(response.read().decode("utf-8"))
    text = extract_response_text(result)
    plan = json.loads(text)
    return normalize_plan(plan, subject, scene_count)


def extract_response_text(result):
    if result.get("output_text"):
        return result["output_text"]
    chunks = []
    for item in result.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in ("output_text", "text"):
                chunks.append(content.get("text", ""))
    if not chunks:
        raise RuntimeError("OpenAI Responses API không trả về text.")
    return "".join(chunks)


def normalize_plan(plan, subject, scene_count):
    scenes = plan.get("scenes") or []
    if not isinstance(scenes, list):
        scenes = []
    local = build_local_project_plan(subject, scene_count, 12)
    normalized = []
    for index in range(scene_count):
        source = scenes[index] if index < len(scenes) and isinstance(scenes[index], dict) else local["scenes"][index]
        normalized.append(
            {
                "index": index + 1,
                "title": str(source.get("title") or f"Cảnh {index + 1}"),
                "narration": str(source.get("narration") or local["scenes"][index]["narration"]),
                "search_term": str(source.get("search_term") or local["scenes"][index]["search_term"]),
                "visual_prompt": str(source.get("visual_prompt") or local["scenes"][index]["visual_prompt"]),
            }
        )
    terms = plan.get("terms") if isinstance(plan.get("terms"), list) else [scene["search_term"] for scene in normalized[:8]]
    return {
        "script": str(plan.get("script") or "\n".join(scene["narration"] for scene in normalized)),
        "terms": [str(term) for term in terms if str(term).strip()][:12],
        "scenes": normalized,
    }


def build_local_project_plan(subject, scene_count, segment_seconds):
    parts = [part.strip() for part in re.split(r"[,.;\n]+", subject) if part.strip()]
    if not parts:
        parts = [subject]
    terms = parts[: min(12, len(parts))]
    scenes = []
    for index in range(scene_count):
        focus = parts[index % len(parts)]
        scenes.append(
            {
                "index": index + 1,
                "title": f"Cảnh {index + 1}: {focus[:52]}",
                "narration": focus,
                "search_term": focus,
                "visual_prompt": (
                    f"{subject}\n\n"
                    f"Scene {index + 1}/{scene_count}, {segment_seconds} seconds. Focus: {focus}. "
                    "Professional cinematic video, consistent style, smooth camera movement, coherent lighting, "
                    "high quality, no on-screen text unless explicitly requested."
                ),
            }
        )
    return {"script": "\n".join(scene["narration"] for scene in scenes), "terms": terms, "scenes": scenes}


def build_srt(scenes, segment_seconds):
    lines = []
    for scene in scenes:
        index = int(scene["index"])
        start = (index - 1) * segment_seconds
        end = index * segment_seconds
        lines.append(str(index))
        lines.append(f"{format_srt_time(start)} --> {format_srt_time(end)}")
        lines.append(scene.get("narration", ""))
        lines.append("")
    return "\n".join(lines)


def format_srt_time(seconds):
    milliseconds = int((seconds - int(seconds)) * 1000)
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def update_job(job_id, **changes):
    with JOBS_LOCK:
        job = LONG_JOBS[job_id]
        job.update(changes)


def run_long_video_job(job_id, args):
    try:
        with JOBS_LOCK:
            job = LONG_JOBS[job_id]
            scenes = list(job["scenes"])
            job_dir = Path(job["job_dir"])
        clip_paths = []
        update_job(job_id, status="in_progress", message="Bắt đầu tạo từng clip Sora.")

        for index, scene_prompt in enumerate(scenes):
            update_job(
                job_id,
                message=f"Đang tạo clip {index + 1}/{len(scenes)} bằng Sora.",
                done_scenes=index,
                progress=round((index / len(scenes)) * 92, 2),
            )
            video_id = create_sora_video(scene_prompt, args["model"], args["size"], args["segment_seconds"])
            wait_for_sora_video(video_id, job_id, index, len(scenes))
            clip_path = job_dir / f"clip_{index + 1:03d}.mp4"
            download_sora_video(video_id, clip_path)
            clip_paths.append(clip_path)
            update_job(job_id, done_scenes=index + 1, progress=round(((index + 1) / len(scenes)) * 92, 2))

        update_job(job_id, message="Đang ghép các clip bằng FFmpeg.", progress=95)
        output_path = job_dir / "final.mp4"
        concat_videos(clip_paths, output_path)
        update_job(job_id, status="completed", message="Video 5 phút đã ghép xong.", progress=100, output_path=str(output_path))
    except Exception as error:
        update_job(job_id, status="failed", message="Tạo video dài thất bại.", error=str(error))


def run_project_video_job(job_id, args):
    try:
        with JOBS_LOCK:
            job = LONG_JOBS[job_id]
            scenes = list(job["scenes"])
            job_dir = Path(job["job_dir"])
        clip_paths = []
        update_job(job_id, status="in_progress", message="Bắt đầu pipeline: script -> scene clips -> subtitles -> final.")

        for index, scene in enumerate(scenes):
            update_job(
                job_id,
                message=f"Đang tạo scene {index + 1}/{len(scenes)}: {scene.get('title', '')}",
                done_scenes=index,
                progress=round((index / len(scenes)) * 88, 2),
            )
            video_id = create_sora_video(scene["visual_prompt"], args["model"], args["size"], args["segment_seconds"])
            wait_for_sora_video(video_id, job_id, index, len(scenes))
            clip_path = job_dir / f"scene_{index + 1:03d}.mp4"
            download_sora_video(video_id, clip_path)
            clip_paths.append(clip_path)
            update_job(job_id, done_scenes=index + 1, progress=round(((index + 1) / len(scenes)) * 88, 2))

        update_job(job_id, message="Đang ghép video và burn subtitle bằng FFmpeg.", progress=94)
        raw_output = job_dir / "timeline.mp4"
        final_output = job_dir / "final.mp4"
        concat_videos(clip_paths, raw_output)
        burn_subtitles(raw_output, Path(args["subtitle_path"]), final_output)
        update_job(job_id, status="completed", message="Pipeline hoàn tất: đã có video final MP4.", progress=100, output_path=str(final_output))
    except Exception as error:
        update_job(job_id, status="failed", message="Pipeline thất bại.", error=str(error))


def create_sora_video(prompt, model, size, seconds):
    payload = {"model": model, "prompt": prompt, "seconds": str(seconds), "size": size}
    data, content_type = make_multipart(payload)
    request = urllib.request.Request(
        "https://api.openai.com/v1/videos",
        data=data,
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": content_type},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        result = json.loads(response.read().decode("utf-8"))
    if not result.get("id"):
        raise RuntimeError(f"API không trả về video id: {result}")
    return result["id"]


def wait_for_sora_video(video_id, job_id, scene_index, scene_total):
    while True:
        request = urllib.request.Request(
            f"https://api.openai.com/v1/videos/{urllib.parse.quote(video_id)}",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
        )
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))
        status = result.get("status")
        progress = float(result.get("progress") or 0)
        scene_base = (scene_index / scene_total) * 92
        scene_share = (progress / 100) * (92 / scene_total)
        update_job(
            job_id,
            message=f"Clip {scene_index + 1}/{scene_total}: {status}, {progress:.0f}%.",
            progress=round(scene_base + scene_share, 2),
        )
        if status == "completed":
            return
        if status == "failed":
            raise RuntimeError(result.get("error", {}).get("message") or f"Clip {scene_index + 1} thất bại.")
        time.sleep(5)


def download_sora_video(video_id, output_path):
    request = urllib.request.Request(
        f"https://api.openai.com/v1/videos/{urllib.parse.quote(video_id)}/content",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
    )
    with urllib.request.urlopen(request, timeout=300) as response, output_path.open("wb") as handle:
        shutil.copyfileobj(response, handle)


def concat_videos(clip_paths, output_path):
    list_path = output_path.parent / "concat.txt"
    with list_path.open("w", encoding="utf-8") as handle:
        for clip_path in clip_paths:
            safe = str(clip_path).replace("\\", "/").replace("'", "'\\''")
            handle.write(f"file '{safe}'\n")
    command = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_path), "-c", "copy", str(output_path)]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-2000:] or "FFmpeg ghép video thất bại.")


def burn_subtitles(input_path, subtitle_path, output_path):
    if not subtitle_path.exists():
        shutil.copyfile(input_path, output_path)
        return
    subtitle_arg = str(subtitle_path).replace("\\", "/").replace(":", "\\:")
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-vf",
        f"subtitles='{subtitle_arg}'",
        "-c:v",
        "libx264",
        "-c:a",
        "copy",
        str(output_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        shutil.copyfile(input_path, output_path)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AppHandler)
    print(f"AppClip Toon chạy tại http://localhost:{PORT}")
    print("Nhấn Ctrl+C để tắt server.")
    server.serve_forever()
