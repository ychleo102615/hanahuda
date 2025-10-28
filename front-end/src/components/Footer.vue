<script setup lang="ts">
/**
 * Footer component
 * Displays copyright notice and resource attribution information
 */
import ExternalLinkIcon from './ExternalLinkIcon.vue'

export interface AttributionLink {
  /** Resource name (e.g., "Hanafuda Images") */
  name: string;
  /** Resource source (e.g., "Wikimedia Commons") */
  source: string;
  /** Resource source link (e.g., "https://commons.wikimedia.org/wiki/Category:Hanafuda") */
  sourceUrl: string;
  /** License type (e.g., "Public Domain", "CC BY-SA 4.0") */
  license: string;
  /** License page link */
  licenseUrl: string;
}

export interface FooterProps {
  /** Copyright year */
  copyrightYear: number;
  /** Project name */
  projectName: string;
  /** Third-party resource attribution list */
  attributions: AttributionLink[];
}

// Props
defineProps<FooterProps>();
</script>

<template>
  <footer class="bg-primary-900 text-white py-12">
    <div class="container mx-auto px-4">
      <!-- Desktop: horizontal layout | Mobile: stacked content -->
      <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
        <!-- Left: Copyright notice -->
        <div class="flex-shrink-0">
          <p class="text-sm text-gray-300">
            &copy; {{ copyrightYear }} {{ projectName }}
          </p>
          <p class="text-xs text-gray-400 mt-2">
            Built with Vue 3, TypeScript, and Tailwind CSS
          </p>
        </div>

        <!-- Right: Resource Attribution list -->
        <div class="flex-grow">
          <h3 class="text-sm font-semibold mb-3 text-gray-200">
            Attributions
          </h3>
          <ul class="space-y-3">
            <li
              v-for="(attr, index) in attributions"
              :key="index"
              class="text-sm text-gray-300"
            >
              <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <!-- Resource name -->
                <span class="font-medium text-white">{{ attr.name }}</span>
                <span class="hidden sm:inline text-gray-500">•</span>

                <!-- Resource source (clickable link) -->
                <a
                  :href="attr.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
                  :aria-label="`View ${attr.name} source: ${attr.source}`"
                >
                  <span>{{ attr.source }}</span>
                  <ExternalLinkIcon />
                </a>
                <span class="hidden sm:inline text-gray-500">•</span>

                <!-- License link -->
                <a
                  :href="attr.licenseUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-accent-pink hover:text-accent-red transition-colors underline"
                  :aria-label="`${attr.name} license: ${attr.license}`"
                >
                  <span>{{ attr.license }}</span>
                  <ExternalLinkIcon />
                </a>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* Component-specific styles will be added as needed */
</style>
