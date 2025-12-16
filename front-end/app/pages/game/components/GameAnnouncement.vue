<!--
  GameAnnouncement.vue - 遊戲公告元件

  @description
  統一處理對手 Koi-Koi 和役種公告，使用佇列管理避免 UI 衝突。
  公告會依序播放，顯示指定時間後自動進入下一個。

  視覺設計：
  - 漸層文字：每種役種分類有獨特配色
  - 文字 outline/shadow：增加可讀性
  - 淡入淡出動畫：scale 效果
  - 多役種同時顯示
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'
import { YAKU_GRADIENTS, KOIKOI_GRADIENT, type YakuCategory } from '~/constants/announcement-styles'
import { Z_INDEX } from '~/constants'

const uiStore = useUIStateStore()
const { currentAnnouncement } = storeToRefs(uiStore)

// 是否為 Koi-Koi 公告
const isKoiKoi = computed(() => currentAnnouncement.value?.type === 'koikoi')

// Koi-Koi 漸層
const koiKoiGradient = KOIKOI_GRADIENT

// 役種列表（多役種同時顯示）
const yakuList = computed(() => {
  if (!currentAnnouncement.value || currentAnnouncement.value.type !== 'yaku') {
    return []
  }
  return currentAnnouncement.value.yakuList ?? []
})

// 取得役種分類的漸層樣式
function getYakuGradient(category: YakuCategory): string {
  return YAKU_GRADIENTS[category] || YAKU_GRADIENTS.kasu
}

// 淡出動畫時長（需與 CSS 一致）
const LEAVE_ANIMATION_DURATION = 200

// 監聽公告變化，設定自動清除計時器
watch(currentAnnouncement, (val) => {
  if (val) {
    setTimeout(() => {
      // 先清除當前公告（觸發淡出動畫）
      uiStore.clearCurrentAnnouncement()
      // 等淡出動畫完成後再顯示下一個
      setTimeout(() => {
        uiStore.processNextAnnouncement()
      }, LEAVE_ANIMATION_DURATION)
    }, val.duration)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="announcement">
      <div
        v-if="currentAnnouncement"
        class="fixed inset-0 flex items-center justify-center pointer-events-none"
        :style="{ zIndex: Z_INDEX.ANNOUNCEMENT }"
      >
        <div class="text-center">
          <!-- Koi-Koi 公告 -->
          <template v-if="isKoiKoi">
            <h2
              :class="[
                'text-5xl md:text-6xl font-bold announcement-text',
                'bg-linear-to-r bg-clip-text text-transparent',
                koiKoiGradient
              ]"
            >
              Koi-Koi!
            </h2>
          </template>

          <!-- 役種公告（可同時顯示多個） -->
          <template v-else>
            <div
              v-for="(yaku, index) in yakuList"
              :key="yaku.yakuType"
              :class="{ 'mt-4': index > 0 }"
            >
              <h2
                :class="[
                  'text-4xl md:text-5xl font-bold announcement-text',
                  'bg-linear-to-r bg-clip-text text-transparent',
                  getYakuGradient(yaku.category as YakuCategory)
                ]"
              >
                {{ yaku.yakuName }}
              </h2>
              <p
                v-if="yaku.yakuNameJa"
                class="text-xl md:text-2xl mt-1 text-white/90 font-medium announcement-subtext"
              >
                {{ yaku.yakuNameJa }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 主標題文字：漸層 + outline */
.announcement-text {
  -webkit-text-stroke: 2px rgba(0, 0, 0, 0.5);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

/* 副標題文字：白色 + shadow */
.announcement-subtext {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

/* 動畫：淡入（加快至 0.15s） */
.announcement-enter-active {
  transition: all 0.15s ease-out;
}

/* 動畫：淡出 */
.announcement-leave-active {
  transition: all 0.2s ease-in;
}

.announcement-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.announcement-leave-to {
  opacity: 0;
  transform: scale(1.05);
}
</style>
