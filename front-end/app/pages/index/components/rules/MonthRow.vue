<script setup lang="ts">
import type { MonthData } from '~/types/rules';
import SvgIcon from '~/components/SvgIcon.vue';
import { getCardIconName, getCardJapaneseName } from '~/utils/cardMapping';

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
      <span class="flower-en">({{ month.flowerEn }})</span>
    </div>

    <!-- Cards row -->
    <div class="cards-row">
      <div
        v-for="cardId in month.cardIds"
        :key="cardId"
        class="card-item"
      >
        <SvgIcon
          :name="getCardIconName(cardId)"
          class-name="card-icon"
          :aria-label="getCardJapaneseName(cardId) || `Card ${cardId}`"
        />
        <div class="card-label">
          <span class="card-name-ja">{{ getCardJapaneseName(cardId)?.split('\n')[0] }}</span>
          <span class="card-name-en">{{ getCardJapaneseName(cardId)?.split('\n')[1] }}</span>
        </div>
      </div>
    </div>
  </li>
</template>

<style scoped>
.month-row {
  padding: 0.75rem 0;
  border-bottom: 1px solid #3a4840;
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
  color: var(--color-card-type-bright);
  min-width: 2.5rem;
}

.name-ja {
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  font-weight: 600;
  color: var(--color-text-primary);
}

.name-romaji {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.divider {
  color: var(--color-text-dimmed);
}

.flower-ja {
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  color: var(--color-card-type-seed);
  font-weight: 500;
}

.flower-en {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.cards-row {
  display: flex;
  gap: 1rem;
  padding-left: 0.5rem;
  flex-wrap: wrap;
}

.card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  width: 7.5rem;
}

.card-item :deep(.card-icon) {
  height: 5rem;
  width: auto;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.card-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  line-height: 1.3;
  width: 100%;
  word-wrap: break-word;
}

.card-name-ja {
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-card-name);
}

.card-name-en {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .cards-row {
    gap: 0.75rem;
  }

  .card-item {
    width: 6rem;
  }

  .card-item :deep(.card-icon) {
    height: 3.5rem;
  }

  .card-name-ja {
    font-size: 0.75rem;
  }

  .card-name-en {
    font-size: 0.625rem;
  }
}
</style>
