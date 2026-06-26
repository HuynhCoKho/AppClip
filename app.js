const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const promptInput = document.querySelector("#prompt");
const aiModelInput = document.querySelector("#aiModel");
const aiSizeInput = document.querySelector("#aiSize");
const durationInput = document.querySelector("#duration");
const generateButton = document.querySelector("#generate");
const aiGenerateButton = document.querySelector("#aiGenerate");
const recordButton = document.querySelector("#record");
const playButton = document.querySelector("#play");
const statusBox = document.querySelector("#status");
const scenesList = document.querySelector("#scenes");
const progressFill = document.querySelector("#progressFill");
const clipTitle = document.querySelector("#clipTitle");
const clipMeta = document.querySelector("#clipMeta");
const downloadLink = document.querySelector("#download");
const aiVideo = document.querySelector("#aiVideo");
const aiDownload = document.querySelector("#aiDownload");
const aiEmpty = document.querySelector("#aiEmpty");

const palettes = {
  friendly: ["#0f8b8d", "#f05d5e", "#f2b84b", "#7aa95c", "#4f7cac"],
  startup: ["#143642", "#0f8b8d", "#f2b84b", "#ffffff", "#d9e2e7"],
  playful: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#5d5fef", "#9fd356"],
  premium: ["#222831", "#c9a227", "#4f7cac", "#e9ecef", "#ffffff"],
};

const domainRules = [
  { id: "dental", label: "nha khoa", icon: "tooth", words: ["nha khoa", "răng", "rang", "niềng", "nieng", "bác sĩ", "bac si", "điều trị", "dieu tri"] },
  { id: "health", label: "sức khỏe", icon: "health", words: ["sức khỏe", "suc khoe", "bệnh viện", "benh vien", "bác sĩ", "bac si", "thuốc", "thuoc"] },
  { id: "learning", label: "học tập", icon: "book", words: ["học", "hoc", "luyện", "luyen", "khoá", "khóa", "khoa hoc", "tiếng anh", "tieng anh"] },
  { id: "commerce", label: "bán hàng", icon: "cart", words: ["bán hàng", "ban hang", "shop", "đơn hàng", "don hang", "sản phẩm", "san pham"] },
  { id: "finance", label: "tài chính", icon: "wallet", words: ["tài chính", "tai chinh", "ví", "vi dien tu", "ngân hàng", "ngan hang", "chi tiêu", "chi tieu"] },
  { id: "food", label: "ẩm thực", icon: "food", words: ["nhà hàng", "nha hang", "món ăn", "mon an", "đồ ăn", "do an", "cafe", "menu"] },
  { id: "travel", label: "du lịch", icon: "map", words: ["du lịch", "du lich", "khách sạn", "khach san", "tour", "vé máy bay", "ve may bay"] },
  { id: "delivery", label: "giao hàng", icon: "truck", words: ["giao hàng", "giao hang", "ship", "vận chuyển", "van chuyen", "tài xế", "tai xe"] },
  { id: "fitness", label: "fitness", icon: "fitness", words: ["gym", "fitness", "tập luyện", "tap luyen", "calo", "dinh dưỡng", "dinh duong"] },
  { id: "realestate", label: "bất động sản", icon: "home", words: ["bất động sản", "bat dong san", "nhà đất", "nha dat", "căn hộ", "can ho"] },
  { id: "productivity", label: "công việc", icon: "check", words: ["quản lý", "quan ly", "công việc", "cong viec", "task", "dự án", "du an"] },
];

const featureRules = [
  { label: "Đặt lịch", icon: "calendar", words: ["đặt lịch", "dat lich", "booking", "lịch hẹn", "lich hen"] },
  { label: "AI gợi ý", icon: "ai", words: ["ai", "gợi ý", "goi y", "tự động", "tu dong", "chatbot"] },
  { label: "Theo dõi", icon: "chart", words: ["theo dõi", "theo doi", "tiến độ", "tien do", "báo cáo", "bao cao"] },
  { label: "Thanh toán", icon: "wallet", words: ["thanh toán", "thanh toan", "ví", "vi", "payment"] },
  { label: "Nhắc hẹn", icon: "bell", words: ["nhắc", "nhac", "thông báo", "thong bao", "reminder"] },
  { label: "Bản đồ", icon: "map", words: ["bản đồ", "ban do", "vị trí", "vi tri", "đường đi", "duong di"] },
  { label: "Hồ sơ", icon: "profile", words: ["hồ sơ", "ho so", "profile", "khách hàng", "khach hang"] },
  { label: "Đơn hàng", icon: "cart", words: ["đơn hàng", "don hang", "giỏ hàng", "gio hang", "sản phẩm", "san pham"] },
];

const visualWords = [
  "cgi",
  "cinematic",
  "documentary",
  "lighting",
  "camera",
  "4k",
  "quality",
  "animation",
  "visualization",
  "microscopic",
  "microscope",
  "anatomy",
  "biology",
  "medical",
  "transparent",
  "labels",
  "national geographic",
  "bbc",
];

const samplePrompt =
  "App đặt lịch nha khoa giúp khách chọn bác sĩ, nhận lịch hẹn, nhắc tái khám và theo dõi quá trình điều trị.";

let currentClip = buildClip(samplePrompt, "friendly", 12);
let animationId = 0;
let startTime = 0;
let isRecording = false;

promptInput.value = samplePrompt;
renderStoryboard(currentClip);
showStartupHint();
drawFrame(currentClip, 0, 0);

generateButton.addEventListener("click", () => {
  const prompt = promptInput.value.trim() || samplePrompt;
  currentClip = buildClip(prompt, "friendly", Number(durationInput.value));
  renderStoryboard(currentClip);
  downloadLink.hidden = true;
  aiVideo.hidden = true;
  aiDownload.hidden = true;
  aiEmpty.hidden = true;
  canvas.hidden = false;
  playButton.hidden = false;
  statusBox.textContent =
    currentClip.mode === "visual"
      ? "Đã chuyển sang chế độ prompt video: không dùng template điện thoại/app."
      : `Đã dựng bối cảnh riêng cho: ${currentClip.domain.label}. Tính năng: ${currentClip.features.map((item) => item.label).join(", ")}.`;
  playClip();
});

playButton.addEventListener("click", () => {
  statusBox.textContent = "Đang phát lại clip.";
  playClip();
});

recordButton.addEventListener("click", async () => {
  if (!isRecording) await recordClip();
});

aiGenerateButton.addEventListener("click", async () => {
  await generateRealVideo();
});

