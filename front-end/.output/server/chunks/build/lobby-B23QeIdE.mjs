import { defineComponent, ref, computed, watch, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrIncludeBooleanAttr, ssrRenderClass, ssrInterpolate } from 'vue/server-renderer';
import { b as useMatchmakingStateStore, c as useDependency, f as useOptionalDependency, T as TopInfoBar, A as ActionPanel, d as TOKENS } from './matchmakingState-CqgFMnU2.mjs';
import { _ as _export_sfc, n as navigateTo } from './server.mjs';
import 'pinia';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'framesync';
import 'popmotion';
import 'style-value-types';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'vue-router';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "lobby",
  __ssrInlineRender: true,
  setup(__props) {
    const matchmakingStore = useMatchmakingStateStore();
    useDependency(TOKENS.StartGamePort);
    const gameMode = sessionStorage.getItem("gameMode") || "mock";
    gameMode === "mock" ? useOptionalDependency(TOKENS.MockEventEmitter) : null;
    const isPanelOpen = ref(false);
    const countdown = ref(30);
    const isIdle = computed(() => matchmakingStore.status === "idle");
    const isFinding = computed(() => matchmakingStore.status === "finding");
    const hasError = computed(() => matchmakingStore.status === "error");
    const canStartMatchmaking = computed(() => matchmakingStore.canStartMatchmaking);
    const isCountdownWarning = computed(() => countdown.value < 10);
    const menuItems = computed(() => [
      {
        id: "back-home",
        label: "Back to Home",
        icon: "🏠",
        onClick: handleBackToHome
      }
    ]);
    const togglePanel = () => {
      isPanelOpen.value = !isPanelOpen.value;
    };
    const closePanel = () => {
      isPanelOpen.value = false;
    };
    const handleBackToHome = () => {
      navigateTo("/");
      closePanel();
    };
    watch(() => matchmakingStore.status, (newStatus) => {
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-screen bg-green-900 flex flex-col" }, _attrs))} data-v-7d1f5605><header class="h-14 shrink-0" data-v-7d1f5605>`);
      _push(ssrRenderComponent(TopInfoBar, {
        variant: "lobby",
        onMenuClick: togglePanel
      }, null, _parent));
      _push(`</header><main class="flex-1 flex items-center justify-center p-4" data-v-7d1f5605><div class="max-w-4xl w-full" data-v-7d1f5605><div class="border-2 border-gray-700/50 rounded-xl p-6 bg-gray-900/20" data-v-7d1f5605><div class="grid gap-6 md:grid-cols-2" data-v-7d1f5605><div class="md:col-span-2 bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-gray-700 min-h-[380px] grid grid-rows-[auto_1fr_auto]" data-v-7d1f5605><h2 class="text-xl font-bold text-white pb-4 border-b border-gray-600" data-v-7d1f5605> Quick Match </h2><div class="flex items-center justify-center py-6" data-v-7d1f5605><div class="w-full space-y-6" data-v-7d1f5605>`);
      if (isIdle.value) {
        _push(`<div class="space-y-6" data-v-7d1f5605><p class="text-center text-gray-300" data-v-7d1f5605> Ready to play? Click below to find a match! </p><button data-testid="find-match-button" aria-label="Find a match to play" class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"${ssrIncludeBooleanAttr(!canStartMatchmaking.value) ? " disabled" : ""} data-v-7d1f5605> Find Match </button></div>`);
      } else {
        _push(`<!---->`);
      }
      if (isFinding.value) {
        _push(`<div class="space-y-6" data-v-7d1f5605><div data-testid="finding-indicator" class="text-center" data-v-7d1f5605><div class="flex items-center justify-center space-x-2 mb-4" data-v-7d1f5605><svg class="animate-spin h-6 w-6 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-v-7d1f5605><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" data-v-7d1f5605></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" data-v-7d1f5605></path></svg><span class="text-lg font-medium text-white" data-v-7d1f5605>Finding Match...</span></div><div data-testid="matchmaking-countdown" aria-live="polite" class="${ssrRenderClass([isCountdownWarning.value ? "text-red-500 warning" : "text-primary-400", "text-4xl font-bold tabular-nums"])}" data-v-7d1f5605>${ssrInterpolate(countdown.value)}</div><p class="text-sm text-gray-400 mt-2" data-v-7d1f5605>seconds remaining</p></div><button data-testid="find-match-button" class="w-full bg-gray-600 text-gray-400 font-semibold py-3 px-6 rounded-lg cursor-not-allowed opacity-50" disabled data-v-7d1f5605> Finding Match... </button></div>`);
      } else {
        _push(`<!---->`);
      }
      if (hasError.value) {
        _push(`<div class="space-y-6" data-v-7d1f5605><div data-testid="error-message" role="alert" class="bg-red-900/30 border border-red-700 rounded-lg p-4" data-v-7d1f5605><div class="flex items-start" data-v-7d1f5605><svg class="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" data-v-7d1f5605><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" data-v-7d1f5605></path></svg><div class="flex-1" data-v-7d1f5605><h3 class="text-sm font-medium text-red-300" data-v-7d1f5605>Matchmaking Failed</h3><p class="mt-1 text-sm text-red-400" data-v-7d1f5605>${ssrInterpolate(unref(matchmakingStore).errorMessage || "An error occurred. Please try again.")}</p></div></div></div><button data-testid="retry-button" aria-label="Retry matchmaking" class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200" data-v-7d1f5605> Retry </button><button data-testid="find-match-button" class="w-full bg-gray-600 text-gray-400 font-semibold py-3 px-6 rounded-lg cursor-not-allowed opacity-50" disabled data-v-7d1f5605> Find Match </button></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><div class="pt-6 border-t border-gray-600" data-v-7d1f5605><p class="text-sm text-gray-400 text-center" data-v-7d1f5605> You will be matched with an opponent and the game will start automatically. </p></div></div><div class="relative bg-gray-800/40 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-gray-700/50 opacity-60" data-v-7d1f5605><div class="absolute top-4 right-4 bg-primary-600/80 text-white text-xs font-bold px-3 py-1 rounded-full" data-v-7d1f5605> Coming Soon </div><h2 class="text-xl font-bold text-gray-400 mb-6 pb-4 border-b border-gray-600/50" data-v-7d1f5605> Custom Room </h2><p class="text-center text-gray-400 mb-6" data-v-7d1f5605> Create or join a custom game room </p><button disabled class="w-full bg-gray-700 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed" data-v-7d1f5605> Browse Rooms </button></div></div></div></div></main>`);
      _push(ssrRenderComponent(ActionPanel, {
        "is-open": isPanelOpen.value,
        items: menuItems.value,
        onClose: closePanel
      }, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/lobby.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const lobby = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7d1f5605"]]);

export { lobby as default };
//# sourceMappingURL=lobby-B23QeIdE.mjs.map
