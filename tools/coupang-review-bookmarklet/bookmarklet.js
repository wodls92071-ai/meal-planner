(async () => {
  const old = document.getElementById("cpg-rv-overlay");
  if (old) old.remove();
  const id = location.pathname.match(/\/vp\/products\/(\d+)/)?.[1];
  if (!id) return alert("쿠팡 상품 페이지에서 눌러주세요.");

  const box = document.createElement("div");
  box.id = "cpg-rv-overlay";
  box.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:#fff;overflow:auto;padding:16px;font:14px sans-serif;color:#111";
  box.textContent = "리뷰 사진 불러오는 중…";
  document.body.appendChild(box);

  const urls = [];
  const seen = new Set();
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `/vp/product/reviews?productId=${id}&page=${page}&size=30&sortBy=ORDER_SCORE_ASC&ratings=&q=&viRoleCode=3&ratingSummary=true`,
      { credentials: "include" },
    );
    if (!res.ok) break;
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    let added = 0;
    doc.querySelectorAll("img").forEach((img) => {
      let src = img.getAttribute("data-origin-path") || img.getAttribute("data-src") || img.getAttribute("src") || "";
      if (!/coupangcdn\.com/.test(src) || !/review|attachment|\/image\//i.test(img.outerHTML)) return;
      if (src.startsWith("//")) src = "https:" + src;
      src = src.replace(/\/thumbnails\/remote\/\d+x\d+(ex|q\d+)?/, "/thumbnails/remote/800x800ex");
      if (seen.has(src)) return;
      seen.add(src);
      urls.push(src);
      added++;
    });
    if (!added) break;
  }

  const picked = new Set();
  box.textContent = "";
  const bar = document.createElement("div");
  bar.style.cssText = "position:sticky;top:0;background:#fff;padding:8px 0;display:flex;gap:8px;align-items:center;z-index:1";
  const count = document.createElement("span");
  const mk = (label, fn) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "padding:6px 12px;border:1px solid #888;border-radius:8px;background:#f5f5f5;cursor:pointer";
    b.onclick = fn;
    return b;
  };
  const update = () => (count.textContent = `${urls.length}장 중 ${picked.size}장 선택`);
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:8px";

  const cells = urls.map((src) => {
    const cell = document.createElement("div");
    cell.style.cssText = "position:relative;aspect-ratio:1;border:3px solid transparent;border-radius:8px;overflow:hidden;cursor:pointer";
    const im = document.createElement("img");
    im.src = src;
    im.style.cssText = "width:100%;height:100%;object-fit:cover";
    cell.appendChild(im);
    cell.onclick = () => {
      if (picked.has(src)) picked.delete(src);
      else picked.add(src);
      cell.style.borderColor = picked.has(src) ? "#e8590c" : "transparent";
      update();
    };
    grid.appendChild(cell);
    return { src, cell };
  });

  async function download() {
    let i = 0;
    for (const src of picked) {
      i++;
      try {
        const blob = await (await fetch(src)).blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `review-${id}-${i}.jpg`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {
        // 브라우저가 직접 저장을 막으면 새 탭으로 열어 우클릭/길게 눌러 저장
        window.open(src, "_blank");
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  bar.append(
    mk("전체 선택/해제", () => {
      const all = picked.size !== urls.length;
      cells.forEach(({ src, cell }) => {
        if (all) picked.add(src);
        else picked.delete(src);
        cell.style.borderColor = all ? "#e8590c" : "transparent";
      });
      update();
    }),
    mk("선택 다운로드", download),
    mk("닫기", () => box.remove()),
    count,
  );
  update();
  box.append(bar);
  if (!urls.length) box.append("사진이 있는 리뷰를 찾지 못했어요.");
  box.append(grid);
})();
