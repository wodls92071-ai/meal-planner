import "server-only";

export type ChatTurn = { role: "user" | "model"; text: string };

export type ToolResult = { ok: boolean; message: string; recipe_id?: string };

type GeminiPart = Record<string, unknown> & {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown>; id?: string };
};

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "add_dish",
        description:
          "특정 날짜에 요리를 하나 추가한다 (기존에 그 날 배치된 다른 요리는 그대로 두고 추가만 함). 하루에 메인요리 + 반찬처럼 여러 개를 추가할 수 있다. 이미 저장된 레시피를 재사용하려면 recipe_id만 넘기고, 새 요리를 제안하는 거면 recipe_id 없이 title/ingredients/instructions를 채운다. 응답에 생성된 recipe_id가 포함되니, 같은 요리를 다른 날에도 이어서 배치할 때는(예: 이틀 나눠 먹기) 새로 만들지 말고 그 recipe_id를 재사용하세요. 새로 제안하는 요리의 instructions는 단계 수를 아끼지 말고 최대한 자세히 적는다 — 각 단계마다 시간/불세기/재료 상태 변화를 구체적으로 넣어서 처음 요리하는 사람도 그대로 따라할 수 있게 한다.",
        parameters: {
          type: "OBJECT",
          properties: {
            date: { type: "STRING", description: "YYYY-MM-DD" },
            recipe_id: {
              type: "STRING",
              description: "기존에 저장된 레시피를 재사용할 때만 사용",
            },
            title: { type: "STRING" },
            ingredients: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  amount: { type: "NUMBER" },
                  unit: { type: "STRING" },
                },
                required: ["name", "amount", "unit"],
              },
            },
            instructions: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["date"],
        },
      },
      {
        name: "remove_dish",
        description: "특정 날짜에 배치된 요리 중 하나만 제거한다 (그 날의 다른 요리는 유지).",
        parameters: {
          type: "OBJECT",
          properties: {
            date: { type: "STRING", description: "YYYY-MM-DD" },
            recipe_id: { type: "STRING", description: "제거할 요리의 레시피 id" },
          },
          required: ["date", "recipe_id"],
        },
      },
      {
        name: "clear_meal",
        description: "특정 날짜에 배치된 요리를 전부 취소한다 (그 날을 통째로 다시 짤 때 사용).",
        parameters: {
          type: "OBJECT",
          properties: {
            date: { type: "STRING", description: "YYYY-MM-DD" },
          },
          required: ["date"],
        },
      },
      {
        name: "no_action",
        description:
          "식단을 바꿀 필요가 없을 때 호출한다 (단순 질문/조회에 답할 때, 이미 사용자가 원하는 상태가 위 배치 현황에 정확히 반영돼 있어서 더 이상 도구를 부를 게 없을 때).",
        parameters: { type: "OBJECT", properties: {} },
      },
    ],
  },
];

export async function runMealPlanChat({
  systemContext,
  history,
  message,
  executeTool,
}: {
  systemContext: string;
  history: ChatTurn[];
  message: string;
  executeTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<ToolResult>;
}): Promise<{ reply: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const contents: { role: string; parts: GeminiPart[] }[] = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  for (let i = 0; i < 6; i++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemContext }] },
          contents,
          tools: TOOLS,
          // 첫 턴은 반드시 도구를 호출하게 강제해서, 아무 도구도 안 부르고
          // "이미 완료했다"고 거짓으로 답하는 걸 원천 차단한다. 이후 턴은
          // 자유롭게 텍스트로 마무리할 수 있어야 하므로 AUTO로 둔다.
          ...(i === 0
            ? { toolConfig: { functionCallingConfig: { mode: "ANY" } } }
            : {}),
        }),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API 요청 실패 (${res.status}): ${text}`);
    }

    const data = await res.json();
    const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      const text = parts
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      return { reply: text || "완료했어요." };
    }

    contents.push({ role: "model", parts });

    const responseParts: GeminiPart[] = [];
    for (const p of functionCalls) {
      const call = p.functionCall!;
      let result: ToolResult;
      if (call.name === "no_action") {
        result = { ok: true, message: "변경 없음" };
      } else {
        try {
          result = await executeTool(call.name, call.args ?? {});
        } catch (err) {
          result = {
            ok: false,
            message: err instanceof Error ? err.message : "실행 실패",
          };
        }
      }
      responseParts.push({
        functionResponse: { name: call.name, id: call.id, response: result },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    reply: "요청이 너무 복잡해서 다 처리하지 못했어요. 조금 나눠서 다시 말씀해주세요.",
  };
}
