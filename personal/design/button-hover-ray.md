# 按鈕懸浮金線特效 · Button Hover Ray

**原型檔案**：`front-end/app/public/button-ray-hover.html`

---

## 設計語意

懸浮時四條金色光線沿按鈕邊框切線方向進場，停駐四周；退場時原路折返。
傳達「鎖定、選中」的儀式感，動畫服務於互動回饋而非裝飾表演。

---

## 進場方向：雙向夾擊（H-CW × V-CCW）

| 邊框 | 進場來源 | 旋向 |
|------|----------|------|
| 上軌 | 從左側滑入 | 順時針（CW） |
| 下軌 | 從右側滑入 | 順時針（CW） |
| 左軌 | 從上方滑入 | 逆時針（CCW） |
| 右軌 | 從下方滑入 | 逆時針（CCW） |

水平兩軌對向夾入，垂直兩軌也對向夾入，兩組旋向相反，形成非穩定的張力交匯感。

**切線進場原則**：光線在進場前即已與按鈕邊框共面，僅沿邊框方向橫向滑入，而非從外側垂直聚攏。

---

## 動畫 Token

| 屬性 | 值 |
|------|----|
| 進場時長 | `350ms` |
| 進場緩動 | `cubic-bezier(0.22, 1, 0.36, 1)`（彈性入場） |
| 退場時長 | `390ms` |
| 退場緩動 | `cubic-bezier(0.4, 0, 1, 1)`（ease-in 退場） |
| 透明度（進） | `160ms ease` |
| 透明度（退） | `260ms ease` |

---

## 光線規格

| 屬性 | 值 |
|------|----|
| 線寬 | `1.5px` |
| 角落超出 | `8px`（四角各延伸 8px） |
| 金色主色 | `#D4AF37` |
| 金色亮點 | `#F0D870` |
| 漸層 | 兩端透明 → 中心實金 |
| 光暈 | `box-shadow: 0 0 5px rgba(212,175,55,0.95), 0 0 12px rgba(212,175,55,0.4)` |

---

## HTML 結構

```html
<!-- .rw = ray wrapper；需 position: relative; display: inline-flex -->
<div class="rw">
  <button>...</button>
  <span class="r r-t"></span>
  <span class="r r-b"></span>
  <span class="r r-l"></span>
  <span class="r r-r"></span>
</div>
```

## CSS 核心邏輯

```css
/* 光線初始位置（以上軌為例） */
.r-t {
  position: absolute;
  top: -1px;
  left: -8px;
  height: 1.5px;
  width: calc(100% + 16px);
  opacity: 0;
  transform: translateX(-100%);   /* 在按鈕左側，與邊框共面 */
  transition: transform 390ms cubic-bezier(0.4,0,1,1),
              opacity 260ms ease;
}

/* Hover：滑入定位 */
.rw:hover .r-t {
  opacity: 1;
  transform: translateX(0);
  transition: transform 350ms cubic-bezier(0.22,1,0.36,1),
              opacity 160ms ease;
}

/* 四條光線的初始 transform */
.r-t { transform: translateX(-100%); }  /* 從左 → CW */
.r-b { transform: translateX(100%); }   /* 從右 → CW */
.r-l { transform: translateY(-100%); }  /* 從上 → CCW */
.r-r { transform: translateY(100%); }   /* 從下 → CCW */
```

---

## 無障礙

- `@media (prefers-reduced-motion: reduce)`：停用位移動畫，僅保留 opacity 淡入淡出
- 光線元素設 `pointer-events: none`，不干擾鍵盤焦點

---

## 其他備選樣式（同原型檔案）

原型中另保留四種切線進場變體供日後參考：

| 編號 | 名稱 | 特色 |
|------|------|------|
| S03 | 逆時針旋入 | 全軌 CCW，開展感 |
| S04 | 由中延展 | scaleX/Y from center，最對稱 |
| S05 | 書法筆順 | CW 切線 + 80ms 錯落時序 |
| S06 | 角落蔓生 | 從角落起點延伸，90ms 錯落 |
