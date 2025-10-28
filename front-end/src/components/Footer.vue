<script setup lang="ts">
/**
 * Footer 組件
 * 顯示版權聲明和資源 attribution 資訊
 */

export interface AttributionLink {
  /** 資源名稱 (e.g., "Hanafuda Images") */
  name: string;
  /** 資源來源 (e.g., "Wikimedia Commons") */
  source: string;
  /** 資源來源連結 (e.g., "https://commons.wikimedia.org/wiki/Category:Hanafuda") */
  sourceUrl: string;
  /** 授權類型 (e.g., "Public Domain", "CC BY-SA 4.0") */
  license: string;
  /** 授權頁面連結 */
  licenseUrl: string;
}

export interface FooterProps {
  /** 版權年分 */
  copyrightYear: number;
  /** 專案名稱 */
  projectName: string;
  /** 第三方資源 attribution 列表 */
  attributions: AttributionLink[];
}

// Props
defineProps<FooterProps>();
</script>

<template>
  <footer class="bg-primary-900 text-white py-12">
    <div class="container mx-auto px-4">
      <!-- 桌面版: 左右排版 | 手機版: 堆疊內容 -->
      <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
        <!-- 左側: 版權聲明 -->
        <div class="flex-shrink-0">
          <p class="text-sm text-gray-300">
            &copy; {{ copyrightYear }} {{ projectName }}
          </p>
          <p class="text-xs text-gray-400 mt-2">
            Built with Vue 3, TypeScript, and Tailwind CSS
          </p>
        </div>

        <!-- 右側: 資源 Attribution 列表 -->
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
                <!-- 資源名稱 -->
                <span class="font-medium text-white">{{ attr.name }}</span>
                <span class="hidden sm:inline text-gray-500">•</span>

                <!-- 資源來源 (可點擊連結) -->
                <a
                  :href="attr.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
                  :aria-label="`View ${attr.name} source: ${attr.source}`"
                >
                  <span>{{ attr.source }}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
                <span class="hidden sm:inline text-gray-500">•</span>

                <!-- 授權連結 -->
                <a
                  :href="attr.licenseUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-accent-pink hover:text-accent-red transition-colors underline"
                  :aria-label="`${attr.name} license: ${attr.license}`"
                >
                  <span>{{ attr.license }}</span>
                  <!-- 外部連結圖示 -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
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
