# 저녁 식단 스케줄러

매일 저녁 식단을 캘린더에 짜면, 그 주 레시피들의 재료를 자동으로 합산해 장보기
리스트를 만들어주는 앱입니다. 장보기 리스트의 각 재료는 쿠팡/마켓컬리/네이버쇼핑
검색 결과로 바로 연결됩니다 (실제 결제는 직접 진행).

## 처음 설정하기

1. **Supabase 프로젝트 만들기**
   - [supabase.com](https://supabase.com)에서 무료 프로젝트 생성
   - 프로젝트 설정 > API 메뉴에서 `Project URL`, `anon public key` 복사
   - `Authentication > Email` 에서 매직링크(OTP) 로그인이 켜져 있는지 확인 (기본값이 켜져 있음)
   - `supabase/migrations/0001_init.sql` 파일 내용을 SQL Editor에 붙여넣고 실행 (테이블 + RLS 정책 생성)

2. **레시피 API 키 발급**
   - [공공데이터포털(data.go.kr)](https://www.data.go.kr)에 가입
   - "조리식품의 레시피 DB" (식품의약품안전처, COOKRCP01) 검색 후 활용신청 → 서비스키 발급 (보통 즉시 승인)

3. **환경변수 설정**

   ```bash
   cp .env.local.example .env.local
   ```

   `.env.local`에 위에서 발급받은 값을 채워넣습니다.

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   FOOD_SAFETY_API_KEY=
   ```

4. **실행**

   ```bash
   npm run dev
   ```

   [http://localhost:3000](http://localhost:3000) 접속 → 이메일로 로그인 링크 받기 → 로그인

키가 비어있으면 자동으로 `/setup` 안내 페이지로 이동합니다.

## 주요 화면

- `/` — 이번 주(월~일) 저녁 식단 캘린더. 요일별로 레시피를 배치/삭제
- `/recipes` — 내 레시피 목록. 식품안전나라 API 검색으로 추가하거나 직접 입력
- `/shopping-list` — 이번 주 배치된 레시피들의 재료를 자동 합산한 장보기 리스트.
  체크박스, 수동 추가, 쇼핑몰 딥링크 버튼 제공

## 배포

Vercel + Supabase 조합을 염두에 두고 만들어졌습니다. Vercel에 이 저장소를
연결하고, 위 3개 환경변수를 Vercel 프로젝트 설정에 그대로 넣으면 배포됩니다.
