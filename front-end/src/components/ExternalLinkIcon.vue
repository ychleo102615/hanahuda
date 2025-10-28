<script setup lang="ts">
/**
 * ExternalLinkIcon 組件
 * 用於顯示外部連結圖示
 * 支援自訂 className 來控制尺寸和顏色
 */
interface Props {
  /** 自訂 CSS class */
  className?: string
}

withDefaults(defineProps<Props>(), {
  className: 'h-3 w-3',
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :class="className"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
</template>

<style scoped>
/* 使用 currentColor 讓圖示繼承父元素的文字顏色 */
</style>