function showStartupHint() {
  if (location.protocol === "file:") {
    statusBox.textContent = "Bạn đang mở file trực tiếp. Muốn tạo video AI thật: chạy python server.py rồi mở http://localhost:4173.";
    aiGenerateButton.disabled = true;
    aiGenerateButton.title = "Cần chạy qua server local để gọi API an toàn.";
    return;
  }
  statusBox.textContent = "Sẵn sàng gọi API. Bấm Tạo video AI thật để render MP4 bằng OpenAI Videos API.";
  fetch("/api/health")
    .then((response) => response.json())
    .then((health) => {
      if (!health.has_key) statusBox.textContent = "Server đang chạy nhưng chưa có OPENAI_API_KEY. Hãy đặt key rồi chạy lại python server.py.";
      else if (!health.has_ffmpeg) statusBox.textContent = "Server đã có API key. Muốn tạo video 5 phút thì cần cài FFmpeg để ghép 25 clip.";
    })
    .catch(() => {
      statusBox.textContent = "Chưa thấy server API. Hãy chạy python server.py rồi mở http://localhost:4173.";
    });
}

function buildClip(prompt, style, seconds) {
  const clean = normalizeText(prompt);
  if (isVisualPrompt(clean)) return buildVisualClip(clean, style, seconds);

  const domain = detectDomain(clean);
  const features = detectFeatures(clean, domain);
  const title = deriveTitle(clean, domain);
  const audience = deriveAudience(clean, domain);
  const palette = palettes[style] || palettes.friendly;

  return {
    title,
    prompt: clean,
    domain,
    features,
    audience,
    palette,
    seconds,
    scenes: [
      { action: "intro", caption: `${title} dành cho ${audience}`, sub: `Một app ${domain.label} được minh họa theo mô tả của bạn.` },
      { action: "problem", caption: "Vấn đề chính", sub: deriveProblem(clean, domain) },
      { action: "features", caption: "Tính năng nổi bật", sub: features.map((item) => item.label).join("  |  ") },
      { action: "outcome", caption: "Kết quả sau khi dùng app", sub: deriveOutcome(clean, domain) },
    ],
  };
}

function isVisualPrompt(text) {
  const low = plain(text);
  return visualWords.filter((word) => low.includes(plain(word))).length >= 2;
}

