// 가상 상황극 스타일 쇼츠 (채널 바 + 커뮤니티 글 제목 + 강조 자막 + 장면 이미지)
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";

import { synthesize, ttsEnabled } from "./tts.mjs";
import { audioDuration } from "./video.mjs";

const run = promisify(execFile);
const require = createRequire(import.meta.url);

const W = 1080;
const H = 1920;
const COLORS = {
  band: "#F9D5CC",
  coverBand: "#3C3734",
  coverTitleBand: "#4B4842",
  ink: "#111111",
  gray: "#8A8A8A",
  highlight: "#F04E2B",
  coverHighlight: "#F9B29B",
  placeholder: "#F4EFEA",
};
const DISCLOSURE = "가상 상황극 · 쿠팡 파트너스 활동으로 수수료를 제공받을 수 있습니다";
const PARTNERS_NOTICE = "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

function registerFonts() {
  const dir = path.join(path.dirname(require.resolve("pretendard/package.json")), "dist/public/static");
  GlobalFonts.registerFromPath(path.join(dir, "Pretendard-Black.otf"), "PretendardBlack");
  GlobalFonts.registerFromPath(path.join(dir, "Pretendard-ExtraBold.otf"), "PretendardExtraBold");
  GlobalFonts.registerFromPath(path.join(dir, "Pretendard-Medium.otf"), "PretendardMedium");
  // 채널 이름·표지 제목은 Black Han Sans, 글 제목·자막은 Do Hyeon (fonts/, OFL)
  const fonts = path.join(ROOT, "fonts");
  GlobalFonts.registerFromPath(path.join(fonts, "BlackHanSans-Regular.ttf"), "BlackHanSans");
  GlobalFonts.registerFromPath(path.join(fonts, "DoHyeon-Regular.ttf"), "DoHyeon");
}

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const AVATAR = path.join(ROOT, "assets/avatar.png");

/**
 * 대본 형식 (story.example.txt 참고)
 *   채널: 채널이름
 *   표지: 첫째 줄 / **강조할 둘째 줄**
 *   글제목: 자취 원룸 1탄. 겨울 저녁 한 그릇
 *   표지이미지: cover.jpg
 *   링크: https://link.coupang.com/...
 *   설명: ...      (여러 줄 가능)
 *   해시태그: #a #b
 *
 *   자막 1줄 / 자막 2줄 **강조** | 이미지파일 | 화면 설명
 */
