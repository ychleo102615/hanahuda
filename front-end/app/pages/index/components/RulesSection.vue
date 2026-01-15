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
  <section id="rules" class="rules-section relative py-16 px-4 overflow-hidden">
    <div class="container mx-auto max-w-6xl relative z-10">
      <!-- Section Header -->
      <div class="text-center mb-12">
        <p class="text-gold-light text-sm font-semibold uppercase tracking-wider mb-4">
          HOW TO PLAY
        </p>
        <h2 class="text-4xl md:text-5xl font-bold font-serif text-white mb-4">
          Game Rules &amp; Strategy
        </h2>
        <p class="text-gray-300 max-w-2xl mx-auto">
          Understanding Koi-Koi is simple, yet mastering it takes a lifetime.
          Here are the basics to get you started on your journey.
        </p>
      </div>

      <!-- Rules Categories Grid -->
      <div class="flex flex-col gap-4 mb-12">
        <div
          v-for="category in categories"
          :key="category.id"
          class="rounded-xl overflow-hidden transition-all duration-300"
          :class="[
            'rules-card border',
            isCategoryExpanded(category.id) ? 'border-gold-light' : ''
          ]"
        >
          <!-- Category Header (Toggle Button) -->
          <button
            @click="toggleCategory(category.id)"
            :aria-expanded="isCategoryExpanded(category.id)"
            :aria-controls="`rules-content-${category.id}`"
            class="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
          >
            <!-- Icon -->
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gold-dark/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-gold-light" fill="currentColor" viewBox="0 0 20 20">
                <path v-if="category.id === 'game-objective'" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                <path v-else-if="category.id === 'card-deck'" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z"/>
                <path v-else-if="category.id === 'card-types'" d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                <path v-else-if="category.id === 'how-to-play'" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                <path v-else d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"/>
              </svg>
            </div>
            <h3 class="flex-1 text-lg font-semibold text-white">
              {{ category.title }}
            </h3>
            <svg
              class="w-5 h-5 text-gray-300 transition-transform duration-300"
              :class="isCategoryExpanded(category.id) ? 'rotate-180' : 'rotate-0'"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
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
              <div class="px-6 pb-6 pt-2 text-gray-300 space-y-4">
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
        <h3 class="text-3xl font-bold text-center mb-8 text-white">
          Featured Yaku 役 (Scoring Combinations)
        </h3>
        <YakuCarousel :yaku-list="yakuList" />
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 深色背景 + 漸層（使用森林綠調，與 About Section 區隔） */
.rules-section {
  --rules-bg-dark: #1e2520;
  --rules-bg-mid: #2a3530;
  --rules-bg-light: #3a4840;
  --rules-border: #485848;
  --rules-border-light: #586858;

  background-color: var(--rules-bg-dark);
}

.rules-card {
  background-color: var(--rules-bg-light);
  border-color: var(--rules-border);
}

.rules-card:hover {
  border-color: var(--rules-border-light);
}

.months-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.types-list {
  display: flex;
  flex-direction: column;
}

/* 水印背景 - 使用 SVG 圖案（調高透明度） */
.rules-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 976 1600'%3E%3Cg fill='none' stroke='%23ffffff' opacity='0.03'%3E%3Crect x='24' y='24' width='928' height='1552' rx='36' ry='36' stroke-width='8'/%3E%3Crect x='48' y='96' width='880' height='1408' rx='24' ry='24' stroke-width='4'/%3E%3Ccircle cx='488' cy='800' r='220' stroke-width='6'/%3E%3Ccircle cx='488' cy='800' r='190' stroke-width='4'/%3E%3Ccircle cx='488' cy='800' r='60' stroke-width='3'/%3E%3Ccircle cx='488' cy='800' r='34' stroke-width='2'/%3E%3Cg transform='translate(488,800)'%3E%3Cline x1='0' y1='-70' x2='0' y2='-180' stroke-width='3'/%3E%3Cline x1='0' y1='-70' x2='0' y2='-180' stroke-width='3' transform='rotate(45)'/%3E%3Cline x1='0' y1='-70' x2='0' y2='-180' stroke-width='3' transform='rotate(90)'/%3E%3Cline x1='0' y1='-70' x2='0' y2='-180' stroke-width='3' transform='rotate(135)'/%3E%3Cline x1='0' y1='-70' x2='0' y2='-180' stroke-width='3' transform='rotate(180)'/%3E%3Cline x1='0' y1='-70' x2='0' y2='-180' stroke-width='3' transform='rotate(225)'/%3E%3Cline x1='0' y1='-70' x2='0' y2='-180' stroke-width='3' transform='rotate(270)'/%3E%3Cline x1='0' y1='-70' x2='0' y2='-180' stroke-width='3' transform='rotate(315)'/%3E%3C/g%3E%3Cpath d='M144 400 Q488 200 832 400' stroke-width='3'/%3E%3Cpath d='M144 1200 Q488 1000 832 1200' stroke-width='3'/%3E%3C/g%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 300px auto;
  pointer-events: none;
  z-index: 0;
}
</style>
