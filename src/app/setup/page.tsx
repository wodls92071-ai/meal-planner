export default function SetupPage() {
  return (
    <main className="mx-auto max-w-xl rounded-2xl bg-card px-6 py-10 text-sm leading-relaxed shadow-sm my-16">
      <h1 className="mb-4 text-xl font-bold">🔧 환경변수 설정이 필요해요</h1>
      <p className="mb-6 text-muted">
        `.env.local` 파일에 아래 키가 아직 비어있습니다. 값을 채운 뒤 개발
        서버를 다시 시작하세요.
      </p>
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          <b>Supabase</b> — supabase.com에서 무료 프로젝트를 만들고, 프로젝트
          설정 &gt; API 메뉴에서 <code>Project URL</code>과{" "}
          <code>anon public key</code>를 복사해{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>에 넣으세요. 그 다음{" "}
          <code>supabase/migrations/0001_init.sql</code> 내용을 Supabase SQL
          Editor에 붙여넣고 실행해서 테이블을 만드세요.
        </li>
        <li>
          <b>레시피 API</b> — data.go.kr(공공데이터포털)에 가입해 &quot;조리식품의
          레시피 DB&quot; API를 활용신청하고 발급된 서비스키를{" "}
          <code>FOOD_SAFETY_API_KEY</code>에 넣으세요.
        </li>
      </ol>
      <p className="mt-6 text-muted">
        루트의 <code>.env.local.example</code> 파일을 복사해{" "}
        <code>.env.local</code>로 만들면 편합니다.
      </p>
    </main>
  );
}
