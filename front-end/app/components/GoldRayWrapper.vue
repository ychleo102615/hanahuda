<script setup lang="ts">
withDefaults(
  defineProps<{
    enabled?: boolean
    inline?: boolean
  }>(),
  {
    enabled: true,
    inline: false,
  },
)
</script>

<template>
  <div
    :class="[
      'gold-ray-wrapper',
      inline ? 'gold-ray-inline' : 'gold-ray-block',
      { 'gold-ray-enabled': enabled },
    ]"
  >
    <slot />
    <span class="r r-t" aria-hidden="true" />
    <span class="r r-b" aria-hidden="true" />
    <span class="r r-l" aria-hidden="true" />
    <span class="r r-r" aria-hidden="true" />
  </div>
</template>

<style scoped>
/* 光線效果：H-CW × V-CCW 雙向夾擊切線進場 */

.gold-ray-wrapper {
  position: relative;
}

/* block：用於 card 等塊級元素，自動填滿父容器 */
.gold-ray-block {
  display: block;
}

/* inline：用於按鈕，shrink-to-content；覆蓋父層可能的 pointer-events-none */
.gold-ray-inline {
  display: inline-block;
  pointer-events: auto;
}

/* ── 軌道共用基底 ── */
.r {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  transition:
    transform 390ms cubic-bezier(0.4, 0, 1, 1),
    opacity 260ms ease;
}

.gold-ray-enabled:hover .r {
  opacity: 1;
  transform: translate(0, 0);
  transition:
    transform 350ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease;
}

/* ── 水平軌（上 / 下）── */
.r-t,
.r-b {
  height: 1.5px;
  width: calc(100% + 16px); /* 兩端各超出 8px */
  left: -8px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(212, 175, 55, 0.08) 5%,
    #d4af37 25%,
    #f0d870 50%,
    #d4af37 75%,
    rgba(212, 175, 55, 0.08) 95%,
    transparent 100%
  );
  box-shadow:
    0 0 5px rgba(212, 175, 55, 0.95),
    0 0 12px rgba(212, 175, 55, 0.4);
}

/* 上軌：從左側切線滑入（順時針 CW） */
.r-t {
  top: -1px;
  transform: translateX(-100%);
}

/* 下軌：從右側切線滑入（順時針 CW） */
.r-b {
  bottom: -1px;
  transform: translateX(100%);
}

/* ── 垂直軌（左 / 右）── */
.r-l,
.r-r {
  width: 1.5px;
  height: calc(100% + 16px);
  top: -8px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(212, 175, 55, 0.08) 5%,
    #d4af37 25%,
    #f0d870 50%,
    #d4af37 75%,
    rgba(212, 175, 55, 0.08) 95%,
    transparent 100%
  );
  box-shadow:
    0 0 5px rgba(212, 175, 55, 0.95),
    0 0 12px rgba(212, 175, 55, 0.4);
}

/* 左軌：從上方切線滑入（逆時針 CCW） */
.r-l {
  left: -1px;
  transform: translateY(-100%);
}

/* 右軌：從下方切線滑入（逆時針 CCW） */
.r-r {
  right: -1px;
  transform: translateY(100%);
}

/* ── 無障礙：停用位移，僅保留透明度淡入 ── */
@media (prefers-reduced-motion: reduce) {
  .r-t { transform: translateX(0); }
  .r-b { transform: translateX(0); }
  .r-l { transform: translateY(0); }
  .r-r { transform: translateY(0); }

  .r,
  .gold-ray-enabled:hover .r {
    transition: opacity 200ms ease;
  }
}
</style>
