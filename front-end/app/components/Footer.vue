<script setup lang="ts">
/**
 * Footer component
 * Displays copyright notice, personal info, and resource attribution information
 */
import ExternalLinkIcon from './ExternalLinkIcon.vue'

// 版權資訊
const copyrightYear = new Date().getFullYear()
const projectName = 'Hanafuda Koi-Koi こいこい'

// 個人資訊
const personalInfo = {
  name: 'Leo Huang',
  projectUrl: 'https://github.com/ychleo102615/hanahuda',
  linkedInUrl: 'https://www.linkedin.com/in/yaochanghuang102615'
}

// 第三方資源授權列表
const attributions = [
  {
    name: 'Card Designs',
    source: 'dotty-dev/Hanafuda-Louie-Recolor',
    sourceUrl: 'https://github.com/dotty-dev/Hanafuda-Louie-Recolor',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
  }
]
</script>

<template>
  <footer class="bg-game-table text-white py-12">
    <div class="container mx-auto px-4">
      <!-- Desktop: horizontal layout | Mobile: stacked content -->
      <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
        <!-- Left: Copyright notice -->
        <div class="flex-shrink-0">
          <p class="text-sm text-gray-300">
            &copy; {{ copyrightYear }} {{ projectName }}
          </p>
          <p class="text-xs text-gray-300 mt-2">
            Built with Vue 3, TypeScript, and Tailwind CSS
          </p>
        </div>

        <!-- Center: Resource Attribution list -->
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
                  class="inline-flex items-center gap-1 text-gold-light hover:text-white transition-colors underline"
                  :aria-label="`${attr.name} license: ${attr.license}`"
                >
                  <span>{{ attr.license }}</span>
                  <ExternalLinkIcon />
                </a>
              </div>
            </li>
          </ul>
        </div>

        <!-- Right: Personal Information -->
        <div class="flex-shrink-0">
          <h3 class="text-sm font-semibold mb-3 text-gray-200">
            Contact
          </h3>
          <div class="space-y-2 text-sm text-gray-300">
            <p class="font-medium text-white">{{ personalInfo.name }}</p>
            <p>
              <a
                :href="personalInfo.linkedInUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-gold-light hover:text-white transition-colors"
              >
                <span>LinkedIn</span>
                <ExternalLinkIcon />
              </a>
            </p>
            <p>
              <a
                :href="personalInfo.projectUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-gold-light hover:text-white transition-colors"
              >
                <span>Project Repository</span>
                <ExternalLinkIcon />
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* Component-specific styles will be added as needed */
</style>
