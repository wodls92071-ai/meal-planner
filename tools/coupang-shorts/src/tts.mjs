// 나레이션 음성 합성. TTS_PROVIDER=google | none
import fs from "node:fs/promises";

export function ttsEnabled() {
  return (process.env.TTS_PROVIDER ?? "google") !== "none";
}

/** text 를 mp3 로 outPath 에 저장 */
export async function synthesize(text, outPath) {
  const provider = process.env.TTS_PROVIDER ?? "google";
  if (provider !== "google") throw new Error(`지원하지 않는 TTS_PROVIDER: ${provider}`);

  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error("GOOGLE_TTS_API_KEY 가 없습니다. (나레이션 없이 만들려면 TTS_PROVIDER=none)");

  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "ko-KR", name: process.env.GOOGLE_TTS_VOICE || "ko-KR-Neural2-C" },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE || 1.15),
      },
    }),
  });
  if (!res.ok) throw new Error(`Google TTS 오류 (HTTP ${res.status}): ${(await res.text()).slice(0, 300)}`);
  const { audioContent } = await res.json();
  await fs.writeFile(outPath, Buffer.from(audioContent, "base64"));
}
