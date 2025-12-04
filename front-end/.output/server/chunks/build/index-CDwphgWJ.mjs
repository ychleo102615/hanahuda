import { defineComponent, ref, mergeProps, unref, computed, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderAttr, ssrRenderClass, ssrRenderStyle, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { useRouter } from 'vue-router';
import { _ as _export_sfc } from './server.mjs';
import { S as SvgIcon, g as getCardIconName } from './cardMapping-CW6u8nZX.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'pinia';

function useScrollTo() {
  const isScrolling = ref(false);
  const scrollTo = (elementId, offset = 0) => {
    const element = (void 0).getElementById(elementId);
    if (!element) {
      console.warn(`Element with id "${elementId}" not found`);
      return;
    }
    isScrolling.value = true;
    const y = element.getBoundingClientRect().top + (void 0).scrollY - offset;
    (void 0).scrollTo({
      top: y,
      behavior: "smooth"
    });
    setTimeout(() => {
      isScrolling.value = false;
    }, 1e3);
  };
  return { scrollTo, isScrolling };
}
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "NavigationBar",
  __ssrInlineRender: true,
  props: {
    logo: {},
    links: {},
    transparent: { type: Boolean }
  },
  emits: ["rulesClick"],
  setup(__props, { emit: __emit }) {
    useRouter();
    useScrollTo();
    const isMobileMenuOpen = ref(false);
    const isSticky = ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<nav${ssrRenderAttrs(mergeProps({
        role: "navigation",
        "aria-label": "Main navigation",
        class: [
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isSticky.value ? "bg-primary-900/65 backdrop-blur-sm shadow-lg" : __props.transparent ? "bg-transparent" : "bg-primary-900"
        ]
      }, _attrs))} data-v-8b05d388><div class="container mx-auto px-4 sm:px-6 lg:px-8" data-v-8b05d388><div class="flex justify-between items-center h-16" data-v-8b05d388><div class="shrink-0" data-v-8b05d388><a href="/" class="text-xl md:text-2xl font-bold text-white hover:text-accent-pink transition-colors" data-v-8b05d388>${ssrInterpolate(__props.logo)}</a></div><div class="hidden md:flex md:items-center md:gap-6" data-v-8b05d388><!--[-->`);
      ssrRenderList(__props.links, (link) => {
        _push(`<a${ssrRenderAttr("href", link.target)}${ssrRenderAttr("target", link.external ? "_blank" : void 0)}${ssrRenderAttr("rel", link.external ? "noopener noreferrer" : void 0)} class="${ssrRenderClass([
          "px-4 py-2 text-sm font-medium transition-all duration-200",
          link.isCta ? "bg-accent-red text-white rounded-md hover:bg-accent-red/90 hover:shadow-lg hover:scale-105" : "text-white hover:text-accent-pink relative group"
        ])}" tabindex="0" data-v-8b05d388>${ssrInterpolate(link.label)} `);
        if (!link.isCta) {
          _push(`<span class="absolute bottom-0 left-0 w-0 h-0.5 bg-accent-pink transition-all duration-300 group-hover:w-full" data-v-8b05d388></span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</a>`);
      });
      _push(`<!--]--></div><button class="md:hidden text-white p-2 rounded-md hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-accent-pink"${ssrRenderAttr("aria-expanded", isMobileMenuOpen.value)} aria-controls="mobile-menu" aria-label="Toggle navigation menu" data-v-8b05d388><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-8b05d388>`);
      if (!isMobileMenuOpen.value) {
        _push(`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" data-v-8b05d388></path>`);
      } else {
        _push(`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" data-v-8b05d388></path>`);
      }
      _push(`</svg></button></div><div id="mobile-menu" class="${ssrRenderClass([
        "md:hidden overflow-hidden transition-all duration-300",
        isMobileMenuOpen.value ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      ])}" data-v-8b05d388><div class="py-4 space-y-2" data-v-8b05d388><!--[-->`);
      ssrRenderList(__props.links, (link) => {
        _push(`<a${ssrRenderAttr("href", link.target)}${ssrRenderAttr("target", link.external ? "_blank" : void 0)}${ssrRenderAttr("rel", link.external ? "noopener noreferrer" : void 0)} class="${ssrRenderClass([
          "block px-4 py-3 text-sm font-medium rounded-md transition-colors",
          link.isCta ? "bg-accent-red text-white hover:bg-accent-red/90" : "text-white hover:bg-primary-800 hover:text-accent-pink"
        ])}" tabindex="0" data-v-8b05d388>${ssrInterpolate(link.label)}</a>`);
      });
      _push(`<!--]--></div></div></div></nav>`);
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/NavigationBar.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const NavigationBar = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$6, [["__scopeId", "data-v-8b05d388"]]), { __name: "NavigationBar" });
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "HeroSection",
  __ssrInlineRender: true,
  props: {
    title: {},
    subtitle: {},
    ctaText: {},
    ctaTarget: {},
    backgroundImage: {}
  },
  setup(__props) {
    useRouter();
    const isNavigating = ref(false);
    const parallaxOffset = ref(0);
    const isVisible = ref(false);
    const showEntryAnimation = ref(true);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: "hero-section relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-900 to-primary-700 px-6 text-white",
        style: __props.backgroundImage ? `background-image: url('${__props.backgroundImage}')` : "",
        "aria-labelledby": "hero-title"
      }, _attrs))} data-v-05a48240><div class="absolute inset-0 bg-black/30" aria-hidden="true" data-v-05a48240></div><div class="decorative-elements" style="${ssrRenderStyle({ transform: `translateY(${parallaxOffset.value * 0.3}px)` })}" aria-hidden="true" data-v-05a48240><div class="absolute -right-20 top-20 h-96 w-96 rounded-full border-2 border-white/10 md:-right-10 md:h-[500px] md:w-[500px]" data-v-05a48240></div><div class="absolute -left-32 bottom-10 h-80 w-80 rounded-full border-2 border-white/5 md:-left-20 md:h-96 md:w-96" data-v-05a48240></div><div class="absolute right-1/4 top-32 h-32 w-32 rounded-full bg-accent-pink/10 md:h-40 md:w-40" data-v-05a48240></div><div class="absolute bottom-32 left-1/3 h-24 w-24 rounded-full bg-accent-red/10 md:h-32 md:w-32" data-v-05a48240></div><div class="absolute left-1/4 top-40 h-1 w-32 rotate-45 bg-white/10 md:w-40" data-v-05a48240></div><div class="absolute bottom-40 right-1/4 h-1 w-24 -rotate-45 bg-white/5 md:w-32" data-v-05a48240></div></div><div class="relative z-10 mx-auto max-w-4xl text-center" style="${ssrRenderStyle({ transform: `translateY(${parallaxOffset.value * 0.1}px)` })}" data-v-05a48240><h1 id="hero-title" class="${ssrRenderClass([
        "mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl",
        "bg-linear-to-r from-amber-200 via-yellow-100 to-white bg-clip-text text-transparent",
        "opacity-0",
        isVisible.value && "animate-slide-up-fade-in"
      ])}" style="${ssrRenderStyle({
        animationDelay: "100ms",
        textShadow: "0 0 30px rgba(251, 191, 36, 0.3)"
      })}" data-v-05a48240>${ssrInterpolate(__props.title)}</h1><p class="${ssrRenderClass([
        "mb-10 text-lg text-gray-200 md:text-xl lg:text-2xl",
        "opacity-0",
        isVisible.value && "animate-slide-up-fade-in"
      ])}" style="${ssrRenderStyle({
        animationDelay: "300ms"
      })}" data-v-05a48240>${ssrInterpolate(__props.subtitle)}</p><button${ssrIncludeBooleanAttr(isNavigating.value) ? " disabled" : ""}${ssrRenderAttr("aria-busy", isNavigating.value)} class="${ssrRenderClass([
        "inline-flex items-center rounded-lg bg-accent-red px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 cursor-pointer",
        "hover:scale-105 hover:bg-red-600 hover:shadow-xl",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-red",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
        "md:px-10 md:py-5 md:text-xl",
        (!isVisible.value || showEntryAnimation.value) && "opacity-0",
        // normal state
        !isNavigating.value && !showEntryAnimation.value && "animate-pulse-subtle hover:animate-none",
        isVisible.value && showEntryAnimation.value && "animate-fade-in"
      ])}" style="${ssrRenderStyle({
        animationDelay: "500ms"
      })}" tabindex="0" data-v-05a48240><span data-v-05a48240>${ssrInterpolate(__props.ctaText)}</span>`);
      if (!isNavigating.value) {
        _push(`<svg class="ml-2 h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" data-v-05a48240><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" data-v-05a48240></path></svg>`);
      } else {
        _push(`<svg class="ml-2 h-5 w-5 animate-spin md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" aria-hidden="true" data-v-05a48240><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" data-v-05a48240></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" data-v-05a48240></path></svg>`);
      }
      _push(`</button></div></section>`);
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/HeroSection.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const HeroSection = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$5, [["__scopeId", "data-v-05a48240"]]), { __name: "HeroSection" });
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "YakuCarousel",
  __ssrInlineRender: true,
  props: {
    yakuList: {}
  },
  setup(__props) {
    const props = __props;
    const currentIndex = ref(0);
    const currentYaku = computed(() => {
      return props.yakuList[currentIndex.value] || null;
    });
    const formatDescription = (yaku) => {
      if (yaku.minimumCards) {
        return `${yaku.description} (${yaku.minimumCards}+ cards needed)`;
      }
      return yaku.description;
    };
    const getCategoryColor = (category) => {
      const colors = {
        hikari: "bg-yellow-500 text-white",
        tanzaku: "bg-pink-500 text-white",
        tane: "bg-green-500 text-white",
        kasu: "bg-gray-500 text-white"
      };
      return colors[category] || "bg-blue-500 text-white";
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "relative w-full max-w-4xl mx-auto" }, _attrs))} data-v-e74f5ef6><div class="relative overflow-hidden rounded-lg shadow-lg bg-white p-8 min-h-[560px] flex items-center" data-v-e74f5ef6>`);
      if (currentYaku.value) {
        _push(`<div class="text-center space-y-6 w-full" data-v-e74f5ef6><div class="space-y-2" data-v-e74f5ef6><h4 class="text-3xl font-bold text-primary-900" data-v-e74f5ef6>${ssrInterpolate(currentYaku.value.name)}</h4></div><div class="flex justify-center" data-v-e74f5ef6><span class="${ssrRenderClass([getCategoryColor(currentYaku.value.category), "px-4 py-1 rounded-full text-sm font-semibold uppercase tracking-wide"])}" data-v-e74f5ef6>${ssrInterpolate(currentYaku.value.category)}</span></div><div class="text-5xl font-bold text-accent-red" data-v-e74f5ef6>${ssrInterpolate(currentYaku.value.points)} <span class="text-2xl text-gray-600" data-v-e74f5ef6>points</span></div><p class="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto" data-v-e74f5ef6>${ssrInterpolate(formatDescription(currentYaku.value))}</p>`);
        if (currentYaku.value.cardIds) {
          _push(`<div class="flex justify-center gap-4 flex-wrap items-center" data-v-e74f5ef6><!--[-->`);
          ssrRenderList(currentYaku.value.cardIds, (cardId) => {
            _push(ssrRenderComponent(SvgIcon, {
              key: cardId,
              name: unref(getCardIconName)(cardId),
              "class-name": "h-32 w-auto drop-shadow-lg transition-transform hover:scale-105",
              "aria-label": `Card ${cardId}`
            }, null, _parent));
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<div class="text-center text-gray-500 py-12" data-v-e74f5ef6> No Yaku available </div>`);
      }
      _push(`</div><button${ssrIncludeBooleanAttr(__props.yakuList.length === 0) ? " disabled" : ""} aria-label="Previous Yaku" class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full p-4 shadow-lg transition-all" data-v-e74f5ef6><svg class="w-6 h-6 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-e74f5ef6><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" data-v-e74f5ef6></path></svg></button><button${ssrIncludeBooleanAttr(__props.yakuList.length === 0) ? " disabled" : ""} aria-label="Next Yaku" class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full p-4 shadow-lg transition-all" data-v-e74f5ef6><svg class="w-6 h-6 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-e74f5ef6><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" data-v-e74f5ef6></path></svg></button><div class="flex justify-center gap-2 mt-6" data-v-e74f5ef6><!--[-->`);
      ssrRenderList(__props.yakuList, (_, index2) => {
        _push(`<button${ssrRenderAttr("aria-label", `Go to slide ${index2 + 1}`)} class="${ssrRenderClass([
          "w-3 h-3 rounded-full transition-all",
          index2 === currentIndex.value ? "bg-primary-900 w-8" : "bg-gray-300 hover:bg-gray-400"
        ])}" data-v-e74f5ef6></button>`);
      });
      _push(`<!--]--></div></div>`);
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/YakuCarousel.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const YakuCarousel = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$4, [["__scopeId", "data-v-e74f5ef6"]]), { __name: "YakuCarousel" });
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "RulesSection",
  __ssrInlineRender: true,
  props: {
    categories: { default: () => [] },
    yakuList: { default: () => [] }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const expandedCategories = ref(/* @__PURE__ */ new Set());
    const isCategoryExpanded = (categoryId) => {
      return expandedCategories.value.has(categoryId);
    };
    const expandAll = () => {
      const allCategoryIds = props.categories.map((c) => c.id);
      expandedCategories.value = new Set(allCategoryIds);
    };
    __expose({ expandAll });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<section${ssrRenderAttrs(mergeProps({
        id: "rules",
        class: "py-16 px-4 bg-primary-400"
      }, _attrs))}><div class="container mx-auto max-w-6xl"><h2 class="text-4xl font-bold text-center mb-12 text-primary-900"> Game Rules </h2><div class="flex flex-col gap-6 mb-12"><!--[-->`);
      ssrRenderList(__props.categories, (category) => {
        _push(`<div class="bg-white rounded-lg shadow-md overflow-hidden"><button${ssrRenderAttr("aria-expanded", isCategoryExpanded(category.id))}${ssrRenderAttr("aria-controls", `rules-content-${category.id}`)} class="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-200 transition-colors"><h3 class="text-xl font-semibold text-primary-900">${ssrInterpolate(category.title)}</h3><span class="${ssrRenderClass([isCategoryExpanded(category.id) ? "rotate-45" : "rotate-0", "text-2xl text-primary-700 transition-transform duration-300 ease-in-out inline-block"])}"> + </span></button><div${ssrRenderAttr("id", `rules-content-${category.id}`)} class="${ssrRenderClass([isCategoryExpanded(category.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]", "grid transition-[grid-template-rows] duration-300 ease-in-out"])}"><div class="overflow-hidden"><div class="px-6 pb-6 pt-2 text-gray-700 space-y-4"><!--[-->`);
        ssrRenderList(category.sections, (section, idx) => {
          _push(`<div>`);
          if (section.type === "paragraph") {
            _push(`<p class="leading-relaxed">${ssrInterpolate(section.text)}</p>`);
          } else if (section.type === "list") {
            _push(`<ul class="list-disc list-inside space-y-2"><!--[-->`);
            ssrRenderList(section.items, (item, i) => {
              _push(`<li>${ssrInterpolate(item)}</li>`);
            });
            _push(`<!--]--></ul>`);
          } else if (section.type === "ordered-list") {
            _push(`<ol class="list-decimal list-inside space-y-3"><!--[-->`);
            ssrRenderList(section.items, (item, i) => {
              _push(`<li class="font-semibold">${ssrInterpolate(item.title)} <p class="font-normal mt-1">${ssrInterpolate(item.text)}</p>`);
              if (item.subItems) {
                _push(`<ul class="list-disc list-inside ml-6 mt-2 space-y-1 font-normal"><!--[-->`);
                ssrRenderList(item.subItems, (subItem, j) => {
                  _push(`<li>${ssrInterpolate(subItem)}</li>`);
                });
                _push(`<!--]--></ul>`);
              } else {
                _push(`<!---->`);
              }
              _push(`</li>`);
            });
            _push(`<!--]--></ol>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div>`);
        });
        _push(`<!--]--></div></div></div></div>`);
      });
      _push(`<!--]--></div>`);
      if (__props.yakuList.length > 0) {
        _push(`<div class="mt-12"><h3 class="text-3xl font-bold text-center mb-8 text-primary-900"> Featured Yaku (Scoring Combinations) </h3>`);
        _push(ssrRenderComponent(YakuCarousel, { "yaku-list": __props.yakuList }, null, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></section>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/RulesSection.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const RulesSection = Object.assign(_sfc_main$3, { __name: "RulesSection" });
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "ExternalLinkIcon",
  __ssrInlineRender: true,
  props: {
    className: { default: "h-3 w-3" }
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<svg${ssrRenderAttrs(mergeProps({
        xmlns: "http://www.w3.org/2000/svg",
        class: __props.className,
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        "aria-hidden": "true"
      }, _attrs))} data-v-a6be3c5d><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" data-v-a6be3c5d></path></svg>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ExternalLinkIcon.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const ExternalLinkIcon = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$2, [["__scopeId", "data-v-a6be3c5d"]]), { __name: "ExternalLinkIcon" });
const projectName = "Hanafuda Koi-Koi";
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "Footer",
  __ssrInlineRender: true,
  setup(__props) {
    const copyrightYear = (/* @__PURE__ */ new Date()).getFullYear();
    const personalInfo = {
      name: "Leo Huang",
      email: "leo102615@gmail.com",
      projectUrl: "https://github.com/ychleo102615/hanahuda"
    };
    const attributions = [
      {
        name: "Card Designs",
        source: "dotty-dev/Hanafuda-Louie-Recolor",
        sourceUrl: "https://github.com/dotty-dev/Hanafuda-Louie-Recolor",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
      }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<footer${ssrRenderAttrs(mergeProps({ class: "bg-primary-900 text-white py-12" }, _attrs))} data-v-4a6255c1><div class="container mx-auto px-4" data-v-4a6255c1><div class="flex flex-col md:flex-row md:justify-between md:items-start gap-8" data-v-4a6255c1><div class="flex-shrink-0" data-v-4a6255c1><p class="text-sm text-gray-300" data-v-4a6255c1> © ${ssrInterpolate(unref(copyrightYear))} ${ssrInterpolate(projectName)}</p><p class="text-xs text-gray-400 mt-2" data-v-4a6255c1> Built with Vue 3, TypeScript, and Tailwind CSS </p></div><div class="flex-grow" data-v-4a6255c1><h3 class="text-sm font-semibold mb-3 text-gray-200" data-v-4a6255c1> Attributions </h3><ul class="space-y-3" data-v-4a6255c1><!--[-->`);
      ssrRenderList(attributions, (attr, index2) => {
        _push(`<li class="text-sm text-gray-300" data-v-4a6255c1><div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2" data-v-4a6255c1><span class="font-medium text-white" data-v-4a6255c1>${ssrInterpolate(attr.name)}</span><span class="hidden sm:inline text-gray-500" data-v-4a6255c1>•</span><a${ssrRenderAttr("href", attr.sourceUrl)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-gray-300 hover:text-white transition-colors"${ssrRenderAttr("aria-label", `View ${attr.name} source: ${attr.source}`)} data-v-4a6255c1><span data-v-4a6255c1>${ssrInterpolate(attr.source)}</span>`);
        _push(ssrRenderComponent(ExternalLinkIcon, null, null, _parent));
        _push(`</a><span class="hidden sm:inline text-gray-500" data-v-4a6255c1>•</span><a${ssrRenderAttr("href", attr.licenseUrl)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-accent-pink hover:text-accent-red transition-colors underline"${ssrRenderAttr("aria-label", `${attr.name} license: ${attr.license}`)} data-v-4a6255c1><span data-v-4a6255c1>${ssrInterpolate(attr.license)}</span>`);
        _push(ssrRenderComponent(ExternalLinkIcon, null, null, _parent));
        _push(`</a></div></li>`);
      });
      _push(`<!--]--></ul></div><div class="flex-shrink-0" data-v-4a6255c1><h3 class="text-sm font-semibold mb-3 text-gray-200" data-v-4a6255c1> Contact </h3><div class="space-y-2 text-sm text-gray-300" data-v-4a6255c1><p class="font-medium text-white" data-v-4a6255c1>${ssrInterpolate(personalInfo.name)}</p><p data-v-4a6255c1><a${ssrRenderAttr("href", `mailto:${personalInfo.email}`)} class="text-gray-300 hover:text-white transition-colors" data-v-4a6255c1>${ssrInterpolate(personalInfo.email)}</a></p><p data-v-4a6255c1><a${ssrRenderAttr("href", personalInfo.projectUrl)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-accent-pink hover:text-accent-red transition-colors" data-v-4a6255c1><span data-v-4a6255c1>Project Repository</span>`);
      _push(ssrRenderComponent(ExternalLinkIcon, null, null, _parent));
      _push(`</a></p></div></div></div></div></footer>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/Footer.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const Footer = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-4a6255c1"]]), { __name: "Footer" });
const categories = [{ "id": "game-objective", "title": "Game Objective", "defaultExpanded": true, "sections": [{ "type": "paragraph", "text": "The goal of Koi-Koi (こいこい) is to form Yaku (役, scoring combinations) by capturing cards from the playing field." }, { "type": "paragraph", "text": "When you form a Yaku, you can choose to:" }, { "type": "list", "items": ["Continue (Koi-Koi): Keep playing to form more Yaku and multiply your score.", "Stop: End the round and claim your current points."] }, { "type": "paragraph", "text": "Be careful! If you choose to continue and your opponent forms a Yaku first, you lose all your points and they double their score." }] }, { "id": "card-deck", "title": "Card Deck", "defaultExpanded": false, "sections": [{ "type": "paragraph", "text": "The Hanafuda deck consists of 48 cards, with 4 cards per month (January to December)." }, { "type": "paragraph", "text": "Each month represents a specific flower or plant:" }, { "type": "list", "items": ["January - Pine", "February - Plum Blossom", "March - Cherry Blossom", "April - Wisteria", "May - Iris", "June - Peony", "July - Bush Clover", "August - Susuki Grass", "September - Chrysanthemum", "October - Maple", "November - Willow", "December - Paulownia"] }] }, { "id": "card-types", "title": "Card Types", "defaultExpanded": false, "sections": [{ "type": "paragraph", "text": "Cards are classified into four types based on their value:" }, { "type": "list", "items": ["Hikari (光札): Bright cards, worth 20 points. There are 5 bright cards in total.", "Tane (タネ札): Animal/object cards, worth 10 points. There are 9 Tane cards.", "Tanzaku (短札): Ribbon cards, worth 5 points. There are 10 Tanzaku cards.", "Kasu (かす札): Plain cards, worth 1 point each. There are 24 Kasu cards."] }] }, { "id": "how-to-play", "title": "How to Play", "defaultExpanded": false, "sections": [{ "type": "ordered-list", "items": [{ "title": "Setup", "text": "Deal 8 cards to each player, place 8 cards face-up on the field." }, { "title": "Turn", "text": "On your turn:", "subItems": ["Play one card from your hand. If it matches the month of a card on the field, capture both cards.", "Draw one card from the deck. If it matches a card on the field, capture both cards."] }, { "title": "Matching", "text": "Cards match if they belong to the same month (same flower/plant)." }, { "title": "Decision", "text": "After forming a Yaku, choose to continue (Koi-Koi) or stop." }, { "title": "Round End", "text": "The round ends when a player stops or all cards are played." }, { "title": "Scoring", "text": "Calculate points based on Yaku formed. If you called Koi-Koi and opponent scores first, you get 0 points and opponent doubles their score." }] }] }, { "id": "scoring-rules", "title": "Scoring Rules", "defaultExpanded": false, "sections": [{ "type": "list", "items": ["When you form a Yaku, you can choose to continue (Koi-Koi) or stop.", "If you choose to continue and your opponent forms a Yaku first, your score becomes 0 and your opponent's score doubles.", "If your total score is 7 or more points, your final score doubles.", "After 12 rounds, the player with the highest total score wins."] }] }];
const rulesDataJson = {
  categories
};
const yakuList = [{ "id": "goko", "name": "Five Brights", "nameJa": "五光", "category": "hikari", "points": 10, "cardIds": ["0111", "0311", "0811", "1111", "1211"], "description": "Collect all 5 bright cards" }, { "id": "shiko", "name": "Four Brights", "nameJa": "四光", "category": "hikari", "points": 8, "cardIds": ["0111", "0311", "0811", "1211"], "description": "Collect 4 bright cards (excluding Rain Man)" }, { "id": "ameshiko", "name": "Rainy Four Brights", "nameJa": "雨四光", "category": "hikari", "points": 7, "cardIds": ["0111", "0311", "0811", "1111"], "description": "Collect 4 bright cards (including Rain Man)" }, { "id": "sanko", "name": "Three Brights", "nameJa": "三光", "category": "hikari", "points": 5, "cardIds": ["0111", "0311", "0811"], "description": "Collect 3 bright cards (excluding Rain Man)" }, { "id": "akatan", "name": "Red Ribbons", "nameJa": "赤短", "category": "tanzaku", "points": 5, "cardIds": ["0131", "0231", "0331"], "description": "Collect all 3 red ribbons with poetry" }, { "id": "aotan", "name": "Blue Ribbons", "nameJa": "青短", "category": "tanzaku", "points": 5, "cardIds": ["0631", "0931", "1031"], "description": "Collect all 3 blue ribbons" }, { "id": "tanzaku", "name": "Ribbons", "nameJa": "短冊", "category": "tanzaku", "points": 1, "minimumCards": 5, "description": "Collect 5 or more ribbon cards (1 point per card over 5)" }, { "id": "inoshikacho", "name": "Boar, Deer, Butterfly", "nameJa": "猪鹿蝶", "category": "tane", "points": 5, "cardIds": ["0721", "1021", "0621"], "description": "Collect the Boar, Deer, and Butterfly cards" }, { "id": "hanamizake", "name": "Cherry Blossom Viewing", "nameJa": "花見酒", "category": "tane", "points": 3, "cardIds": ["0311", "0921"], "description": "Collect the Cherry Blossom curtain and Sake cup" }, { "id": "tsukimizake", "name": "Moon Viewing", "nameJa": "月見酒", "category": "tane", "points": 3, "cardIds": ["0811", "0921"], "description": "Collect the Moon and Sake cup" }, { "id": "tane", "name": "Animals", "nameJa": "種", "category": "tane", "points": 1, "minimumCards": 5, "description": "Collect 5 or more animal/object cards (1 point per card over 5)" }, { "id": "kasu", "name": "Plain Cards", "nameJa": "かす", "category": "kasu", "points": 1, "minimumCards": 10, "description": "Collect 10 or more plain cards (1 point per card over 10)" }];
const yakuDataJson = {
  yakuList
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const navigationLinks = [
      { label: "Rules", target: "#rules", isCta: false },
      { label: "About", target: "#about", isCta: false },
      { label: "Start Game", target: "/lobby", isCta: true }
    ];
    const heroData = {
      title: "Hanafuda Koi-Koi",
      subtitle: "Experience the classic Japanese card game online",
      ctaText: "Start Playing",
      ctaTarget: "/lobby"
    };
    const rulesCategories = ref(rulesDataJson.categories);
    const yakuList2 = ref(yakuDataJson.yakuList);
    const rulesSectionRef = ref(null);
    const handleRulesClick = () => {
      if (rulesSectionRef.value) {
        rulesSectionRef.value.expandAll();
      }
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-screen" }, _attrs))} data-v-6b1c2723>`);
      _push(ssrRenderComponent(NavigationBar, {
        logo: "Hanafuda Koi-Koi",
        links: navigationLinks,
        transparent: false,
        onRulesClick: handleRulesClick
      }, null, _parent));
      _push(`<main data-v-6b1c2723><section id="hero" class="relative min-h-screen" data-v-6b1c2723>`);
      _push(ssrRenderComponent(HeroSection, {
        title: heroData.title,
        subtitle: heroData.subtitle,
        "cta-text": heroData.ctaText,
        "cta-target": heroData.ctaTarget
      }, null, _parent));
      _push(`</section><section id="rules" class="relative" data-v-6b1c2723>`);
      _push(ssrRenderComponent(RulesSection, {
        ref_key: "rulesSectionRef",
        ref: rulesSectionRef,
        categories: rulesCategories.value,
        "yaku-list": yakuList2.value
      }, null, _parent));
      _push(`</section><section id="about" class="relative min-h-[50vh] bg-primary-50 flex items-center justify-center" data-v-6b1c2723><div class="text-center" data-v-6b1c2723><h2 class="text-3xl font-bold text-primary-900 mb-4" data-v-6b1c2723>About Hanafuda Koi-Koi</h2><p class="text-lg text-primary-700" data-v-6b1c2723> This is a demonstration project developed by Leo Huang. </p></div></section></main>`);
      _push(ssrRenderComponent(Footer, null, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6b1c2723"]]);

export { index as default };
//# sourceMappingURL=index-CDwphgWJ.mjs.map
