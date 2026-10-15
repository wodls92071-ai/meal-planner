// 직접 쓴 대본 파일 읽기 + API 키가 없을 때 쓰는 기본 템플릿
import fs from "node:fs/promises";

/**
 * 대본 텍스트 형식 (script.example.txt 참고)
 *
 *   제목: 자취생 필수템 무선 청소기
 *   설명: 가볍고 편한 무선 청소기예요.
 *   해시태그: #쿠팡 #청소기 #자취템
 *
 *   청소 3분 컷 | 이거 하나면 청소가 3분이면 끝나요.
 *   지금 19만원대 | 지금 19만원대에 로켓배송까지 돼요.
 *   링크는 설명란! | 구매 링크는 설명란에 있어요.
 *
 * 장면 한 줄 = "화면 자막 | 읽어줄 대사". | 가 없으면 같은 문장을 자막과 대사에 모두 씁니다.
 * # 으로 시작하는 줄(해시태그: 줄 제외)과 빈 줄은 무시합니다.
 */
export function parseScriptText(text, product) {
  const script = { title: "", description: "", hashtags: [], scenes: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const meta = line.match(/^(제목|설명|해시태그)\s*[:：]\s*(.*)$/);
    if (meta) {
      const [, key, value] = meta;
      if (key === "제목") script.title = value;
      else if (key === "설명") script.description = script.description ? `${script.description}\n${value}` : value;
      else script.hashtags = value.split(/\s+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`));
      continue;
    }
    const [caption, narration] = line.split("|").map((s) => s.trim());
    script.scenes.push({ caption, narration: narration || caption });
  }
  if (!script.scenes.length) throw new Error("대본에 장면이 없습니다. '자막 | 대사' 형식으로 한 줄 이상 적어 주세요.");
  script.title ||= shortName(product.name);
  script.description ||= product.name;
  if (!script.hashtags.length) script.hashtags = ["#쿠팡", "#추천템", "#쇼츠"];
  return script;
}

export async function loadScript(file, product) {
  const text = await fs.readFile(file, "utf8");
  if (file.endsWith(".json")) return JSON.parse(text);
  return parseScriptText(text, product);
}

/** Anthropic API 키도, 직접 쓴 대본도 없을 때 쓰는 기본 대본 */
export function templateScript(product) {
  const name = shortName(product.name);
  const p = product.price;
  const price = !p ? "" : p >= 10000 ? `${Math.floor(p / 10000)}만원대` : `${p.toLocaleString("ko-KR")}원`;
  const scenes = [
    { caption: `${name} 찾으세요?`, narration: `${name}, 찾고 계셨나요?` },
    price && { caption: `지금 ${price}`, narration: `지금 ${price}에 살 수 있어요.` },
    product.isRocket && { caption: "로켓배송 가능", narration: "로켓배송이라 빠르게 받아볼 수 있어요." },
    { caption: "링크는 설명란!", narration: "구매 링크는 설명란에 있어요." },
  ].filter(Boolean);
  return {
    title: `${name} 이거 어때요?`,
    description: product.name,
    hashtags: ["#쿠팡", "#추천템", "#쇼츠"],
    scenes,
  };
}

// 긴 상품명에서 앞쪽 핵심만 (쉼표·괄호·슬래시 앞, 최대 18자)
function shortName(name) {
  const head = name.split(/[,(/\[]/)[0].trim();
  return head.length > 18 ? `${head.slice(0, 18)}…` : head;
}
