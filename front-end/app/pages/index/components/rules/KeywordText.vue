<script setup lang="ts">
import type { KeywordSpan } from '~/types/rules';

interface Props {
  spans: KeywordSpan[];
}

defineProps<Props>();
</script>

<template>
  <span class="keyword-text">
    <template v-for="(span, idx) in spans" :key="idx">
      <span v-if="span.type === 'text'">{{ span.content }}</span>
      <span v-else-if="span.type === 'keyword-ja'" class="keyword-ja">
        {{ span.content }}
      </span>
      <span v-else-if="span.type === 'keyword-en'" class="keyword-en">
        {{ span.content }}
      </span>
    </template>
  </span>
</template>

<style scoped>
.keyword-ja {
  color: #4ade80;
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  white-space: nowrap;
}

.keyword-en {
  color: #4ade80;
  font-weight: 600;
}
</style>
