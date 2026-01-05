<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScrollTo } from '~/composables/useScrollTo';
import PlayerBadge from '~/components/PlayerBadge.vue';

// Types
export interface NavigationLink {
  /** Link display text */
  label: string;
  /** Link target (href or anchor ID) */
  target: string;
  /** Whether this is an external link (http/https) */
  external?: boolean;
  /** Whether this uses CTA button styling */
  isCta?: boolean;
}

// Player info type for logged-in state
interface PlayerInfo {
  displayName: string;
  isGuest: boolean;
}

// Props
defineProps<{
  /** Logo text or image path */
  logo: string;
  /** Navigation link list */
  links: NavigationLink[];
  /** Whether to use transparent background (for sticky header) */
  transparent?: boolean;
  /** Player info when logged in (null = not logged in) */
  player?: PlayerInfo | null;
}>();

// Emits
const emit = defineEmits<{
  rulesClick: [];
  loginClick: [];
  playerClick: [];
  logoutClick: [];
  deleteAccountClick: [];
}>();

// Composables
const router = useRouter();
const { scrollTo } = useScrollTo();

// State
const isMobileMenuOpen = ref(false);
const isSticky = ref(false);

// Refs
const playerBadgeRef = ref<HTMLElement | null>(null);

// Expose ref for parent to access (for Popover positioning)
defineExpose({
  playerBadgeRef,
});

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

  // If external link, let browser handle it
  if (link.external) {
    return;
  }

  // If anchor link (starts with #)
  if (link.target.startsWith('#')) {
    event.preventDefault();
    const targetId = link.target.slice(1);

    // If "rules" link, emit event to notify parent component to auto-expand
    if (targetId === 'rules') {
      emit('rulesClick');
    }

    // Use useScrollTo composable for smooth scrolling
    scrollTo(targetId, NAV_HEIGHT);
  } else if (link.target === '/login') {
    // FR-024: Sign In triggers modal instead of navigation
    event.preventDefault();
    emit('loginClick');
  } else {
    // If route link, use Vue Router
    event.preventDefault();
    router.push(link.target);
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  // Escape key closes mobile menu
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
      'fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out',
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
          <!-- Non-CTA Links (Rules, About) -->
          <template v-for="link in links" :key="link.label">
            <a
              v-if="!link.isCta"
              :href="link.target"
              :target="link.external ? '_blank' : undefined"
              :rel="link.external ? 'noopener noreferrer' : undefined"
              class="px-4 py-2 text-sm font-medium transition-all duration-200 text-white hover:text-accent-pink relative group"
              @click="handleLinkClick(link, $event)"
              @keydown.enter="handleLinkClick(link, $event)"
              tabindex="0"
            >
              {{ link.label }}
              <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-accent-pink transition-all duration-300 group-hover:w-full"></span>
            </a>
          </template>

          <!-- Player Icon / Sign In (FR-026, FR-028) - Before CTA -->
          <div v-if="player" ref="playerBadgeRef">
            <PlayerBadge
              :display-name="player.displayName"
              :is-guest="player.isGuest"
              :show-guest-label="false"
              :clickable="true"
              size="md"
              @click="emit('playerClick')"
            />
          </div>
          <button
            v-else
            @click="emit('loginClick')"
            class="px-4 py-2 text-sm font-medium text-white hover:text-accent-pink relative group transition-all duration-200"
          >
            Sign In
            <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-accent-pink transition-all duration-300 group-hover:w-full"></span>
          </button>

          <!-- CTA Links (Start Game) - At the end -->
          <template v-for="link in links" :key="`cta-${link.label}`">
            <a
              v-if="link.isCta"
              :href="link.target"
              class="px-4 py-2 text-sm font-medium transition-all duration-200 bg-accent-red text-white rounded-md hover:bg-accent-red/90 hover:shadow-lg hover:scale-105"
              @click="handleLinkClick(link, $event)"
              @keydown.enter="handleLinkClick(link, $event)"
              tabindex="0"
            >
              {{ link.label }}
            </a>
          </template>
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
          isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        ]"
      >
        <div class="py-4 space-y-2">
          <!-- Player Info Section (Mobile) -->
          <div v-if="player" class="px-4 py-3 mb-2 border-b border-gray-700">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="text-white font-medium">{{ player.displayName }}</div>
                <div class="text-xs text-gray-400">{{ player.isGuest ? 'Guest account' : 'Registered' }}</div>
              </div>
            </div>
            <!-- Action buttons -->
            <div class="mt-3 flex gap-4">
              <button
                @click="emit('logoutClick'); closeMobileMenu()"
                class="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
              <button
                @click="emit('deleteAccountClick'); closeMobileMenu()"
                class="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Account
              </button>
            </div>
          </div>

          <!-- Non-CTA Links (Rules, About) -->
          <template v-for="link in links" :key="link.label">
            <a
              v-if="!link.isCta"
              :href="link.target"
              :target="link.external ? '_blank' : undefined"
              :rel="link.external ? 'noopener noreferrer' : undefined"
              class="block px-4 py-3 text-sm font-medium rounded-md transition-colors text-white hover:bg-primary-800 hover:text-accent-pink"
              @click="handleLinkClick(link, $event)"
              @keydown.enter="handleLinkClick(link, $event)"
              tabindex="0"
            >
              {{ link.label }}
            </a>
          </template>

          <!-- Sign In (Mobile, when not logged in) - Before CTA -->
          <button
            v-if="!player"
            @click="emit('loginClick'); closeMobileMenu()"
            class="block w-full text-left px-4 py-3 text-sm font-medium text-white hover:bg-primary-800 hover:text-accent-pink rounded-md transition-colors"
          >
            Sign In
          </button>

          <!-- CTA Links (Start Game) - At the bottom -->
          <template v-for="link in links" :key="`mobile-cta-${link.label}`">
            <a
              v-if="link.isCta"
              :href="link.target"
              class="block px-4 py-3 text-sm font-medium rounded-md transition-colors bg-accent-red text-white hover:bg-accent-red/90"
              @click="handleLinkClick(link, $event)"
              @keydown.enter="handleLinkClick(link, $event)"
              tabindex="0"
            >
              {{ link.label }}
            </a>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Ensure adequate page padding above navigation bar */
</style>
