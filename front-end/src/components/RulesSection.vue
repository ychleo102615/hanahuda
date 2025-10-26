<script setup lang="ts">
import { ref, onMounted } from 'vue';
import YakuCarousel from './YakuCarousel.vue';
import type { RuleCategory, YakuCard, OrderedListItem } from '@/types/rules';

interface Props {
  categories?: RuleCategory[];
  yakuList?: YakuCard[];
}

// Props (optional as they can be loaded dynamically)
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
</script>

<template>
  <section id="rules" class="py-16 px-4  bg-primary-400">
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
            class="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
          >
            <h3 class="text-xl font-semibold text-primary-900">
              {{ category.title }}
            </h3>
            <span class="text-2xl text-primary-700 transition-transform" :class="{ 'rotate-45': isCategoryExpanded(category.id) }">
              {{ isCategoryExpanded(category.id) ? '−' : '+' }}
            </span>
          </button>

          <!-- Category Content (Collapsible) -->
          <div
            :id="`rules-content-${category.id}`"
            class="overflow-hidden transition-all duration-300 ease-in-out"
            :class="isCategoryExpanded(category.id) ? 'max-h-screen' : 'max-h-0'"
          >
            <div class="px-6 pb-6 text-gray-700 space-y-4">
              <!-- Render sections dynamically -->
              <div v-for="(section, idx) in category.sections" :key="idx">
                <!-- Paragraph -->
                <p v-if="section.type === 'paragraph'" class="leading-relaxed">
                  {{ section.text }}
                </p>

                <!-- Unordered List -->
                <ul v-else-if="section.type === 'list'" class="list-disc list-inside space-y-2">
                  <li v-for="(item, i) in section.items as string[]" :key="i">
                    {{ item }}
                  </li>
                </ul>

                <!-- Ordered List -->
                <ol v-else-if="section.type === 'ordered-list'" class="list-decimal list-inside space-y-3">
                  <li v-for="(item, i) in section.items as OrderedListItem[]" :key="i" class="font-semibold">
                    {{ item.title }}
                    <p class="font-normal mt-1">{{ item.text }}</p>
                    <ul v-if="item.subItems" class="list-disc list-inside ml-6 mt-2 space-y-1 font-normal">
                      <li v-for="(subItem, j) in item.subItems" :key="j">
                        {{ subItem }}
                      </li>
                    </ul>
                  </li>
                </ol>
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
/* Smooth rotation transition for toggle icon */
span {
  transition: transform 0.3s ease-in-out;
}

.rotate-45 {
  transform: rotate(45deg);
}
</style>
