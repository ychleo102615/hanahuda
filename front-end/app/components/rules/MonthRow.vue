<script setup lang="ts">
import type { MonthData } from '~/types/rules';
import SvgIcon from '~/components/SvgIcon.vue';
import { getCardIconName } from '~/utils/cardMapping';

interface Props {
  month: MonthData;
}

defineProps<Props>();
</script>

<template>
  <li class="month-row">
    <!-- Month info line -->
    <div class="month-info">
      <span class="month-number">{{ month.month }}月</span>
      <span class="name-ja">{{ month.nameJa }}</span>
      <span class="name-romaji">({{ month.nameRomaji }})</span>
      <span class="divider">-</span>
      <span class="flower-ja">{{ month.flowerJa }}</span>
      <span class="flower-en">/ {{ month.flowerEn }}</span>
    </div>

    <!-- Cards row -->
    <div class="cards-row">
      <SvgIcon
        v-for="cardId in month.cardIds"
        :key="cardId"
        :name="getCardIconName(cardId)"
        class-name="card-icon"
        :aria-label="`Card ${cardId}`"
      />
    </div>
  </li>
</template>

<style scoped>
.month-row {
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.month-row:last-child {
  border-bottom: none;
}

.month-info {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.5rem;
  margin-bottom: 0.75rem;
}

.month-number {
  font-weight: 700;
  color: #c41e3a;
  min-width: 2.5rem;
}

.name-ja {
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  font-weight: 600;
  color: #1f2937;
}

.name-romaji {
  font-size: 0.875rem;
  color: #6b7280;
}

.divider {
  color: #9ca3af;
}

.flower-ja {
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  color: #2c5f2d;
  font-weight: 500;
}

.flower-en {
  font-size: 0.875rem;
  color: #6b7280;
}

.cards-row {
  display: flex;
  gap: 0.5rem;
  padding-left: 0.5rem;
}

.cards-row :deep(.card-icon) {
  height: 4rem;
  width: auto;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

@media (max-width: 640px) {
  .cards-row :deep(.card-icon) {
    height: 3rem;
  }
}
</style>
