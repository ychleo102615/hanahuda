<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScrollTo } from '@/composables/useScrollTo';

// Types
export interface NavigationLink {
  /** 連結顯示文字 */
  label: string;
  /** 連結目標 (href 或錨點 ID) */
  target: string;
  /** 是否為外部連結 (http/https) */
  external?: boolean;
  /** 是否為 CTA 按鈕樣式 */
  isCta?: boolean;
}

// Props
defineProps<{
  /** Logo 文字或圖片路徑 */
  logo: string;
  /** 導航連結列表 */
  links: NavigationLink[];
  /** 是否為透明背景 (用於 sticky header) */
  transparent?: boolean;
}>();

// Emits
const emit = defineEmits<{
  rulesClick: [];
}>();

// Composables
const router = useRouter();
const { scrollTo } = useScrollTo();

// State
const isMobileMenuOpen = ref(false);
const isSticky = ref(false);

// Constants
const NAV_HEIGHT = 64; // h-16 in Tailwind = 64px

// Methods
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const handleScroll = () => {
  isSticky.value = window.scrollY > 50;
};

const handleLinkClick = (link: NavigationLink, event: Event) => {
  closeMobileMenu();

  // 如果是外部連結，讓瀏覽器處理
  if (link.external) {
    return;
  }

  // 如果是錨點連結（以 # 開頭）
  if (link.target.startsWith('#')) {
    event.preventDefault();
    const targetId = link.target.slice(1);

    // 如果是「規則」連結，發出事件通知父組件自動展開
    if (targetId === 'rules') {
      emit('rulesClick');
    }

    // 使用 useScrollTo composable 進行平滑滾動
    scrollTo(targetId, NAV_HEIGHT);
  } else {
    // 如果是路由連結，使用 Vue Router
    event.preventDefault();
    router.push(link.target);
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  // Escape 鍵關閉 mobile menu
  if (event.key === 'Escape' && isMobileMenuOpen.value) {
    closeMobileMenu();
  }
};

// Lifecycle
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <nav
    role="navigation"
    aria-label="Main navigation"
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isSticky
        ? 'bg-primary-900/65 backdrop-blur-sm shadow-lg'
        : transparent
          ? 'bg-transparent'
          : 'bg-primary-900',
    ]"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="shrink-0">
          <a
            href="/"
            class="text-xl md:text-2xl font-bold text-white hover:text-accent-pink transition-colors"
            @click.prevent="router.push('/')"
          >
            {{ logo }}
          </a>
        </div>

        <!-- Desktop Navigation Links -->
        <div class="hidden md:flex md:items-center md:gap-6">
          <a
            v-for="link in links"
            :key="link.label"
            :href="link.target"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener noreferrer' : undefined"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200',
              link.isCta
                ? 'bg-accent-red text-white rounded-md hover:bg-accent-red/90 hover:shadow-lg hover:scale-105'
                : 'text-white hover:text-accent-pink relative group',
            ]"
            @click="handleLinkClick(link, $event)"
            @keydown.enter="handleLinkClick(link, $event)"
            tabindex="0"
          >
            {{ link.label }}
            <!-- Hover 底線特效 (非 CTA 按鈕) -->
            <span
              v-if="!link.isCta"
              class="absolute bottom-0 left-0 w-0 h-0.5 bg-accent-pink transition-all duration-300 group-hover:w-full"
            ></span>
          </a>
        </div>

        <!-- Mobile Menu Button -->
        <button
          class="md:hidden text-white p-2 rounded-md hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-accent-pink"
          @click="toggleMobileMenu"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="mobile-menu"
          aria-label="Toggle navigation menu"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="!isMobileMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Mobile Menu -->
      <div
        id="mobile-menu"
        :class="[
          'md:hidden overflow-hidden transition-all duration-300',
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
        ]"
      >
        <div class="py-4 space-y-2">
          <a
            v-for="link in links"
            :key="link.label"
            :href="link.target"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener noreferrer' : undefined"
            :class="[
              'block px-4 py-3 text-sm font-medium rounded-md transition-colors',
              link.isCta
                ? 'bg-accent-red text-white hover:bg-accent-red/90'
                : 'text-white hover:bg-primary-800 hover:text-accent-pink',
            ]"
            @click="handleLinkClick(link, $event)"
            @keydown.enter="handleLinkClick(link, $event)"
            tabindex="0"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* 確保導航列上方有足夠的頁面內邊距 */
</style>
