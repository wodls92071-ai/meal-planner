import type { Profile } from "@/types/database";

// AI 프롬프트에 그대로 넣을 수 있는 사용자 프로필 요약 텍스트
export function profileToPromptText(profile: Profile | null): string {
  if (!profile) {
    return "사용자가 프로필을 아직 설정하지 않았습니다 (기본값: 2인 가구, 특별한 제약 없음).";
  }

  const lines = [
    `- 가구 인원: ${profile.household_size}인 (재료 양은 이 인원에 맞게 조절)`,
    `- 못 먹는 재료/알레르기: ${profile.allergies.trim() || "없음"}`,
    `- 싫어하는 음식/재료: ${profile.dislikes.trim() || "없음"}`,
    `- 선호하는 음식 스타일: ${profile.preferred_cuisines.trim() || "특별히 없음"}`,
    `- 매운맛 선호도: ${profile.spice_level.trim() || "보통"}`,
  ];
  if (profile.notes.trim()) {
    lines.push(`- 기타 참고사항: ${profile.notes.trim()}`);
  }

  return `사용자 프로필 (반드시 반영):\n${lines.join("\n")}\n알레르기·못 먹는 재료·싫어하는 음식은 절대 추천/생성에 포함하지 마세요.`;
}
