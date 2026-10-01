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
  const debug = [];
  const grab = (root) => {
    let added = 0;
    root.querySelectorAll("img").forEach((img) => {
      let src = img.getAttribute("data-origin-path") || img.getAttribute("data-src") || img.getAttribute("src") || "";
      if (!/coupangcdn\.com/.test(src)) return;
      if (!/review|attachment|vendor_inventory|\/image\//i.test(img.outerHTML)) return;
      if (/profile|icon|badge|logo|sprite/i.test(src)) return;
      if (src.startsWith("//")) src = "https:" + src;
      src = src.replace(/\/thumbnails\/remote\/\d+x\d+(ex|q\d+)?/, "/thumbnails/remote/800x800ex");
      if (seen.has(src)) return;
      seen.add(src);
      urls.push(src);
      added++;
    });
    return added;
  };
  for (let page = 1; page <= 10; page++) {
    let res;
    try {
      res = await fetch(
        `/vp/product/reviews?productId=${id}&page=${page}&size=30&sortBy=ORDER_SCORE_ASC&ratings=&q=&viRoleCode=3&ratingSummary=true`,
        { credentials: "include" },
      );
    } catch (e) {
      debug.push(`page${page}: 요청 실패 ${e}`);
      break;
    }
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "text/html");
    const added = grab(doc);
    debug.push(`page${page}: HTTP ${res.status}, ${text.length}자, img ${doc.querySelectorAll("img").length}개, 사진 ${added}장`);
    if (page === 1 && !res.ok) debug.push("응답 앞부분: " + text.slice(0, 200).replace(/\s+/g, " "));
    if (!res.ok || !added) break;
  }
  // 현재 열려 있는 페이지에 이미 보이는 리뷰 사진도 함께 수집

  // 현재 페이지(및 같은 출처 iframe)에 보이는 이미지를 직접 수집 — 크기가 작은 아이콘은 제외
  const key = (u) => u.replace(/\/thumbnails\/remote\/\d+x\d+(ex|q\d+)?/, "").replace(/[?#].*$/, "");
  const liveSeen = new Set(urls.map(key));
  const roots = [document];
  document.querySelectorAll("iframe").forEach((f) => {
    try { if (f.contentDocument) roots.push(f.contentDocument); } catch {}
  });
  let liveAdded = 0;
  const addLive = (src) => {
    if (!src) return;
    if (src.startsWith("//")) src = "https:" + src;
    if (!/^https?:/.test(src) || !/coupang/i.test(src)) return;
    if (/\.(svg|gif)(\?|$)|sprite|icon|logo|badge|profile|banner/i.test(src)) return;
    const k = key(src);
    if (liveSeen.has(k)) return;
    liveSeen.add(k);
    urls.push(src);
    liveAdded++;
  };
  // 리뷰 영역 찾기: "도움이 됐어요" 버튼들을 모두 포함하는 가장 가까운 공통 조상
  const marks = [];
  for (const root of roots) {
    root.querySelectorAll("button,span,a,div").forEach((el) => {
      if (el.children.length === 0 && /도움이 됐어요|도움이 돼요/.test(el.textContent || "")) marks.push(el);
    });
  }
  let region = null;
  if (marks.length) {
    region = marks[0].parentElement;
    while (region && !marks.every((m) => region.contains(m))) region = region.parentElement;
  }
  debug.push(`리뷰 영역: ${region ? "찾음 (리뷰 " + marks.length + "개)" : "못 찾음 → 페이지 전체"}`);
  for (const root of region ? [region] : roots) {
    root.querySelectorAll("img").forEach((img) => {
      const w = img.naturalWidth || img.width || 0;
      if (w && w < 60) return;
      addLive(img.getAttribute("data-origin-path") || img.getAttribute("data-src") || img.currentSrc || img.src);
    });
    root.querySelectorAll("[style*='background']").forEach((el) => {
      const m = (el.getAttribute("style") || "").match(/url\(["']?([^"')]+)/);
      if (m) addLive(m[1]);
    });
  }
  debug.push(`화면에서 직접 수집: ${liveAdded}장 (iframe ${roots.length - 1}개)`);

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

  const status = document.createElement("div");
  status.style.cssText = "margin:8px 0;font-size:13px";
  async function download() {
    status.textContent = "";
    const failed = [];
    let ok = 0;
    let i = 0;
    for (const src of picked) {
      i++;
      status.textContent = `다운로드 중… ${i}/${picked.size}`;
      try {
        const big = src.replace(/\/thumbnails\/remote\/\d+x\d+(ex|q\d+)?/, "/thumbnails/remote/800x800ex");
        let r = await fetch(big).catch(() => null);
        if (!r || !r.ok) r = await fetch(src);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `review-${id}-${i}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        ok++;
      } catch (e) {
        failed.push({ src, err: String(e) });
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    status.textContent = `완료: ${ok}장 저장 요청, ${failed.length}장 실패`;
    if (ok) status.textContent += " (브라우저가 '여러 파일 다운로드' 허용을 물으면 허용해 주세요)";
    if (failed.length) {
      const p = document.createElement("div");
      p.style.cssText = "margin-top:6px;font-size:13px";
      p.append(`브라우저가 직접 저장을 막은 사진이에요 (${failed[0].err}). 링크를 눌러 새 탭에서 연 뒤 우클릭 → 이미지를 다른 이름으로 저장:`);
      failed.forEach(({ src }, n) => {
        const l = document.createElement("a");
        l.href = src;
        l.target = "_blank";
        l.rel = "noreferrer";
        l.textContent = ` [${n + 1}번 열기]`;
        p.append(l);
      });
      status.append(p);
    }
  }

  function openCollected() {
    const list = [...picked];
    if (!list.length) return alert("먼저 사진을 선택해 주세요.");
    const w = window.open("", "_blank");
    if (!w) return alert("팝업이 막혔어요. 주소창 오른쪽의 팝업 차단 아이콘에서 허용해 주세요.");
    const esc = (u) => u.replace(/"/g, "&quot;");
    w.document.write(
      `<!doctype html><meta charset="utf-8"><title>선택한 리뷰 사진 ${list.length}장</title>` +
      `<body style="margin:0;font:15px sans-serif"><div style="padding:12px;background:#fff3e8">` +
      `<b>Ctrl+S</b> (맥: ⌘+S) → 형식을 <b>"웹페이지, 완전"</b>으로 저장하면 사진이 <b>폴더 안에 한꺼번에</b> 저장돼요. ` +
      `한 장씩은 사진 우클릭 → "이미지를 다른 이름으로 저장".</div>` +
      list.map((u) => `<img src="${esc(u)}" referrerpolicy="no-referrer" style="display:block;max-width:100%;margin:8px auto">`).join("") +
      `</body>`,
    );
    w.document.close();
  }

  const ver = document.createElement("span");
  ver.textContent = "[v6]";
  ver.style.cssText = "color:#e8590c;font-weight:bold";
  bar.append(
    ver,
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
    mk("선택한 사진 새 탭에 모으기", openCollected),
    mk("닫기", () => box.remove()),
    count,
  );
  update();
  box.append(bar, status);
  if (!urls.length) {
    const d = document.createElement("pre");
    d.style.cssText = "white-space:pre-wrap;font-size:12px;background:#f3f3f3;padding:8px;margin-top:12px";
    d.textContent = "사진이 있는 리뷰를 찾지 못했어요.\n\n[진단 정보 - 이 내용을 알려주세요]\n" + debug.join("\n");
    box.append(d);
  }
  box.append(grid);
})();