function buildVisualClip(prompt, style, seconds) {
  const palette = palettes[style] || palettes.friendly;
  const phrases = prompt
    .split(/[,.;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const subject = deriveVisualSubject(prompt);
  const scenes = [
    {
      action: "visual-style",
      caption: subject.title,
      sub: phrases[0] || "Cảnh mở đầu theo mô tả hình ảnh.",
    },
    {
      action: "visual-subject",
      caption: subject.scene,
      sub: phrases[1] || "Chủ thể chính được minh họa bằng hoạt hình.",
    },
    {
      action: "visual-detail",
      caption: "Chi tiết khoa học",
      sub: phrases.slice(2, 5).join("  |  ") || "Nhãn, chuyển động camera và chi tiết cận cảnh.",
    },
    {
      action: "visual-final",
      caption: "Khung hình hoàn thiện",
      sub: phrases.slice(-2).join("  |  ") || "Kết thúc bằng cảnh tổng hợp.",
    },
  ];

  return {
    mode: "visual",
    title: subject.title,
    prompt,
    phrases,
    subject,
    domain: { id: subject.id, label: subject.label, icon: subject.icon },
    features: subject.features,
    audience: "người xem",
    palette,
    seconds,
    scenes,
  };
}

function deriveVisualSubject(text) {
  if (includesAny(text, ["medical", "biology", "anatomy", "microscope", "microscopic", "transparent anatomy", "biomedical"])) {
    return {
      id: "medical-visual",
      label: "minh họa y sinh",
      icon: "health",
      title: "Medical CGI Visualization",
      scene: "Cơ thể, tế bào và kính hiển vi",
      features: [
        { label: "Anatomy", icon: "health" },
        { label: "Microscope", icon: "spark" },
        { label: "Scientific labels", icon: "profile" },
        { label: "Camera motion", icon: "map" },
      ],
    };
  }
  return {
    id: "visual-prompt",
    label: "video prompt",
    icon: "spark",
    title: "Prompt Video",
    scene: "Cảnh hoạt hình theo mô tả",
    features: [
      { label: "Style", icon: "spark" },
      { label: "Subject", icon: "profile" },
      { label: "Motion", icon: "map" },
      { label: "Final shot", icon: "check" },
    ],
  };
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function plain(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function includesAny(text, words) {
  const low = plain(text);
  return words.some((word) => low.includes(plain(word)));
}

function detectDomain(text) {
  return domainRules.find((rule) => includesAny(text, rule.words)) || {
    id: "general",
    label: "dịch vụ số",
    icon: "phone",
    words: [],
  };
}

function detectFeatures(text, domain) {
  const found = featureRules.filter((rule) => includesAny(text, rule.words));
  const domainFeature = { label: titleCase(domain.label), icon: domain.icon };
  const keywords = extractKeywords(text)
    .filter((word) => !found.some((feature) => plain(feature.label).includes(plain(word))))
    .slice(0, 2)
    .map((word) => ({ label: titleCase(word), icon: "spark" }));
  const merged = [domainFeature, ...found, ...keywords];
  return uniqueByLabel(merged).slice(0, 5);
}

function uniqueByLabel(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = plain(item.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractKeywords(text) {
  const stopWords = new Set(
    "app ung dung phan mem cho cua va la voi giup nguoi dung khach hang bang trong khi mot cac nhung de theo tu moi nhan chon qua trinh".split(" ")
  );
  return plain(text)
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .filter((word, index, list) => list.indexOf(word) === index);
}

function deriveTitle(text, domain) {
  const match = text.match(/(?:app|ứng dụng|ung dung|phần mềm|phan mem)\s+([^:,.]{2,42})/i);
  if (match) return titleCase(match[1].replace(/\b(giúp|giup|cho|để|de)\b.*$/i, "").trim());
  return `App ${titleCase(domain.label)}`;
}

function titleCase(text) {
  return String(text)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function deriveAudience(text, domain) {
  const match = text.match(/(?:cho|giúp|giup)\s+([^:,.]{3,38})/i);
  if (match) return match[1].replace(/\b(chọn|chon|nhận|nhan|theo)\b.*$/i, "").trim() || "người dùng";
  if (domain.id === "dental" || domain.id === "health") return "bệnh nhân";
  if (domain.id === "commerce") return "chủ shop";
  if (domain.id === "learning") return "người học";
  return "người dùng";
}

function deriveProblem(text, domain) {
  if (includesAny(text, ["bận rộn", "thiếu thời gian", "ban ron", "thieu thoi gian"])) return "Người dùng thiếu thời gian nên cần thao tác thật nhanh.";
  if (domain.id === "dental") return "Khách khó nhớ lịch hẹn, bác sĩ và quá trình điều trị.";
  if (domain.id === "learning") return "Người học dễ bỏ cuộc khi bài học dài và thiếu động lực.";
  if (domain.id === "commerce") return "Đơn hàng, khách và sản phẩm nằm rải rác.";
  if (domain.id === "delivery") return "Người gửi không biết đơn đang ở đâu và khi nào tới.";
  return "Thông tin bị rối, nhiều thao tác lặp lại và khó theo dõi.";
}

function deriveOutcome(text, domain) {
  if (domain.id === "dental" || domain.id === "health") return "Lịch hẹn rõ ràng, chăm sóc đúng lúc, người dùng yên tâm hơn.";
  if (domain.id === "learning") return "Người học thấy tiến độ mỗi ngày và giữ được nhịp luyện tập.";
  if (domain.id === "commerce") return "Bán hàng nhanh hơn, khách được phục vụ tốt hơn.";
  if (domain.id === "finance") return "Dòng tiền rõ hơn và quyết định chi tiêu tự tin hơn.";
  return "Người dùng hoàn thành việc chính nhanh hơn, ít nhầm lẫn hơn.";
}

function renderStoryboard(clip) {
  scenesList.innerHTML = "";
  clip.scenes.forEach((scene, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${scene.caption} - ${scene.sub}`;
    scenesList.appendChild(item);
  });
  clipTitle.textContent = clip.title;
  clipMeta.textContent = `${clip.seconds} giây / ${clip.scenes.length} cảnh`;
}

function playClip() {
  if (!ctx) {
    statusBox.textContent = "Canvas không khởi tạo được trên trình duyệt này.";
    return;
  }
  cancelAnimationFrame(animationId);
  startTime = performance.now();
  animate(startTime);
}

function animate(now) {
  const elapsed = (now - startTime) / 1000;
  const progress = Math.min(elapsed / currentClip.seconds, 1);
  drawFrame(currentClip, progress, elapsed);
  progressFill.style.width = `${progress * 100}%`;

  if (progress < 1 || isRecording) {
    animationId = requestAnimationFrame(animate);
  } else {
    statusBox.textContent = "Clip đã bám nội dung mô tả hơn. Bạn có thể sửa mô tả rồi tạo lại.";
  }
}

function drawFrame(clip, progress, elapsed) {
  const sceneIndex = Math.min(Math.floor(progress * clip.scenes.length), clip.scenes.length - 1);
  const scene = clip.scenes[sceneIndex];
  const local = progress * clip.scenes.length - sceneIndex;
  const ease = easeInOut(local);
  const [primary, accent, gold, leaf, blue] = clip.palette;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(primary, accent, elapsed);

  if (clip.mode === "visual") {
    drawVisualPromptFrame(clip, sceneIndex, ease, elapsed, primary, accent, gold, leaf, blue);
    drawCaption(scene.caption, scene.sub, ease);
    return;
  }

  drawDomainWorld(clip, progress, elapsed, primary, accent, gold, leaf, blue);
  drawGround(leaf, gold, elapsed);

  if (scene.action === "intro") drawIntro(clip, ease, elapsed, primary, accent, gold);
  if (scene.action === "problem") drawProblem(clip, ease, elapsed, primary, accent, blue);
  if (scene.action === "features") drawFeatures(clip, ease, elapsed, primary, accent, gold, leaf);
  if (scene.action === "outcome") drawOutcome(clip, ease, elapsed, primary, accent, gold, leaf);

  drawCaption(scene.caption, scene.sub, ease);
}

function drawVisualPromptFrame(clip, sceneIndex, ease, elapsed, primary, accent, gold, leaf, blue) {
  if (clip.subject.id === "medical-visual") {
    drawMedicalVisualScene(sceneIndex, ease, elapsed, primary, accent, gold, leaf, blue);
  } else {
    drawGenericVisualScene(clip, sceneIndex, ease, elapsed, primary, accent, gold, blue);
  }
}

function drawMedicalVisualScene(sceneIndex, ease, elapsed, primary, accent, gold, leaf, blue) {
  drawLabBackdrop(primary, blue, elapsed);
  if (sceneIndex === 0) {
    drawMicroscope(315, 420, primary, accent);
    drawCellField(780, 350, elapsed, accent, gold, 1);
    drawBigLabel("National Geographic / BBC style", 630, 545, primary);
  } else if (sceneIndex === 1) {
    drawTransparentBody(410, 430, primary, accent, elapsed);
    drawCellField(890, 340, elapsed, accent, gold, 0.75);
    drawPointerLabel(690, 235, "transparent anatomy", accent);
    drawPointerLabel(735, 405, "biology animation", primary);
  } else if (sceneIndex === 2) {
    drawCellField(510, 350, elapsed, accent, gold, 1.25);
    drawDna(930, 365, primary, gold, elapsed);
    drawPointerLabel(720, 185, "scientific labels", primary);
    drawPointerLabel(850, 510, "microscopic transitions", accent);
  } else {
    drawTransparentBody(360, 430, primary, accent, elapsed);
    drawMicroscope(790, 445, primary, blue);
    drawDna(1050, 330, accent, gold, elapsed);
    drawBigLabel("4K educational biology shot", 655, 555, primary);
  }
}

function drawGenericVisualScene(clip, sceneIndex, ease, elapsed, primary, accent, gold, blue) {
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  roundRect(770, 220, 390, 260, 26);
  ctx.fill();
  const feature = clip.features[sceneIndex] || clip.features[0];
  drawBigIcon(965, 350, feature.icon, [primary, accent, gold, blue][sceneIndex] || primary, 150);
  drawCellField(405, 350, elapsed, accent, gold, 0.6);
  drawPointerLabel(720, 540, clip.phrases[sceneIndex] || feature.label, primary);
}

function drawLabBackdrop(primary, blue, elapsed) {
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let i = 0; i < 6; i += 1) {
    const x = 130 + i * 190;
    ctx.strokeStyle = i % 2 ? primary : blue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, 358 + Math.sin(elapsed + i) * 18, 74 + (i % 3) * 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMicroscope(x, y, primary, accent) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = primary;
  ctx.fillStyle = primary;
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  line(-30, -190, 50, -130);
  line(50, -130, 10, -55);
  ctx.fillStyle = accent;
  roundRect(-78, -218, 90, 42, 18);
  ctx.fill();
  ctx.fillStyle = primary;
  roundRect(-65, -55, 150, 34, 14);
  ctx.fill();
  ctx.strokeStyle = primary;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(8, -12, 86, Math.PI * 0.9, Math.PI * 1.96);
  ctx.stroke();
  ctx.fillStyle = primary;
  roundRect(-95, 88, 245, 38, 18);
  ctx.fill();
  roundRect(-55, 35, 96, 72, 20);
  ctx.fill();
  ctx.restore();
}

function drawCellField(cx, cy, elapsed, accent, gold, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  for (let i = 0; i < 11; i += 1) {
    const angle = i * 0.9 + elapsed * 0.6;
    const radius = 55 + (i % 4) * 34;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle * 1.2) * radius * 0.7;
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.78)" : tint(accent, 0.55);
    circle(x, y, 24 + (i % 3) * 8);
    ctx.fillStyle = i % 2 ? accent : gold;
    circle(x + 4, y - 2, 8 + (i % 2) * 4);
  }
  ctx.restore();
}

function drawTransparentBody(x, y, primary, accent, elapsed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = primary;
  ctx.fillStyle = "rgba(255,255,255,0.52)";
  ctx.lineWidth = 8;
  circle(0, -170, 44);
  roundRect(-52, -118, 104, 178, 46);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  line(0, -88, 0, 42);
  ctx.beginPath();
  ctx.arc(0, -30, 36 + Math.sin(elapsed * 3) * 3, 0, Math.PI * 2);
  ctx.stroke();
  line(-52, -60, -110, 10);
  line(52, -60, 110, 10);
  line(-28, 58, -72, 145);
  line(28, 58, 72, 145);
  ctx.restore();
}

function drawDna(x, y, primary, gold, elapsed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 5;
  for (let i = 0; i < 12; i += 1) {
    const yy = -150 + i * 28;
    const a = elapsed * 2 + i * 0.7;
    const x1 = Math.sin(a) * 42;
    const x2 = Math.sin(a + Math.PI) * 42;
    ctx.strokeStyle = i % 2 ? primary : gold;
    line(x1, yy, x2, yy + 16);
    ctx.fillStyle = primary;
    circle(x1, yy, 7);
    ctx.fillStyle = gold;
    circle(x2, yy + 16, 7);
  }
  ctx.restore();
}

function drawPointerLabel(x, y, text, color) {
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  roundRect(x, y, 250, 48, 12);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "900 18px Inter, Arial";
  fitText(text, x + 18, y + 30, 214, 18);
}

function drawBigLabel(text, x, y, color) {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  roundRect(x, y - 38, 410, 58, 16);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "900 24px Inter, Arial";
  fitText(text, x + 22, y, 360, 24);
}

function drawBackground(primary, accent, elapsed) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, tint(primary, 0.86));
  gradient.addColorStop(1, tint(accent, 0.9));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 13; i += 1) {
    const x = ((i * 148 + elapsed * 22) % 1440) - 90;
    const y = 78 + (i % 4) * 78 + Math.sin(elapsed + i) * 12;
    ctx.fillStyle = `rgba(255,255,255,${0.18 + (i % 3) * 0.04})`;
    roundRect(x, y, 88 + (i % 3) * 30, 23, 12);
    ctx.fill();
  }
}

function drawGround(leaf, gold, elapsed) {
  ctx.fillStyle = tint(leaf, 0.5);
  ctx.beginPath();
  ctx.moveTo(0, 596);
  for (let x = 0; x <= canvas.width; x += 72) {
    ctx.lineTo(x, 588 + Math.sin(elapsed * 1.5 + x * 0.01) * 12);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tint(gold, 0.22);
  ctx.fillRect(0, 656, canvas.width, 64);
}

function drawDomainWorld(clip, progress, elapsed, primary, accent, gold, leaf, blue) {
  const domain = clip.domain.id;
  ctx.save();
  ctx.globalAlpha = 0.92;
  if (domain === "dental") drawDentalWorld(elapsed, primary, accent, gold);
  else if (domain === "health") drawHealthWorld(elapsed, primary, accent, gold);
  else if (domain === "learning") drawLearningWorld(elapsed, primary, accent, gold);
  else if (domain === "commerce") drawCommerceWorld(elapsed, primary, accent, gold);
  else if (domain === "finance") drawFinanceWorld(elapsed, primary, accent, gold);
  else if (domain === "food") drawFoodWorld(elapsed, primary, accent, gold);
  else if (domain === "travel") drawTravelWorld(elapsed, primary, accent, gold);
  else if (domain === "delivery") drawDeliveryWorld(elapsed, primary, accent, gold);
  else if (domain === "fitness") drawFitnessWorld(elapsed, primary, accent, gold);
  else if (domain === "realestate") drawRealEstateWorld(elapsed, primary, accent, gold);
  else if (domain === "productivity") drawProductivityWorld(elapsed, primary, accent, gold);
  else drawGeneralWorld(elapsed, primary, accent, gold, blue);
  ctx.restore();
}

function drawDentalWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  roundRect(820, 235, 245, 185, 28);
  ctx.fill();
  drawBigIcon(945, 325, "tooth", primary, 128);
  ctx.fillStyle = tint(accent, 0.72);
  roundRect(910, 450, 260, 58, 18);
  ctx.fill();
  ctx.fillStyle = "#263138";
  ctx.font = "900 26px Inter, Arial";
  ctx.fillText("Lịch tái khám", 950, 488);
  drawMiniIcon(932, 480, "calendar", primary);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 10;
  line(1110, 308, 1198, 308);
  line(1154, 264, 1154, 352);
}

function drawHealthWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(830, 230, 300, 210, 24);
  ctx.fill();
  drawBigIcon(980, 334, "health", accent, 130);
  drawMiniIcon(850, 475, "bell", primary);
  drawMiniIcon(910, 475, "profile", primary);
  drawMiniIcon(970, 475, "calendar", primary);
  drawPulseLine(1080, 480, gold, elapsed);
}

function drawLearningWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(770, 225, 380, 220, 18);
  ctx.fill();
  ctx.fillStyle = tint(primary, 0.8);
  roundRect(800, 255, 320, 120, 12);
  ctx.fill();
  ctx.fillStyle = primary;
  ctx.font = "900 34px Inter, Arial";
  ctx.fillText("5 phút hôm nay", 835, 325);
  drawBigIcon(965, 468, "book", accent, 108);
  drawBigIcon(1110, 468, "chart", gold, 84);
}

function drawCommerceWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(780, 250, 410, 242, 18);
  ctx.fill();
  ctx.fillStyle = primary;
  roundRect(812, 220, 346, 62, 16);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "900 32px Inter, Arial";
  ctx.fillText("SHOP", 942, 260);
  drawBigIcon(900, 386, "cart", accent, 108);
  drawBigIcon(1062, 386, "wallet", gold, 88);
  drawPriceTag(1110, 482, primary);
}

function drawFinanceWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(805, 240, 355, 230, 24);
  ctx.fill();
  drawBigIcon(930, 355, "wallet", primary, 130);
  drawBigIcon(1080, 356, "chart", accent, 110);
  ctx.fillStyle = gold;
  circle(1118, 252, 28 + Math.sin(elapsed * 3) * 4);
  ctx.fillStyle = "#263138";
  ctx.font = "900 30px Inter, Arial";
  ctx.fillText("$", 1108, 263);
}

function drawFoodWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(790, 244, 390, 232, 26);
  ctx.fill();
  drawBigIcon(910, 360, "food", accent, 130);
  ctx.fillStyle = tint(gold, 0.2);
  roundRect(1000, 298, 130, 128, 18);
  ctx.fill();
  ctx.fillStyle = primary;
  ctx.font = "900 28px Inter, Arial";
  ctx.fillText("MENU", 1028, 345);
  line(1025, 372, 1102, 372);
  line(1025, 398, 1090, 398);
}

function drawTravelWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(770, 230, 410, 252, 22);
  ctx.fill();
  drawBigIcon(920, 362, "map", primary, 130);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(1005, 410);
  ctx.quadraticCurveTo(1085, 300 + Math.sin(elapsed * 2) * 20, 1168, 382);
  ctx.stroke();
  drawPlane(1118, 340, gold);
}

function drawDeliveryWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  roundRect(748, 420, 470, 70, 26);
  ctx.fill();
  const x = 850 + Math.sin(elapsed * 1.7) * 70;
  drawBigIcon(x, 424, "truck", primary, 154);
  drawBigIcon(1120, 326, "map", accent, 96);
  drawMiniIcon(1000, 505, "bell", gold);
}

function drawFitnessWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(790, 238, 380, 238, 26);
  ctx.fill();
  drawBigIcon(930, 356, "fitness", primary, 140);
  drawBigIcon(1080, 350, "chart", accent, 94);
  ctx.fillStyle = gold;
  ctx.font = "900 30px Inter, Arial";
  ctx.fillText("Calo", 1042, 448);
}

function drawRealEstateWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(790, 246, 395, 240, 24);
  ctx.fill();
  drawBigIcon(950, 368, "home", primary, 144);
  drawBigIcon(1110, 350, "map", accent, 88);
  drawPriceTag(1050, 470, gold);
}

function drawProductivityWorld(elapsed, primary, accent, gold) {
  ctx.fillStyle = "#ffffff";
  roundRect(800, 232, 370, 252, 20);
  ctx.fill();
  ["Việc 1", "Việc 2", "Việc 3"].forEach((label, index) => {
    const y = 280 + index * 58;
    drawMiniIcon(850, y, "check", index < 2 ? primary : gold);
    ctx.fillStyle = tint(index < 2 ? primary : accent, 0.82);
    roundRect(885, y - 18, 210, 34, 16);
    ctx.fill();
    ctx.fillStyle = "#263138";
    ctx.font = "800 20px Inter, Arial";
    ctx.fillText(label, 908, y + 7);
  });
}

function drawGeneralWorld(elapsed, primary, accent, gold, blue) {
  ctx.fillStyle = "#ffffff";
  roundRect(805, 230, 360, 240, 24);
  ctx.fill();
  drawBigIcon(932, 350, "phone", primary, 130);
  drawBigIcon(1075, 338, "spark", accent, 98);
  drawPulseLine(1015, 454, gold, elapsed);
}

function drawPulseLine(x, y, color, elapsed) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x - 64, y);
  ctx.lineTo(x - 30, y);
  ctx.lineTo(x - 14, y - 32 - Math.sin(elapsed * 4) * 6);
  ctx.lineTo(x + 10, y + 26);
  ctx.lineTo(x + 30, y - 12);
  ctx.lineTo(x + 64, y - 12);
  ctx.stroke();
}

function drawPriceTag(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-58, -30);
  ctx.lineTo(38, -30);
  ctx.lineTo(62, 0);
  ctx.lineTo(38, 30);
  ctx.lineTo(-58, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  circle(35, 0, 6);
  ctx.font = "900 24px Inter, Arial";
  ctx.fillText("OK", -38, 9);
  ctx.restore();
}

function drawPlane(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-44, -12);
  ctx.lineTo(52, 0);
  ctx.lineTo(-44, 12);
  ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawIntro(clip, ease, elapsed, primary, accent, gold) {
  const phoneX = lerp(-280, 355, ease);
  drawPhone(phoneX, 126, 360, 448, primary, clip.features);
  drawMascot(828 + Math.sin(elapsed * 2.2) * 9, 452, 1.04, accent, primary, elapsed);
  drawIconBadge(890, 218, 112, clip.domain.icon, gold, primary, elapsed);
  drawTextBlock(505, 222, clip.title, `App ${clip.domain.label} cho ${clip.audience}`, primary);
}

function drawProblem(clip, ease, elapsed, primary, accent, blue) {
  drawPerson(308, 457, accent, primary, elapsed);
  drawIconBadge(528, 224, 116, clip.domain.icon, "#ffffff", blue, elapsed);
  drawMessyCards(705, 250, clip.features, elapsed, primary, accent, blue);
  drawWorryMarks(412, 252, ease, primary);
}

function drawFeatures(clip, ease, elapsed, primary, accent, gold, leaf) {
  drawPhone(112 + Math.sin(elapsed) * 7, 118, 330, 462, primary, clip.features);
  clip.features.slice(0, 5).forEach((feature, index) => {
    const x = 540 + (index % 2) * 286;
    const y = 166 + Math.floor(index / 2) * 142;
    drawFeatureCard(x, y, feature, [accent, gold, leaf, primary, "#4f7cac"][index], ease, index, elapsed);
  });
}

function drawOutcome(clip, ease, elapsed, primary, accent, gold, leaf) {
  drawPerson(318, 456, leaf, primary, elapsed);
  drawSuccessBoard(590, 170, clip, ease, primary, accent, gold, leaf);
  drawConfetti(elapsed, primary, accent, gold, leaf);
}

function drawPhone(x, y, width, height, color, features) {
  ctx.save();
  ctx.shadowColor = "rgba(20,54,66,0.22)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = color;
  roundRect(x, y, width, height, 34);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  roundRect(x + 24, y + 42, width - 48, height - 88, 22);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  roundRect(x + width / 2 - 48, y + 18, 96, 10, 5);
  ctx.fill();

  features.slice(0, 4).forEach((feature, index) => {
    const rowY = y + 98 + index * 72;
    ctx.fillStyle = index === 0 ? tint(color, 0.82) : "#f2f6f7";
    roundRect(x + 48, rowY, width - 96, 52, 14);
    ctx.fill();
    drawMiniIcon(x + 77, rowY + 26, feature.icon, color);
    ctx.fillStyle = "#263138";
    ctx.font = "800 20px Inter, Arial";
    ctx.textAlign = "left";
    fitText(feature.label, x + 114, rowY + 33, width - 176, 20);
  });

  ctx.fillStyle = "#f2b84b";
  roundRect(x + 54, y + height - 104, width - 108, 48, 18);
  ctx.fill();
  ctx.fillStyle = "#263138";
  ctx.font = "900 20px Inter, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Bắt đầu", x + width / 2, y + height - 74);
  ctx.restore();
}

function drawPerson(x, y, body, dark, elapsed) {
  ctx.save();
  ctx.translate(x, y + Math.sin(elapsed * 3) * 5);
  ctx.fillStyle = body;
  roundRect(-55, -86, 110, 122, 40);
  ctx.fill();
  ctx.fillStyle = "#fff";
  circle(-22, -42, 12);
  circle(22, -42, 12);
  ctx.fillStyle = dark;
  circle(-19, -41, 5);
  circle(19, -41, 5);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, -16, 21, 0.12, Math.PI - 0.12);
  ctx.stroke();
  ctx.strokeStyle = body;
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(-48, -2);
  ctx.lineTo(-104, -46 + Math.sin(elapsed * 4) * 8);
  ctx.moveTo(48, -2);
  ctx.lineTo(104, -52 + Math.cos(elapsed * 4) * 8);
  ctx.stroke();
  ctx.fillStyle = dark;
  roundRect(-48, 34, 36, 54, 17);
  roundRect(12, 34, 36, 54, 17);
  ctx.fill();
  ctx.restore();
}

function drawMascot(x, y, scale, body, dark, elapsed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawPerson(0, 0, body, dark, elapsed);
  ctx.restore();
}

function drawTextBlock(x, y, title, subtitle, color) {
  ctx.fillStyle = color;
  ctx.font = "900 54px Inter, Arial";
  wrapText(title, x, y, 470, 58);
  ctx.fillStyle = "rgba(30,36,40,0.72)";
  ctx.font = "800 27px Inter, Arial";
  wrapText(subtitle, x, y + 132, 440, 36);
}

function drawIconBadge(x, y, size, icon, bg, color, elapsed) {
  ctx.save();
  ctx.translate(x, y + Math.sin(elapsed * 2) * 8);
  ctx.fillStyle = bg;
  ctx.shadowColor = "rgba(20,54,66,0.16)";
  ctx.shadowBlur = 20;
  roundRect(-size / 2, -size / 2, size, size, 24);
  ctx.fill();
  ctx.shadowColor = "transparent";
  drawBigIcon(0, 0, icon, color, size * 0.64);
  ctx.restore();
}

function drawMessyCards(x, y, features, elapsed, primary, accent, blue) {
  [primary, accent, blue].forEach((color, index) => {
    const feature = features[index] || features[0];
    ctx.save();
    ctx.translate(x + index * 94, y + Math.sin(elapsed * 2 + index) * 16);
    ctx.rotate((-0.18 + index * 0.13) * Math.sin(elapsed + index));
    ctx.fillStyle = "#fff";
    roundRect(-62, -46, 172, 118, 12);
    ctx.fill();
    drawMiniIcon(-30, -8, feature.icon, color);
    ctx.fillStyle = "#263138";
    ctx.font = "800 18px Inter, Arial";
    fitText(feature.label, 0, -2, 94, 18);
    ctx.fillStyle = "rgba(30,36,40,0.16)";
    roundRect(-36, 30, 112, 12, 6);
    ctx.fill();
    ctx.restore();
  });
}

function drawWorryMarks(x, y, ease, color) {
  ctx.save();
  ctx.globalAlpha = ease;
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  [["?", -28, -18], ["!", 28, 18], ["?", 76, -28]].forEach(([mark, dx, dy]) => {
    ctx.font = "900 44px Inter, Arial";
    ctx.fillStyle = color;
    ctx.fillText(mark, x + dx, y + dy);
  });
  ctx.restore();
}

function drawFeatureCard(x, y, feature, color, ease, index, elapsed) {
  const pop = easeInOut(Math.min(1, Math.max(0, ease * 1.35 - index * 0.12)));
  ctx.save();
  ctx.translate(x, y + Math.sin(elapsed * 2 + index) * 5);
  ctx.scale(pop, pop);
  ctx.fillStyle = "#ffffff";
  roundRect(-92, -58, 238, 116, 18);
  ctx.fill();
  drawMiniIcon(-44, 0, feature.icon, color);
  ctx.fillStyle = "#263138";
  ctx.font = "900 25px Inter, Arial";
  ctx.textAlign = "left";
  wrapText(feature.label, 0, -8, 118, 30);
  ctx.restore();
}

function drawSuccessBoard(x, y, clip, ease, primary, accent, gold, leaf) {
  ctx.fillStyle = "#ffffff";
  roundRect(x, y, 438, 278, 18);
  ctx.fill();
  ctx.fillStyle = "#263138";
  ctx.font = "900 29px Inter, Arial";
  ctx.fillText("Hoàn thành", x + 42, y + 48);
  clip.features.slice(0, 3).forEach((feature, index) => {
    const rowY = y + 88 + index * 58;
    ctx.fillStyle = tint([primary, accent, leaf][index], 0.82);
    roundRect(x + 42, rowY, 340 * ease, 36, 18);
    ctx.fill();
    drawMiniIcon(x + 70, rowY + 18, feature.icon, [primary, accent, leaf][index]);
    ctx.fillStyle = "#263138";
    ctx.font = "800 20px Inter, Arial";
    ctx.fillText(feature.label, x + 108, rowY + 25);
  });
  drawBigIcon(x + 356, y + 204, "check", gold, 80);
}

function drawMiniIcon(x, y, type, color) {
  drawBigIcon(x, y, type, color, 34);
}

function drawBigIcon(x, y, type, color, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(4, size * 0.09);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const s = size;

  if (type === "tooth") {
    ctx.beginPath();
    ctx.moveTo(-0.32 * s, -0.28 * s);
    ctx.bezierCurveTo(-0.55 * s, -0.62 * s, -0.1 * s, -0.72 * s, 0, -0.44 * s);
    ctx.bezierCurveTo(0.12 * s, -0.72 * s, 0.56 * s, -0.62 * s, 0.32 * s, -0.28 * s);
    ctx.bezierCurveTo(0.18 * s, -0.05 * s, 0.2 * s, 0.32 * s, 0.08 * s, 0.52 * s);
    ctx.bezierCurveTo(0, 0.66 * s, -0.08 * s, 0.66 * s, -0.13 * s, 0.48 * s);
    ctx.bezierCurveTo(-0.18 * s, 0.28 * s, -0.28 * s, 0.28 * s, -0.34 * s, 0.52 * s);
    ctx.bezierCurveTo(-0.44 * s, 0.74 * s, -0.55 * s, 0.5 * s, -0.45 * s, 0.15 * s);
    ctx.bezierCurveTo(-0.4 * s, -0.05 * s, -0.42 * s, -0.18 * s, -0.32 * s, -0.28 * s);
    ctx.fill();
  } else if (type === "health") {
    ctx.fillRect(-0.12 * s, -0.5 * s, 0.24 * s, s);
    ctx.fillRect(-0.5 * s, -0.12 * s, s, 0.24 * s);
  } else if (type === "book") {
    ctx.strokeRect(-0.46 * s, -0.42 * s, 0.38 * s, 0.84 * s);
    ctx.strokeRect(0.08 * s, -0.42 * s, 0.38 * s, 0.84 * s);
    line(0, -0.42 * s, 0, 0.42 * s);
  } else if (type === "calendar") {
    ctx.strokeRect(-0.48 * s, -0.36 * s, 0.96 * s, 0.76 * s);
    line(-0.48 * s, -0.12 * s, 0.48 * s, -0.12 * s);
    circle(-0.2 * s, 0.14 * s, 0.08 * s);
    circle(0.18 * s, 0.14 * s, 0.08 * s);
  } else if (type === "cart") {
    ctx.strokeRect(-0.35 * s, -0.18 * s, 0.62 * s, 0.34 * s);
    line(-0.48 * s, -0.38 * s, -0.35 * s, -0.18 * s);
    circle(-0.2 * s, 0.34 * s, 0.08 * s);
    circle(0.22 * s, 0.34 * s, 0.08 * s);
  } else if (type === "chart") {
    line(-0.42 * s, 0.38 * s, 0.44 * s, 0.38 * s);
    ctx.fillRect(-0.34 * s, 0.02 * s, 0.18 * s, 0.36 * s);
    ctx.fillRect(-0.06 * s, -0.2 * s, 0.18 * s, 0.58 * s);
    ctx.fillRect(0.22 * s, -0.42 * s, 0.18 * s, 0.8 * s);
  } else if (type === "wallet") {
    ctx.strokeRect(-0.46 * s, -0.28 * s, 0.92 * s, 0.58 * s);
    ctx.strokeRect(0.1 * s, -0.08 * s, 0.36 * s, 0.24 * s);
    circle(0.22 * s, 0.04 * s, 0.04 * s);
  } else if (type === "map") {
    line(-0.44 * s, 0.38 * s, -0.18 * s, -0.34 * s);
    line(-0.18 * s, -0.34 * s, 0.16 * s, 0.32 * s);
    line(0.16 * s, 0.32 * s, 0.44 * s, -0.38 * s);
    circle(0.02 * s, -0.06 * s, 0.12 * s);
  } else if (type === "truck") {
    ctx.strokeRect(-0.5 * s, -0.16 * s, 0.58 * s, 0.34 * s);
    ctx.strokeRect(0.08 * s, -0.04 * s, 0.34 * s, 0.22 * s);
    circle(-0.26 * s, 0.28 * s, 0.08 * s);
    circle(0.26 * s, 0.28 * s, 0.08 * s);
  } else if (type === "fitness") {
    line(-0.48 * s, 0, 0.48 * s, 0);
    line(-0.35 * s, -0.2 * s, -0.35 * s, 0.2 * s);
    line(0.35 * s, -0.2 * s, 0.35 * s, 0.2 * s);
  } else if (type === "food") {
    line(-0.28 * s, -0.44 * s, -0.28 * s, 0.44 * s);
    line(-0.42 * s, -0.42 * s, -0.14 * s, -0.42 * s);
    line(0.2 * s, -0.44 * s, 0.2 * s, 0.44 * s);
    ctx.arc(0.2 * s, -0.22 * s, 0.18 * s, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();
  } else if (type === "home") {
    ctx.beginPath();
    ctx.moveTo(-0.48 * s, -0.05 * s);
    ctx.lineTo(0, -0.48 * s);
    ctx.lineTo(0.48 * s, -0.05 * s);
    ctx.stroke();
    ctx.strokeRect(-0.34 * s, -0.05 * s, 0.68 * s, 0.46 * s);
  } else if (type === "bell") {
    ctx.beginPath();
    ctx.arc(0, -0.05 * s, 0.32 * s, Math.PI, 0);
    ctx.lineTo(0.36 * s, 0.3 * s);
    ctx.lineTo(-0.36 * s, 0.3 * s);
    ctx.closePath();
    ctx.stroke();
    circle(0, 0.42 * s, 0.07 * s);
  } else if (type === "ai" || type === "spark") {
    ctx.beginPath();
    ctx.moveTo(0, -0.5 * s);
    ctx.lineTo(0.14 * s, -0.12 * s);
    ctx.lineTo(0.5 * s, 0);
    ctx.lineTo(0.14 * s, 0.12 * s);
    ctx.lineTo(0, 0.5 * s);
    ctx.lineTo(-0.14 * s, 0.12 * s);
    ctx.lineTo(-0.5 * s, 0);
    ctx.lineTo(-0.14 * s, -0.12 * s);
    ctx.closePath();
    ctx.fill();
  } else if (type === "profile") {
    circle(0, -0.22 * s, 0.18 * s);
    ctx.beginPath();
    ctx.arc(0, 0.36 * s, 0.34 * s, Math.PI, 0);
    ctx.stroke();
  } else if (type === "check") {
    line(-0.42 * s, 0, -0.12 * s, 0.32 * s);
    line(-0.12 * s, 0.32 * s, 0.46 * s, -0.32 * s);
  } else {
    ctx.strokeRect(-0.34 * s, -0.48 * s, 0.68 * s, 0.96 * s);
    circle(0, 0.34 * s, 0.04 * s);
  }
  ctx.restore();
}

function drawConfetti(elapsed, ...colors) {
  for (let i = 0; i < 60; i += 1) {
    const x = (i * 97) % canvas.width;
    const y = ((i * 53 + elapsed * 118) % 620) - 40;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(elapsed * 2 + i);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-5, -9, 10, 18);
    ctx.restore();
  }
}

function drawCaption(title, subtitle, ease) {
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(70, 48, 680, 120, 18);
  ctx.fill();
  ctx.fillStyle = "#1e2428";
  ctx.font = "900 34px Inter, Arial";
  wrapText(title, 96, 92, 620, 38);
  ctx.fillStyle = "rgba(30,36,40,0.68)";
  ctx.font = "800 21px Inter, Arial";
  wrapText(subtitle, 98, 132, 600, 27);
  ctx.fillStyle = "rgba(15,139,141,0.16)";
  roundRect(70, 176, 680, 8, 4);
  ctx.fill();
  ctx.fillStyle = "#0f8b8d";
  roundRect(70, 176, 680 * ease, 8, 4);
  ctx.fill();
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function circle(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let lineText = "";
  let lineY = y;
  words.forEach((word, index) => {
    const testLine = `${lineText}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && index > 0) {
      ctx.fillText(lineText.trim(), x, lineY);
      lineText = `${word} `;
      lineY += lineHeight;
    } else {
      lineText = testLine;
    }
  });
  ctx.fillText(lineText.trim(), x, lineY);
}

function fitText(text, x, y, maxWidth, baseSize) {
  let size = baseSize;
  ctx.font = `900 ${size}px Inter, Arial`;
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 1;
    ctx.font = `900 ${size}px Inter, Arial`;
  }
  ctx.fillText(text, x, y);
}

function easeInOut(value) {
  const t = Math.max(0, Math.min(1, value));
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function tint(hex, amount) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

async function recordClip() {
  if (!canvas.captureStream || !window.MediaRecorder) {
    statusBox.textContent = "Trình duyệt hiện tại chưa hỗ trợ xuất video từ canvas.";
    return;
  }

  isRecording = true;
  generateButton.disabled = true;
  recordButton.disabled = true;
  playButton.disabled = true;
  downloadLink.hidden = true;
  statusBox.textContent = "Đang xuất video, vui lòng đợi vài giây.";

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };

  const finished = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  recorder.start();
  playClip();
  await new Promise((resolve) => setTimeout(resolve, currentClip.seconds * 1000 + 250));
  recorder.stop();
  await finished;
  stream.getTracks().forEach((track) => track.stop());

  const blob = new Blob(chunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = `${plain(currentClip.title).replace(/[^\w-]+/g, "-")}-clip.webm`;
  downloadLink.hidden = false;
  downloadLink.textContent = "Mở video vừa xuất";

  isRecording = false;
  generateButton.disabled = false;
  recordButton.disabled = false;
  playButton.disabled = false;
  statusBox.textContent = "Đã xuất video .webm thành công.";
}

async function generateRealVideo() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    statusBox.textContent = "Bạn nhập prompt video trước đã nhé.";
    return;
  }

  if (location.protocol === "file:") {
    statusBox.textContent = "Bạn đang mở file trực tiếp nên không gọi được API. Hãy chạy python server.py rồi mở http://localhost:4173.";
    return;
  }

  aiGenerateButton.disabled = true;
  generateButton.disabled = true;
  aiVideo.hidden = true;
  aiDownload.hidden = true;
  aiEmpty.hidden = false;
  canvas.hidden = true;
  playButton.hidden = true;
  statusBox.textContent = "Đang gửi prompt lên API tạo video thật...";

  try {
    const selectedSeconds = Number(durationInput.value) || 12;
    if (selectedSeconds > 12) {
      await generateProjectVideo(prompt, selectedSeconds);
    } else {
      await generateSingleSoraVideo(prompt, selectedSeconds);
    }
  } catch (error) {
    statusBox.textContent = `Không tạo được video AI: ${error.message}`;
  } finally {
    aiGenerateButton.disabled = false;
    generateButton.disabled = false;
  }
}

async function generateSingleSoraVideo(prompt, selectedSeconds) {
  const seconds = String(selectedSeconds);
  const created = await apiJson("/api/generate-video", {
    method: "POST",
    body: JSON.stringify({
      model: aiModelInput.value || "sora-2",
      prompt,
      seconds,
      size: aiSizeInput.value || "1280x720",
    }),
  });

  if (!created.id) throw new Error(created.error || "API không trả về video id.");
  statusBox.textContent = `Đã tạo job ${created.id}. Đang render: ${created.status || "queued"}...`;

  let video = created;
  while (video.status === "queued" || video.status === "in_progress") {
    await wait(2500);
    video = await apiJson(`/api/video-status/${video.id}`);
    const progress = Number(video.progress || 0);
    progressFill.style.width = `${Math.max(4, progress)}%`;
    statusBox.textContent = `Đang render video AI: ${video.status}, ${progress.toFixed(0)}%.`;
  }

  if (video.status === "failed") {
    throw new Error(video.error?.message || "Video generation failed.");
  }

  const videoUrl = `/api/video-content/${video.id}`;
  aiVideo.src = videoUrl;
  aiVideo.hidden = false;
  aiEmpty.hidden = true;
  aiDownload.href = videoUrl;
  aiDownload.download = `${plain(currentClip.title || "ai-video")}.mp4`;
  aiDownload.hidden = false;
  progressFill.style.width = "100%";
  statusBox.textContent = "Video AI thật đã render xong.";
}

async function generateProjectVideo(prompt, totalSeconds) {
  statusBox.textContent = "Đang tạo script, terms và storyboard kiểu MoneyPrinterTurbo.";
  const created = await apiJson("/api/generate-project-video", {
    method: "POST",
    body: JSON.stringify({
      model: aiModelInput.value || "sora-2",
      prompt,
      total_seconds: totalSeconds,
      segment_seconds: Math.min(totalSeconds, 12),
      size: aiSizeInput.value || "1280x720",
    }),
  });

  let job = created;
  renderServerStoryboard(job);
  clipTitle.textContent = "Pipeline video AI";
  clipMeta.textContent = `${job.total_scenes} cảnh / ${Math.ceil(totalSeconds / 60)} phút mục tiêu`;
  statusBox.textContent = job.message;

  while (job.status === "queued" || job.status === "in_progress") {
    await wait(5000);
    job = await apiJson(`/api/long-video-status/${job.id}`);
    renderServerStoryboard(job);
    progressFill.style.width = `${Math.max(2, Number(job.progress || 0))}%`;
    statusBox.textContent = `${job.message} (${job.done_scenes}/${job.total_scenes}, ${Number(job.progress || 0).toFixed(0)}%)`;
  }

  if (job.status === "failed") {
    throw new Error(job.error || job.message || "Pipeline thất bại.");
  }

  const videoUrl = `/api/long-video-content/${job.id}`;
  aiVideo.src = videoUrl;
  aiVideo.hidden = false;
  aiEmpty.hidden = true;
  aiDownload.href = videoUrl;
  aiDownload.download = `${plain(currentClip.title || "moneyprinter-style-video")}.mp4`;
  aiDownload.hidden = false;
  progressFill.style.width = "100%";
  statusBox.textContent = "Pipeline hoàn tất: script, scenes, subtitles và final MP4 đã xong.";
}

async function generateLongVideo(prompt, totalSeconds) {
  statusBox.textContent = "Đang tạo job video dài: 25 clip Sora x 12 giây.";
  const created = await apiJson("/api/generate-long-video", {
    method: "POST",
    body: JSON.stringify({
      model: aiModelInput.value || "sora-2",
      prompt,
      total_seconds: totalSeconds,
      segment_seconds: 12,
      size: aiSizeInput.value || "1280x720",
    }),
  });

  let job = created;
  statusBox.textContent = job.message;
  while (job.status === "queued" || job.status === "in_progress") {
    await wait(5000);
    job = await apiJson(`/api/long-video-status/${job.id}`);
    progressFill.style.width = `${Math.max(2, Number(job.progress || 0))}%`;
    statusBox.textContent = `${job.message} (${job.done_scenes}/${job.total_scenes}, ${Number(job.progress || 0).toFixed(0)}%)`;
  }

  if (job.status === "failed") {
    throw new Error(job.error || job.message || "Tạo video dài thất bại.");
  }

  const videoUrl = `/api/long-video-content/${job.id}`;
  aiVideo.src = videoUrl;
  aiVideo.hidden = false;
  aiEmpty.hidden = true;
  aiDownload.href = videoUrl;
  aiDownload.download = `${plain(currentClip.title || "sora-long-video")}.mp4`;
  aiDownload.hidden = false;
  progressFill.style.width = "100%";
  statusBox.textContent = "Video dài đã ghép xong.";
}

function renderServerStoryboard(job) {
  if (!job || !Array.isArray(job.scenes)) return;
  scenesList.innerHTML = "";
  job.scenes.forEach((scene) => {
    const item = document.createElement("li");
    item.textContent = `${scene.index}. ${scene.title} - ${scene.narration}`;
    scenesList.appendChild(item);
  });
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("OpenAI báo 401 Unauthorized: API key sai, hết hiệu lực, hoặc chưa cấu hình đúng trên server/hosting.");
    }
    throw new Error(data.error?.message || data.error || `HTTP ${response.status}`);
  }
  return data;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
