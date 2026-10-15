// Claude 로 쇼츠 대본 생성
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "scenes", "description", "hashtags"],
  properties: {
    title: { type: "string", description: "쇼츠 제목 (40자 이내, 클릭을 부르는 문구)" },
    scenes: {
      type: "array",
      description: "5~6개 장면. 첫 장면은 3초 안에 시선을 잡는 훅, 마지막 장면은 구매 링크 안내",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["narration", "caption"],
        properties: {
          narration: { type: "string", description: "읽어줄 나레이션 한두 문장" },
          caption: { type: "string", description: "화면 자막. 20자 이내 핵심 문구" },
        },
      },
    },
    description: { type: "string", description: "유튜브 설명란 본문 (3~5줄, 링크·고지문 제외)" },
    hashtags: { type: "array", items: { type: "string" }, description: "#포함 해시태그 5~8개" },
  },
};

const SYSTEM = `당신은 한국어 상품 소개 쇼츠(유튜브 쇼츠, 릴스) 대본 작가입니다.
- 전체 나레이션은 20~35초 분량으로, 구어체로 짧고 리듬감 있게 씁니다.
- 상품명, 가격, 카테고리, 이미지에서 확인되는 사실만 말합니다. 성능 수치, 후기, 효능, 최저가 같은 확인할 수 없는 주장은 지어내지 않습니다.
- 가격은 변동될 수 있으므로 "지금 OO원대" 처럼 말하고 단정하지 않습니다.
- 마지막 장면은 "구매 링크는 설명란(고정 댓글)에 있어요" 류의 안내로 끝냅니다.
- 상품명에 포함된 긴 모델명·옵션 표기는 자연스럽게 줄여서 부릅니다.`;

/**
 * @param {object} product  normalize() 된 상품
 * @param {Buffer|null} image 상품 이미지 (JPEG/PNG)
 */
export async function writeScript(product, image) {
  const facts = [
    `상품명: ${product.name}`,
    `가격: ${product.price?.toLocaleString("ko-KR")}원`,
    product.category && `카테고리: ${product.category}`,
    product.isRocket && "로켓배송 가능",
    product.isFreeShipping && "무료배송",
  ].filter(Boolean).join("\n");

  /** @type {Anthropic.Beta.BetaContentBlockParam[]} */
  const content = [];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: imageMediaType(image), data: image.toString("base64") },
    });
  }
  content.push({ type: "text", text: `다음 상품으로 쇼츠 대본을 써 주세요.\n\n${facts}` });

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`대본 생성이 거절되었습니다: ${response.stop_details?.explanation ?? ""}`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("대본 생성이 max_tokens 에서 잘렸습니다.");
  }
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("대본 응답에 텍스트가 없습니다.");
  return JSON.parse(text);
}

function imageMediaType(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  return "image/jpeg";
}
