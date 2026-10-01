import { ReviewImageDownloader } from "@/components/ReviewImageDownloader";

export default function ReviewImagesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold">쿠팡 리뷰 이미지</h1>
        <p className="text-xs text-muted">
          상품 링크를 넣으면 리뷰 사진을 모아 보여주고, 원하는 것만 골라 저장할 수 있어요.
        </p>
      </div>
      <ReviewImageDownloader />
    </div>
  );
}
