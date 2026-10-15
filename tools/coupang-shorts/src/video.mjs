// ffmpeg 로 9:16 쇼츠 영상 합성
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const W = 1080;
const H = 1920;
const DISCLOSURE = "쿠팡 파트너스 활동으로 수수료를 제공받을 수 있습니다";

const FONT_CANDIDATES = [
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
  "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
  "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
  "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
  "/System/Library/Fonts/AppleSDGothicNeo.ttc",
  "/Library/Fonts/AppleGothic.ttf",
  "C:/Windows/Fonts/malgunbd.ttf",
  "C:/Windows/Fonts/malgun.ttf",
];

export function findFont() {
  const font = [process.env.FONT_PATH, ...FONT_CANDIDATES].find((f) => f && existsSync(f));
  if (!font) throw new Error("한글 폰트를 찾지 못했습니다. .env 의 FONT_PATH 에 .ttf/.otf/.ttc 경로를 지정하세요.");
  return font;
}

export async function checkFfmpeg() {
  try {
    await run("ffmpeg", ["-version"]);
    await run("ffprobe", ["-version"]);
  } catch {
    throw new Error("ffmpeg / ffprobe 를 찾을 수 없습니다. 먼저 설치하세요 (brew install ffmpeg, winget install ffmpeg 등).");
  }
}

export async function audioDuration(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file,
  ]);
  return Number(stdout.trim());
}

/** 한글은 1칸, 영문·숫자는 약 0.55칸으로 보고 줄바꿈 */
export function wrap(text, maxUnits) {
  const width = (ch) => (/[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.55);
  const lines = [];
  let line = "";
  let units = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = [...word].reduce((s, ch) => s + width(ch), 0);
    if (!line) {
      line = word;
      units = w;
    } else if (units + 0.4 + w > maxUnits) {
      lines.push(line);
      line = word;
      units = w;
    } else {
      line += ` ${word}`;
      units += 0.4 + w;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

// filtergraph 안에 넣을 경로 이스케이프
function filterPath(p) {
  return `'${p.replace(/\\/g, "/").replace(/'/g, "'\\''").replace(/:/g, "\\:")}'`;
}

function drawtext(font, textfile, opts) {
  return `drawtext=fontfile=${filterPath(font)}:textfile=${textfile}:text_align=center:${opts}`;
}

/**
 * 장면 하나를 mp4 로 렌더링.
 * workDir 안에서 실행되며 텍스트 파일은 상대 경로로 넘긴다.
 */
async function renderScene({ workDir, index, image, audio, duration, title, price, caption, font }) {
  const id = String(index).padStart(2, "0");
  const titleFile = `title.txt`;
  const priceFile = `price.txt`;
  const captionFile = `caption_${id}.txt`;
  const disclosureFile = `disclosure.txt`;
  await fs.writeFile(path.join(workDir, titleFile), wrap(title, 16));
  await fs.writeFile(path.join(workDir, priceFile), price);
  await fs.writeFile(path.join(workDir, captionFile), wrap(caption, 12));
  await fs.writeFile(path.join(workDir, disclosureFile), DISCLOSURE);

  const filter = [
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=40:4,eq=brightness=-0.25[bg]`,
    `[0:v]scale=920:920:force_original_aspect_ratio=decrease[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2-160,` +
      drawtext(font, titleFile, `fontsize=58:fontcolor=white:line_spacing=14:x=(w-text_w)/2:y=170:box=1:boxcolor=black@0.55:boxborderw=24`) + "," +
      drawtext(font, priceFile, `fontsize=72:fontcolor=0xFFD400:borderw=5:bordercolor=black:x=(w-text_w)/2:y=1310`) + "," +
      drawtext(font, captionFile, `fontsize=76:fontcolor=white:borderw=7:bordercolor=black:line_spacing=18:x=(w-text_w)/2:y=1450`) + "," +
      drawtext(font, disclosureFile, `fontsize=30:fontcolor=white@0.85:x=(w-text_w)/2:y=h-110`) +
      `,format=yuv420p[v]`,
  ].join(";");

  const audioInput = audio
    ? ["-i", audio]
    : ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"];

  const out = `scene_${id}.mp4`;
  await run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-loop", "1", "-framerate", "30", "-i", image,
    ...audioInput,
    "-filter_complex", filter,
    "-map", "[v]", "-map", "1:a",
    "-af", "apad",
    "-t", duration.toFixed(2),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-r", "30",
    "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2",
    out,
  ], { cwd: workDir });
  return out;
}

/**
 * @param {object} p
 * @param {string} p.workDir   중간 파일 디렉터리
 * @param {string} p.image     상품 이미지 파일명 (workDir 기준)
 * @param {{caption:string, audio:string|null, duration:number}[]} p.scenes
 * @param {string} p.title
 * @param {string} p.price
 * @param {string} p.outFile   최종 mp4 절대 경로
 */
export async function renderShort({ workDir, image, scenes, title, price, outFile }) {
  const font = findFont();
  const parts = [];
  for (const [i, scene] of scenes.entries()) {
    parts.push(await renderScene({ workDir, index: i, image, title, price, font, ...scene }));
  }
  const list = parts.map((p) => `file '${p}'`).join("\n");
  await fs.writeFile(path.join(workDir, "concat.txt"), list);
  await run("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "concat.txt",
    "-c", "copy", "-movflags", "+faststart", path.resolve(outFile),
  ], { cwd: workDir });
}
