#!/usr/bin/env node
// 쿠팡 상품 → 파트너스 링크 → 쇼츠 mp4 + 업로드용 설명란 자동 생성
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { deeplink, goldboxProducts, searchProducts } from "./coupang.mjs";
import { writeScript } from "./script.mjs";
import { synthesize, ttsEnabled } from "./tts.mjs";
import { audioDuration, checkFfmpeg, renderShort } from "./video.mjs";

const DISCLOSURE = "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

const USAGE = `사용법:
  npm start -- search "<키워드>" [--count 1] [--list]
  npm start -- goldbox [--count 1] [--list]
  npm start -- manual <products.json>

옵션:
  --count N     상위 N개 상품으로 쇼츠 생성 (기본 1)
  --list        영상은 만들지 않고 검색 결과만 출력
  --script-only 대본·설명란만 만들고 영상은 건너뜀
  --out DIR     결과 폴더 (기본 ./out)`;

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      count: { type: "string", default: "1" },
      list: { type: "boolean", default: false },
      "script-only": { type: "boolean", default: false },
      out: { type: "string", default: "out" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const [command, arg] = positionals;
  if (values.help || !command) return console.log(USAGE);

  const count = Math.max(1, Number(values.count) || 1);
  let products;
  if (command === "search") {
    if (!arg) throw new Error(`검색 키워드를 입력하세요.\n\n${USAGE}`);
    products = await searchProducts(arg, values.list ? 10 : count);
  } else if (command === "goldbox") {
    products = await goldboxProducts(values.list ? 20 : count);
  } else if (command === "manual") {
    if (!arg) throw new Error(`상품 JSON 파일 경로를 입력하세요.\n\n${USAGE}`);
    products = await loadManual(arg);
  } else {
    throw new Error(`알 수 없는 명령: ${command}\n\n${USAGE}`);
  }

  if (!products.length) return console.log("상품을 찾지 못했습니다.");

  if (values.list) {
    for (const [i, p] of products.entries()) {
      console.log(`${i + 1}. ${p.name}\n   ${p.price?.toLocaleString("ko-KR")}원${p.isRocket ? " · 로켓" : ""}  ${p.link}`);
    }
    return;
  }

  if (!values["script-only"]) await checkFfmpeg();

  for (const product of products.slice(0, count)) {
    const dir = await makeShort(product, values);
    console.log(`\n✅ 완료: ${dir}`);
  }
}

async function loadManual(file) {
  const items = JSON.parse(await fs.readFile(file, "utf8"));
  const list = Array.isArray(items) ? items : [items];
  const base = path.dirname(path.resolve(file));

  // 파트너스 링크(link)가 없고 쿠팡 상품 URL(url)만 있으면 딥링크 API로 변환
  const needLink = list.filter((p) => !p.link && p.url).map((p) => p.url);
  const links = needLink.length ? await deeplink(needLink) : {};

  return list.map((p, i) => {
    const link = p.link ?? links[p.url];
    if (!p.name || !link || !(p.imageUrl || p.imagePath)) {
      throw new Error(`${file} 의 ${i + 1}번째 항목에 name, link(또는 url), imageUrl(또는 imagePath) 가 필요합니다.`);
    }
    return {
      productId: String(p.productId ?? `manual${i + 1}`),
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
      imagePath: p.imagePath && path.resolve(base, p.imagePath),
      link,
      category: p.category ?? "",
      isRocket: Boolean(p.isRocket),
      isFreeShipping: Boolean(p.isFreeShipping),
    };
  });
}

async function loadImage(product) {
  if (product.imagePath) return fs.readFile(product.imagePath);
  const res = await fetch(product.imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`상품 이미지 다운로드 실패 (HTTP ${res.status}): ${product.imageUrl}`);
  return Buffer.from(await res.arrayBuffer());
}

async function makeShort(product, options) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const dir = path.resolve(options.out, `${stamp}-${product.productId}`);
  const work = path.join(dir, "work");
  await fs.mkdir(work, { recursive: true });

  console.log(`\n▶ ${product.name}`);
  const image = await loadImage(product);
  await fs.writeFile(path.join(work, "product.img"), image);
  await fs.writeFile(path.join(dir, "product.json"), JSON.stringify(product, null, 2));

  console.log("  · 대본 작성 중 (Claude)…");
  const script = await writeScript(product, image);
  await fs.writeFile(path.join(dir, "script.json"), JSON.stringify(script, null, 2));

  const description = [
    script.title,
    "",
    script.description,
    "",
    `🛒 구매 링크: ${product.link}`,
    "",
    DISCLOSURE,
    "※ 가격과 재고는 수시로 바뀔 수 있습니다.",
    "",
    script.hashtags.join(" "),
  ].join("\n");
  await fs.writeFile(path.join(dir, "description.txt"), description);
  await fs.writeFile(path.join(dir, "pinned-comment.txt"), `🛒 구매 링크 👉 ${product.link}\n\n${DISCLOSURE}`);

  if (options["script-only"]) return dir;

  const scenes = [];
  const useTts = ttsEnabled();
  for (const [i, scene] of script.scenes.entries()) {
    let audio = null;
    let duration;
    if (useTts) {
      console.log(`  · 나레이션 ${i + 1}/${script.scenes.length}`);
      audio = `narration_${String(i).padStart(2, "0")}.mp3`;
      await synthesize(scene.narration, path.join(work, audio));
      duration = (await audioDuration(path.join(work, audio))) + 0.35;
    } else {
      duration = Math.max(2.2, [...scene.narration].length / 7);
    }
    scenes.push({ caption: scene.caption, audio, duration });
  }

  console.log("  · 영상 렌더링 중 (ffmpeg)…");
  await renderShort({
    workDir: work,
    image: "product.img",
    scenes,
    title: script.title,
    price: product.price ? `${product.price.toLocaleString("ko-KR")}원` : "",
    outFile: path.join(dir, "short.mp4"),
  });
  return dir;
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
