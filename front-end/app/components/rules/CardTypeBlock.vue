<script setup lang="ts">
import type { CardTypeInfo, CardTypeId } from '~/types/rules';
import SvgIcon from '~/components/SvgIcon.vue';
import { getCardIconName } from '~/utils/cardMapping';

interface Props {
  type: CardTypeInfo;
}

defineProps<Props>();

const getTypeGradient = (typeId: CardTypeId): string => {
  const gradients: Record<CardTypeId, string> = {
    hikari: 'from-amber-600 to-yellow-700',
    tane: 'from-emerald-600 to-green-700',
    tanzaku: 'from-rose-600 to-pink-700',
    kasu: 'from-gray-500 to-gray-600',
  };
  return gradients[typeId];
};
</script>

<template>
  <div class="type-block">
    <!-- Type header -->
    <div
      class="type-header bg-gradient-to-r text-white"
      :class="getTypeGradient(type.typeId)"
    >
      <div class="type-names">
        <span class="name-ja">{{ type.nameJa }}</span>
        <span class="name-en">{{ type.nameEn }}</span>
      </div>
      <div class="type-stats">
        <span class="points">{{ type.points }} pts</span>
        <span class="count">{{ type.count }} cards</span>
      </div>
    </div>

    <!-- Description -->
    <p class="type-description">{{ type.description }}</p>

    <!-- Main cards display (for hikari, tane) -->
    <div v-if="type.cardIds.length > 0" class="cards-display">
      <SvgIcon
        v-for="cardId in type.cardIds"
        :key="cardId"
        :name="getCardIconName(cardId)"
        class-name="type-card-icon"
        :aria-label="`Card ${cardId}`"
      />
    </div>

    <!-- Sub types (for tanzaku: akatan, aotan) -->
    <div v-if="type.subTypes && type.subTypes.length > 0" class="sub-types">
      <div
        v-for="subType in type.subTypes"
        :key="subType.name"
        class="sub-type"
      >
        <div class="sub-type-header">
          <span class="sub-name-ja">{{ subType.nameJa }}</span>
          <span class="sub-name-en">{{ subType.name }}</span>
        </div>
        <div class="sub-cards">
          <SvgIcon
            v-for="cardId in subType.cardIds"
            :key="cardId"
            :name="getCardIconName(cardId)"
            class-name="sub-card-icon"
            :aria-label="`Card ${cardId}`"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.type-block {
  background: #2a3530;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  margin-bottom: 1rem;
  border: 1px solid #3a4840;
}

.type-block:last-child {
  margin-bottom: 0;
}

.type-header {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.type-names {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.name-ja {
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  font-size: 1.25rem;
  font-weight: 700;
}

.name-en {
  font-size: 0.875rem;
  opacity: 0.9;
}

.type-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.points {
  font-weight: 600;
}

.type-description {
  padding: 1rem 1.25rem;
  color: #d1d5db;
  font-size: 0.9375rem;
  border-bottom: 1px solid #3a4840;
  margin: 0;
}

.cards-display {
  padding: 1rem 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cards-display :deep(.type-card-icon) {
  height: 5rem;
  width: auto;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.sub-types {
  padding: 1rem 1.25rem;
  background: #222a25;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sub-type {
  background: #303d35;
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  border: 1px solid #3a4840;
}

.sub-type-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.sub-name-ja {
  font-family: var(--font-jp, 'Noto Sans JP', sans-serif);
  font-weight: 600;
  color: #f87171;
}

.sub-name-en {
  font-size: 0.75rem;
  color: #9ca3af;
}

.sub-cards {
  display: flex;
  gap: 0.25rem;
}

.sub-cards :deep(.sub-card-icon) {
  height: 3.5rem;
  width: auto;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

@media (max-width: 640px) {
  .cards-display :deep(.type-card-icon) {
    height: 4rem;
  }

  .sub-cards :deep(.sub-card-icon) {
    height: 3rem;
  }
}
</style>
