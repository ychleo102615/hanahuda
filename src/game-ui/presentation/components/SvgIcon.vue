<template>
  <svg :class="['svg-icon', className]" aria-hidden="true" viewBox="0 0 976 1600">
    <use :href="symbolId" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  prefix?: string
  name: string
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  prefix: 'icon',
  className: '',
})

const symbolId = computed(() => `#${props.prefix}-${props.name}`)
</script>

<style scoped>
.svg-icon {
  /* 移除固定尺寸，讓外部 className 控制尺寸 */
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
