<script setup lang="ts">
import { ref, onMounted } from 'vue';
import YakuCarousel from './YakuCarousel.vue';
import KeywordText from './rules/KeywordText.vue';
import MonthRow from './rules/MonthRow.vue';
import CardTypeBlock from './rules/CardTypeBlock.vue';
import type {
  RuleCategoryUnion,
  YakuCard,
  GameObjectiveCategory,
  CardDeckCategory,
  CardTypesCategory,
  HowToPlayCategory,
  ScoringRulesCategory,
} from '~/types/rules';

interface Props {
  categories?: RuleCategoryUnion[];
  yakuList?: YakuCard[];
}

const props = withDefaults(defineProps<Props>(), {
  categories: () => [],
  yakuList: () => [],
});

// State management for expanded categories
const expandedCategories = ref<Set<string>>(new Set());

// Toggle category expansion
const toggleCategory = (categoryId: string) => {
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId);
  } else {
    expandedCategories.value.add(categoryId);
  }
  // Force reactivity update
  expandedCategories.value = new Set(expandedCategories.value);
};

// Check if category is expanded
const isCategoryExpanded = (categoryId: string): boolean => {
  return expandedCategories.value.has(categoryId);
};

// Initialize default expanded categories
onMounted(() => {
  props.categories.forEach((category) => {
    if (category.defaultExpanded) {
      expandedCategories.value.add(category.id);
    }
  });
});

// Expose method for external components (e.g., NavigationBar)
const expandAll = () => {
  const allCategoryIds = props.categories.map((c) => c.id);
  expandedCategories.value = new Set(allCategoryIds);
};

defineExpose({ expandAll });

// Type guards for each category type
const isGameObjective = (
  cat: RuleCategoryUnion
): cat is GameObjectiveCategory => cat.id === 'game-objective';

const isCardDeck = (cat: RuleCategoryUnion): cat is CardDeckCategory =>
  cat.id === 'card-deck';

const isCardTypes = (cat: RuleCategoryUnion): cat is CardTypesCategory =>
  cat.id === 'card-types';

const isHowToPlay = (cat: RuleCategoryUnion): cat is HowToPlayCategory =>
  cat.id === 'how-to-play';

const isScoringRules = (cat: RuleCategoryUnion): cat is ScoringRulesCategory =>
  cat.id === 'scoring-rules';
</script>

<template>
  <section id="rules" class="py-16 px-4 bg-primary-400">
    <div class="container mx-auto max-w-6xl">
      <!-- Section Header -->
      <h2 class="text-4xl font-bold text-center mb-12 text-primary-900">
        Game Rules
      </h2>

      <!-- Rules Categories Grid -->
      <div class="flex flex-col gap-6 mb-12">
        <div
          v-for="category in categories"
          :key="category.id"
          class="bg-white rounded-lg shadow-md overflow-hidden"
        >
          <!-- Category Header (Toggle Button) -->
          <button
            @click="toggleCategory(category.id)"
            :aria-expanded="isCategoryExpanded(category.id)"
            :aria-controls="`rules-content-${category.id}`"
            class="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-200 transition-colors"
          >
            <h3 class="text-xl font-semibold text-primary-900">
              {{ category.title }}
            </h3>
            <span
              class="text-2xl text-primary-700 transition-transform duration-300 ease-in-out inline-block"
              :class="
                isCategoryExpanded(category.id) ? 'rotate-45' : 'rotate-0'
              "
            >
              +
            </span>
          </button>

          <!-- Category Content (Collapsible) -->
          <div
            :id="`rules-content-${category.id}`"
            class="grid transition-[grid-template-rows] duration-300 ease-in-out"
            :class="
              isCategoryExpanded(category.id)
                ? 'grid-rows-[1fr]'
                : 'grid-rows-[0fr]'
            "
          >
            <div class="overflow-hidden">
              <div class="px-6 pb-6 pt-2 text-gray-700 space-y-4">
                <!-- Game Objective -->
                <template v-if="isGameObjective(category)">
                  <template
                    v-for="(section, idx) in category.sections"
                    :key="idx"
                  >
                    <p
                      v-if="section.type === 'rich-paragraph' && section.spans"
                      class="leading-relaxed"
                    >
                      <KeywordText :spans="section.spans" />
                    </p>
                    <ul
                      v-else-if="section.type === 'list' && section.items"
                      class="list-disc list-inside space-y-2"
                    >
                      <li v-for="(item, i) in section.items" :key="i">
                        <KeywordText :spans="item" />
                      </li>
                    </ul>
                  </template>
                </template>

                <!-- Card Deck -->
                <template v-else-if="isCardDeck(category)">
                  <p class="leading-relaxed mb-4">{{ category.introText }}</p>
                  <ul class="months-list space-y-0">
                    <MonthRow
                      v-for="month in category.months"
                      :key="month.month"
                      :month="month"
                    />
                  </ul>
                </template>

                <!-- Card Types -->
                <template v-else-if="isCardTypes(category)">
                  <p class="leading-relaxed mb-4">{{ category.introText }}</p>
                  <div class="types-list">
                    <CardTypeBlock
                      v-for="cardType in category.types"
                      :key="cardType.typeId"
                      :type="cardType"
                    />
                  </div>
                </template>

                <!-- How To Play -->
                <template v-else-if="isHowToPlay(category)">
                  <ol class="list-decimal list-inside space-y-4">
                    <li
                      v-for="(step, i) in category.steps"
                      :key="i"
                      class="font-semibold"
                    >
                      {{ step.title }}
                      <p class="font-normal mt-1 ml-5">
                        <KeywordText :spans="step.content" />
                      </p>
                      <ul
                        v-if="step.subItems"
                        class="list-disc list-inside ml-8 mt-2 space-y-1 font-normal"
                      >
                        <li v-for="(subItem, j) in step.subItems" :key="j">
                          <KeywordText :spans="subItem" />
                        </li>
                      </ul>
                    </li>
                  </ol>
                </template>

                <!-- Scoring Rules -->
                <template v-else-if="isScoringRules(category)">
                  <ul class="list-disc list-inside space-y-2">
                    <li v-for="(rule, i) in category.rules" :key="i">
                      <KeywordText :spans="rule" />
                    </li>
                  </ul>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Yaku Carousel Section -->
      <div v-if="yakuList.length > 0" class="mt-12">
        <h3 class="text-3xl font-bold text-center mb-8 text-primary-900">
          Featured Yaku (Scoring Combinations)
        </h3>
        <YakuCarousel :yaku-list="yakuList" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.months-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.types-list {
  display: flex;
  flex-direction: column;
}
</style>
