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
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}

.keyword-en {
  color: #c41e3a;
  font-weight: 600;
}
</style>
