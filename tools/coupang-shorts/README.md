# coupang-shorts

쿠팡 상품을 찾아 **쿠팡 파트너스 수익 링크**를 만들고, 상품 소개 **쇼츠 영상(1080×1920 mp4)** 과 업로드용 설명란까지 자동으로 만들어 주는 스크립트입니다.

```
상품 검색(파트너스 API) → 상품 이미지 다운로드 → Claude 대본 작성 → Google TTS 나레이션 → ffmpeg 합성
```

## 1. 쿠팡 파트너스 가입 (본인이 직접)

가입과 본인 인증은 자동화할 수 없고 직접 하셔야 합니다.

1. <https://partners.coupang.com> 에서 쿠팡 계정으로 가입합니다.
2. 회원 정보(개인/사업자)와 정산 계좌를 등록합니다.
3. 활동할 **채널**(유튜브 채널 URL 등)을 등록합니다.
4. 링크로 판매가 일어나면 **최종 승인 심사**를 받습니다.
5. 최종 승인 뒤 **추가기능 → Open API** 에서 Access Key / Secret Key 를 발급받습니다.
   쿠팡은 Open API 발급에 누적 판매 실적 같은 조건을 두고 있으니, 현재 기준은 파트너스 사이트에서 확인하세요.

> **API 키가 아직 없다면**: 파트너스 웹사이트의 "링크 생성"으로 직접 링크를 만든 뒤 `manual` 모드(아래)를 쓰면 됩니다.

## 2. 준비

- Node.js 22.9 이상
- ffmpeg (`brew install ffmpeg` / `winget install ffmpeg` / `sudo apt install ffmpeg`)
- 한글 폰트 (자동 탐색됩니다. 못 찾으면 `.env` 의 `FONT_PATH` 지정)
- [Anthropic API 키](https://console.anthropic.com) (대본 작성)
- Google Cloud Text-to-Speech API 키 (나레이션, 선택)

```bash
cd tools/coupang-shorts
npm install
cp .env.example .env   # 키 입력
```

## 3. 사용법

```bash
# 키워드로 검색해서 결과만 보기
npm start -- search "무선 청소기" --list

# 검색 상위 3개 상품으로 쇼츠 3개 만들기
npm start -- search "무선 청소기" --count 3

# 오늘의 특가(골드박스) 상품으로 만들기
npm start -- goldbox --count 2

# API 키 없이, 직접 고른 상품으로 만들기
npm start -- manual products.json

# 영상 없이 대본·설명란만
npm start -- search "캠핑 의자" --script-only
```

`manual` 모드 입력 형식은 [`products.example.json`](products.example.json) 을 참고하세요.
`link` 에는 파트너스에서 만든 링크를 넣습니다. API 키가 있으면 `url`(일반 쿠팡 상품 주소)만 넣어도 파트너스 링크로 바꿔 줍니다.

## 4. 결과물

`out/<날짜>-<상품ID>/` 아래에 생깁니다.

| 파일 | 내용 |
|---|---|
| `short.mp4` | 업로드할 쇼츠 영상 |
| `description.txt` | 제목, 설명, 구매 링크, **파트너스 고지문**, 해시태그 |
| `pinned-comment.txt` | 고정 댓글용 링크 + 고지문 |
| `script.json` | 장면별 나레이션/자막 |
| `product.json` | 상품 정보 |

## 5. 꼭 지킬 것

- **고지 의무**: 공정위 지침과 쿠팡 파트너스 약관에 따라 경제적 대가를 받는다는 사실을 알려야 합니다.
  영상 하단과 설명란에 고지문을 자동으로 넣지만, 업로드할 때 지워지지 않았는지 확인하세요.
- **크롤링 금지**: 쿠팡 페이지를 스크래핑(Apify 등)하면 약관 위반으로 파트너스 계정이 정지될 수 있습니다. 이 도구는 공식 Open API만 씁니다.
- **API 호출 한도**: 검색 API는 시간당 호출 수 제한이 있습니다. 반복 실행할 때 주의하세요.
- **대본 검수**: Claude에게 확인되지 않은 효능·후기·최저가 주장을 하지 말라고 지시해 두었지만, 업로드 전에 `script.json` 과 영상을 한 번 보세요.
- 상품 이미지 사용 권리는 판매자에게 있습니다. 직접 찍은 사진이 있으면 `manual` 모드의 `imagePath` 로 쓰는 편이 안전하고 반응도 좋습니다.