export function parseStory(text) {
  const story = { channel: "채널이름", cover: [], postTitle: "", coverImage: "", link: "", description: "", hashtags: [], cuts: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const meta = line.match(/^(채널|표지|글제목|표지이미지|링크|설명|해시태그)\s*[:：]\s*(.*)$/);
    if (meta) {
      const [, key, value] = meta;
      if (key === "채널") story.channel = value;
      else if (key === "표지") story.cover = value.split("/").map((s) => s.trim());
      else if (key === "글제목") story.postTitle = value;
      else if (key === "표지이미지") story.coverImage = value;
      else if (key === "링크") story.link = value;
      else if (key === "설명") story.description = story.description ? `${story.description}\n${value}` : value;
      else story.hashtags = value.split(/\s+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`));
      continue;
    }
    const [captionPart, image = "", note = ""] = line.split("|").map((s) => s.trim());
    const lines = captionPart.split("/").map((s) => s.trim()).filter(Boolean);
    story.cuts.push({ lines, image, note, narration: lines.join(" ").replace(/\*\*/g, "") });
  }
  if (!story.cuts.length) throw new Error("대본에 장면이 없습니다.");
  return story;
}

// "**강조**" 표시를 [{text, hl}] 조각으로
function segments(line) {
  return line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) =>
    s.startsWith("**") ? { text: s.slice(2, -2), hl: true } : { text: s, hl: false });
}

function drawRichLine(ctx, line, cx, y, { font, color, hlColor }) {
  ctx.font = font;
  const parts = segments(line);
  const total = parts.reduce((s, p) => s + ctx.measureText(p.text).width, 0);
  let x = cx - total / 2;
  for (const p of parts) {
    ctx.fillStyle = p.hl ? hlColor : color;
    ctx.fillText(p.text, x, y);
    x += ctx.measureText(p.text).width;
  }
}

// 긴 글은 maxWidth 에 맞춰 폰트 크기를 줄인다
function fitFont(ctx, text, family, size, maxWidth) {
  let s = size;
  ctx.font = `${s}px ${family}`;
  while (s > 20 && ctx.measureText(text.replace(/\*\*/g, "")).width > maxWidth) {
    s -= 2;
    ctx.font = `${s}px ${family}`;
  }
  return `${s}px ${family}`;
}

function drawChevron(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (const dx of [0, 34]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y - 40);
    ctx.lineTo(x + dx + 40, y);
    ctx.lineTo(x + dx, y + 40);
    ctx.stroke();
  }
}

function drawPaw(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  const ellipse = (cx, cy, rx, ry) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  ellipse(x, y + 18, 22, 30);
  for (const [dx, dy] of [[-34, -26], [-12, -42], [12, -42], [34, -26]]) ellipse(x + dx, y + dy, 9, 12);
}

function drawImageCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function drawPlaceholder(ctx, x, y, w, h, note) {
  ctx.fillStyle = COLORS.placeholder;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#D9CFC6";
  ctx.setLineDash([18, 14]);
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 40, y + 40, w - 80, h - 80);
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.fillStyle = "#B0A49A";
  ctx.font = "44px PretendardExtraBold";
  ctx.fillText("이미지 자리", x + w / 2, y + h / 2 - 30);
  if (note) {
    ctx.font = fitFont(ctx, note, "PretendardMedium", 40, w - 140);
    ctx.fillText(note, x + w / 2, y + h / 2 + 40);
  }
  ctx.textAlign = "left";
}

// 박스 안에 잘리지 않게 맞추고 위쪽·가운데 정렬 (장면 그림은 가로 꽉, 정사각 제품 사진은 가운데)
function drawImageContain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y, dw, img.height * scale);
}

async function sceneImage(ctx, file, baseDir, box, note, { fit = "cover" } = {}) {
  const p = file && path.resolve(baseDir, file);
  const draw = fit === "contain" ? drawImageContain : drawImageCover;
  if (p && existsSync(p)) draw(ctx, await loadImage(p), ...box);
  else drawPlaceholder(ctx, ...box, note || file);
}

function drawDisclosure(ctx, color = COLORS.gray) {
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.font = "30px PretendardMedium";
  ctx.fillText(DISCLOSURE, W / 2, H - 50);
  ctx.textAlign = "left";
}

function drawHeader(ctx, story, avatar) {
  ctx.fillStyle = COLORS.band;
  ctx.fillRect(0, 0, W, 236);
  drawChevron(ctx, 108, 118, COLORS.ink);
  drawPaw(ctx, 924, 128, COLORS.ink);
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.ink;
  ctx.font = fitFont(ctx, story.channel, "BlackHanSans", 96, 560);
  ctx.fillText(story.channel, W / 2, 152);
  ctx.textAlign = "left";

  // 커뮤니티 글처럼 보이는 영역
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 236, W, 284);
  ctx.fillStyle = COLORS.band;
  ctx.fillRect(85, 267, 140, 128);
  if (avatar) ctx.drawImage(avatar, 85, 267, 140, 128);
  else {
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.ink;
    ctx.font = "72px BlackHanSans";
    ctx.fillText([...story.channel][0] ?? "", 155, 357);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = COLORS.ink;
  ctx.font = "52px BlackHanSans";
  ctx.fillText(story.channel, 252, 318);
  ctx.fillStyle = COLORS.gray;
  ctx.font = "30px PretendardMedium";
  ctx.fillText(`${story.channel}  |  02:09  |  댓글 9999`, 252, 382);
  ctx.fillStyle = COLORS.ink;
  ctx.font = fitFont(ctx, story.postTitle, "DoHyeon", 66, W - 170);
  ctx.fillText(story.postTitle, 85, 468);
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 517, W, 3);
}

async function renderCutFrame(story, cut, visibleLines, baseDir, avatar) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, story, avatar);
  cut.lines.slice(0, visibleLines).forEach((line, i) => {
    const font = fitFont(ctx, line, "DoHyeon", 66, W - 120);
    drawRichLine(ctx, line, W / 2, 632 + i * 92, { font, color: COLORS.ink, hlColor: COLORS.highlight });
  });
  await sceneImage(ctx, cut.image, baseDir, [0, 790, W, 820], cut.note, { fit: "contain" });
  drawDisclosure(ctx);
  return canvas.encode("png");
}

async function renderCoverFrame(story, baseDir) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COLORS.coverBand;
  ctx.fillRect(0, 0, W, H);
  drawChevron(ctx, 108, 118, COLORS.ink);
  drawPaw(ctx, 924, 128, COLORS.ink);
  ctx.fillStyle = COLORS.coverTitleBand;
  ctx.fillRect(0, 236, W, 328);
  story.cover.forEach((line, i) => {
    const font = fitFont(ctx, line, "BlackHanSans", 124, W - 120);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 6;
    drawRichLine(ctx, line, W / 2, 358 + i * 136, { font, color: "#FFFFFF", hlColor: COLORS.coverHighlight });
    ctx.restore();
  });
  // 글 제목 띠 (위아래로 살짝 그림자)
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 564, W, 3);
  const band = ctx.createLinearGradient(0, 567, 0, 692);
  band.addColorStop(0, "#C6C4C1");
  band.addColorStop(0.15, "#F3F5F5");
  band.addColorStop(0.8, "#EDEDED");
  band.addColorStop(1, "#BBBBB9");
  ctx.fillStyle = band;
  ctx.fillRect(0, 567, W, 125);
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.ink;
  ctx.font = fitFont(ctx, story.postTitle, "DoHyeon", 62, W - 120);
  ctx.fillText(story.postTitle, W / 2, 652);
  ctx.textAlign = "left";
  await sceneImage(ctx, story.coverImage, baseDir, [0, 700, W, 1060], "표지 이미지 (음식 사진 추천)");
  drawDisclosure(ctx, "#DDDDDD");
  return canvas.encode("png");
}

async function loadVoices(dir, expected) {
  const files = (await fs.readdir(dir))
    .map((f) => ({ f, n: Number(f.match(/^audio_(\d+)_/)?.[1]) }))
    .filter((v) => Number.isInteger(v.n))
    .sort((a, b) => a.n - b.n)
    .map((v) => path.join(dir, v.f));
  if (files.length !== expected) {
    throw new Error(`${dir} 의 음성 파일이 ${files.length}개입니다. 표지 1개 + 장면 ${expected - 1}개 = ${expected}개가 필요합니다.`);
  }
  return files;
}

/**
 * @param {string} scriptFile 대본 파일
 * @param {string} outDir     결과 폴더
 * @param {{bgm?: string, tempo?: number}} options
 */
export async function makeStoryShort(scriptFile, outDir, { bgm, tempo = 1.3 } = {}) {
  registerFonts();
  const baseDir = path.dirname(path.resolve(scriptFile));
  const story = parseStory(await fs.readFile(scriptFile, "utf8"));
  const work = path.join(outDir, "work");
  await fs.mkdir(work, { recursive: true });

  const frames = []; // {file, duration}
  const audio = []; // {file|null, duration}

  // 직접 받은 나레이션: <대본이름>/voice/ 에 Typecast "문장 별로 나누기" mp3 (audio_0_ = 표지, audio_N_ = N번째 장면)
  const voiceDir = path.join(baseDir, path.basename(scriptFile).replace(/\.[^.]+$/, ""), "voice");
  const voices = existsSync(voiceDir) ? await loadVoices(voiceDir, story.cuts.length + 1) : null;
  const speedUp = async (index, id) => {
    const out = `narration_${id}.m4a`;
    await run("ffmpeg", ["-y", "-loglevel", "error", "-i", voices[index], "-filter:a", `atempo=${tempo}`, path.join(work, out)]);
    return { file: out, duration: (await audioDuration(path.join(work, out))) + 0.15 };
  };

  const cover = voices ? await speedUp(0, "cover") : { file: null, duration: 1.6 };
  const coverDuration = Math.max(1.6, cover.duration);
  await fs.writeFile(path.join(work, "cover.png"), await renderCoverFrame(story, baseDir));
  frames.push({ file: "cover.png", duration: coverDuration });
  audio.push({ file: cover.file, duration: coverDuration });

  const avatar = existsSync(AVATAR) ? await loadImage(AVATAR) : null;
  const useTts = ttsEnabled();
  for (const [i, cut] of story.cuts.entries()) {
    const id = String(i).padStart(2, "0");
    let narration = null;
    let duration;
    if (voices) {
      ({ file: narration, duration } = await speedUp(i + 1, id));
    } else if (useTts) {
      narration = `narration_${id}.mp3`;
      await synthesize(cut.narration, path.join(work, narration));
      duration = (await audioDuration(path.join(work, narration))) + 0.15;
    } else {
      duration = Math.max(1.5, [...cut.narration].length / 9);
    }
    // 첫 줄만 → 전체 순서로 한 줄씩 등장
    const steps = cut.lines.length;
    for (let s = 1; s <= steps; s++) {
      const file = `cut_${id}_${s}.png`;
      await fs.writeFile(path.join(work, file), await renderCutFrame(story, cut, s, baseDir, avatar));
      const share = steps === 1 ? 1 : s === 1 ? 0.4 : 0.6 / (steps - 1);
      frames.push({ file, duration: duration * share });
    }
    audio.push({ file: narration, duration });
    console.log(`  · 장면 ${i + 1}/${story.cuts.length}`);
  }

  // 영상 트랙: 이미지 시퀀스
  const list = frames.map((f) => `file '${f.file}'\nduration ${f.duration.toFixed(3)}`).join("\n")
    + `\nfile '${frames.at(-1).file}'\n`;
  await fs.writeFile(path.join(work, "frames.txt"), list);

  // 음성 트랙: 장면 길이에 맞춰 나레이션을 자르거나 무음으로 채움
  const total = frames.reduce((s, f) => s + f.duration, 0);
  const inputs = [];
  const filters = [];
  audio.forEach((a, i) => {
    if (a.file) inputs.push("-i", a.file);
    else inputs.push("-f", "lavfi", "-t", a.duration.toFixed(3), "-i", "anullsrc=r=44100:cl=stereo");
    filters.push(`[${i}:a]aresample=44100,aformat=channel_layouts=stereo,apad,atrim=0:${a.duration.toFixed(3)}[a${i}]`);
  });
  let mix = `${audio.map((_, i) => `[a${i}]`).join("")}concat=n=${audio.length}:v=0:a=1[voice]`;
  let outLabel = "[voice]";
  if (bgm) {
    inputs.push("-stream_loop", "-1", "-i", path.resolve(bgm));
    mix += `;[${audio.length}:a]volume=0.18,atrim=0:${total.toFixed(3)}[bg];[voice][bg]amix=inputs=2:duration=first:normalize=0[mix]`;
    outLabel = "[mix]";
  }
  await run("ffmpeg", [
    "-y", "-loglevel", "error", ...inputs,
    "-filter_complex", `${filters.join(";")};${mix}`,
    "-map", outLabel, "-c:a", "aac", "-b:a", "160k", "audio.m4a",
  ], { cwd: work });

  const outFile = path.join(outDir, "short.mp4");
  await run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", "frames.txt", "-i", "audio.m4a",
    "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-c:a", "copy", "-shortest", "-movflags", "+faststart", outFile,
  ], { cwd: work });

  const link = story.link || "[여기에 파트너스 링크]";
  const title = story.cover.join(" ").replace(/\*\*/g, "");
  await fs.writeFile(path.join(outDir, "description.txt"), [
    title, "", story.description, "", "제품 정보는 프로필 링크에서 확인하세요.", "",
    PARTNERS_NOTICE, "", story.hashtags.join(" "),
  ].join("\n"));
  await fs.writeFile(path.join(outDir, "link-in-bio.txt"), [
    `버튼 이름: ${story.postTitle}`, `링크: ${link}`, "", PARTNERS_NOTICE,
  ].join("\n"));
  return outFile;
}
