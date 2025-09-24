<script setup lang="ts">
// 簡化的 License Footer 組件
</script>

<template>
  <footer class="bg-gradient-to-r from-slate-50 to-slate-200 border-t border-slate-200 text-slate-600 text-sm mt-auto" aria-label="授權聲明">
    <div class="max-w-6xl mx-auto px-4 py-6 md:p-8">
      <!-- 主要授權聲明 -->
      <div class="flex items-start flex-col gap-3 md:flex-row md:gap-4">
        <div class="text-emerald-600 flex-shrink-0 self-start mt-0 md:mt-0.5" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-slate-800 mb-2">圖像資源授權聲明</h3>
          <p class="leading-relaxed mb-4 text-slate-600">
            本遊戲使用的花牌圖像改編自 <strong class="text-slate-800">Louie Mantia</strong> 設計的 Hanafuda 牌組，
            採用 <strong class="text-slate-800">Creative Commons Attribution-ShareAlike 4.0 International License</strong> 授權。
            這意味著您可以自由使用、修改和分享，但需要註明來源並採用相同授權。
          </p>

          <!-- 英文聲明 -->
          <p class="italic text-slate-500 bg-slate-100 p-4 rounded-lg border-l-4 border-blue-500 mb-4 text-sm leading-relaxed">
            Card artwork adapted from Hanafuda deck designed by <strong class="text-slate-700">Louie Mantia</strong>,
            licensed under <strong class="text-slate-700">Creative Commons Attribution-ShareAlike 4.0 International License</strong>.
            You are free to share and adapt the material, but must provide appropriate credit and
            license your derivative works under the same license.
          </p>

          <!-- 授權連結區域 -->
          <div class="flex items-center flex-wrap gap-2 md:gap-4">
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all duration-200 font-medium hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm"
              aria-label="查看 Creative Commons BY-SA 4.0 授權條款"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              CC BY-SA 4.0
            </a>

            <a
              href="https://github.com/dotty-dev/Hanafuda-Louie-Recolor"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all duration-200 font-medium hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm"
              aria-label="查看原始資源來源"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              原始來源
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

