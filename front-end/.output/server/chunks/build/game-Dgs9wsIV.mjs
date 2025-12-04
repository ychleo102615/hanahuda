import { defineComponent, computed, mergeProps, unref, withCtx, createVNode, toDisplayString, createBlock, openBlock, ref, watch, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent, ssrInterpolate, ssrRenderClass, ssrRenderList, ssrRenderAttr, ssrRenderTeleport } from 'vue/server-renderer';
import { storeToRefs, defineStore } from 'pinia';
import { u as useGameStateStore, a as useUIStateStore, T as TopInfoBar, A as ActionPanel, b as useMatchmakingStateStore, c as useDependency, Z as Z_INDEX, d as TOKENS, e as useMotion } from './matchmakingState-CqgFMnU2.mjs';
import { S as SvgIcon, C as CARD_BACK_ICON_NAME, g as getCardIconName } from './cardMapping-CW6u8nZX.mjs';
import { _ as _export_sfc } from './server.mjs';
import { useRouter } from 'vue-router';
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

class ZoneRegistry {
  zones = /* @__PURE__ */ new Map();
  /**
   * 註冊區域
   *
   * @param zoneName - 區域名稱
   * @param element - 區域 DOM 元素
   */
  register(zoneName, element) {
    if (this.zones.has(zoneName)) {
      this.unregister(zoneName);
    }
    const rect = element.getBoundingClientRect();
    const position = {
      zoneName,
      rect
    };
    const observer = new ResizeObserver(() => {
      this.updatePosition(zoneName, element);
    });
    observer.observe(element);
    this.zones.set(zoneName, {
      element,
      position,
      observer
    });
  }
  /**
   * 取消註冊區域
   *
   * @param zoneName - 區域名稱
   */
  unregister(zoneName) {
    const entry = this.zones.get(zoneName);
    if (!entry) {
      return;
    }
    entry.observer.disconnect();
    this.zones.delete(zoneName);
  }
  /**
   * 取得區域位置
   *
   * @param zoneName - 區域名稱
   * @returns 區域位置資訊，若未註冊則返回 null
   */
  getPosition(zoneName) {
    const entry = this.zones.get(zoneName);
    if (!entry) {
      return null;
    }
    return entry.position;
  }
  /**
   * 計算卡片在區域中的位置
   *
   * @param zoneName - 區域名稱
   * @param cardIndex - 卡片索引（從 0 開始）
   * @returns 卡片的螢幕座標
   */
  getCardPosition(zoneName, cardIndex) {
    const entry = this.zones.get(zoneName);
    if (!entry) {
      return { x: 0, y: 0 };
    }
    const { rect } = entry.position;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top
    };
  }
  /**
   * 取得所有已註冊的區域名稱
   *
   * @returns 區域名稱陣列
   */
  getAllZones() {
    return Array.from(this.zones.keys());
  }
  /**
   * 在指定 zone 內查找卡片元素
   *
   * @param zoneName - Zone 名稱
   * @param cardId - 卡片 ID
   * @returns 卡片 DOM 元素，找不到或 zone 未註冊時返回 null
   */
  findCardInZone(zoneName, cardId) {
    const entry = this.zones.get(zoneName);
    if (!entry) {
      return null;
    }
    return entry.element.querySelector(`[data-card-id="${cardId}"]`);
  }
  /**
   * 查找卡片元素，支援優先 zone 和 fallback
   *
   * @param cardId - 卡片 ID
   * @param preferredZone - 優先查找的 zone（可選）
   * @returns 卡片 DOM 元素或 null
   */
  findCard(cardId, preferredZone) {
    if (preferredZone) {
      const element = this.findCardInZone(preferredZone, cardId);
      if (element) return element;
    }
    for (const zoneName of this.zones.keys()) {
      const element = this.findCardInZone(zoneName, cardId);
      if (element) return element;
    }
    return null;
  }
  /**
   * 清理所有註冊和 observers
   */
  dispose() {
    for (const entry of this.zones.values()) {
      entry.observer.disconnect();
    }
    this.zones.clear();
  }
  /**
   * 更新區域位置
   *
   * @param zoneName - 區域名稱
   * @param element - 區域 DOM 元素
   */
  updatePosition(zoneName, element) {
    const entry = this.zones.get(zoneName);
    if (!entry) {
      return;
    }
    const rect = element.getBoundingClientRect();
    entry.position = {
      zoneName,
      rect
    };
  }
}
const zoneRegistry = new ZoneRegistry();
function useZoneRegistration(zoneName, options = {}) {
  const { autoRegister = true } = options;
  const elementRef = ref(null);
  const isRegistered = ref(false);
  const register = () => {
    if (elementRef.value && !isRegistered.value) {
      zoneRegistry.register(zoneName, elementRef.value);
      isRegistered.value = true;
    }
  };
  const unregister = () => {
    if (isRegistered.value) {
      zoneRegistry.unregister(zoneName);
      isRegistered.value = false;
    }
  };
  return {
    elementRef,
    register,
    unregister,
    isRegistered
  };
}
const useAnimationLayerStore = defineStore("animationLayer", () => {
  const animatingCards = ref([]);
  const animatingGroups = ref([]);
  const hiddenCardIds = ref(/* @__PURE__ */ new Set());
  function addCard(card) {
    animatingCards.value.push(card);
  }
  function removeCard(cardId) {
    animatingCards.value = animatingCards.value.filter((c) => c.cardId !== cardId);
  }
  function addGroup(group) {
    animatingGroups.value.push(group);
  }
  function removeGroup(groupId) {
    animatingGroups.value = animatingGroups.value.filter((g) => g.groupId !== groupId);
  }
  function clear() {
    animatingCards.value = [];
    animatingGroups.value = [];
    hiddenCardIds.value.clear();
  }
  function hideCards(cardIds) {
    cardIds.forEach((id) => hiddenCardIds.value.add(id));
  }
  function showCard(cardId) {
    hiddenCardIds.value.delete(cardId);
  }
  function isCardHidden(cardId) {
    return hiddenCardIds.value.has(cardId);
  }
  return {
    // State
    animatingCards,
    animatingGroups,
    hiddenCardIds,
    // Actions - 卡片管理
    addCard,
    removeCard,
    // Actions - 卡片組管理
    addGroup,
    removeGroup,
    // Actions - 通用
    clear,
    hideCards,
    showCard,
    isCardHidden
  };
});
const _sfc_main$e = /* @__PURE__ */ defineComponent({
  __name: "CardComponent",
  __ssrInlineRender: true,
  props: {
    cardId: {},
    isSelectable: { type: Boolean, default: false },
    isSelected: { type: Boolean, default: false },
    isHighlighted: { type: Boolean, default: false },
    isFaceDown: { type: Boolean, default: false },
    size: { default: "md" },
    isAnimationClone: { type: Boolean, default: false },
    isPreviewHighlighted: { type: Boolean, default: false },
    isSingleMatchHighlight: { type: Boolean, default: false },
    isMultipleMatchHighlight: { type: Boolean, default: false },
    enableShake: { type: Boolean, default: false }
  },
  emits: ["click"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const animationStore = useAnimationLayerStore();
    const isHidden = computed(
      () => !props.isAnimationClone && animationStore.isCardHidden(props.cardId)
    );
    const sizeClasses = computed(() => {
      if (props.isAnimationClone) {
        return "h-full w-full";
      }
      switch (props.size) {
        case "sm":
          return "h-18 w-auto";
        case "lg":
          return "h-32 w-auto";
        default:
          return "h-24 w-auto";
      }
    });
    const containerClasses = computed(() => {
      return [
        "inline-flex items-center justify-center rounded-md transition-shadow duration-200",
        {
          // 可選狀態 - 只保留 cursor 和 shadow，scale 由 motion 處理
          "cursor-pointer hover:drop-shadow-lg": props.isSelectable,
          "cursor-default": !props.isSelectable,
          // 選中狀態（優先級最高）- 金色框
          "ring-2 ring-yellow-400 ring-offset-2 drop-shadow-lg": props.isSelected,
          // 多重配對高亮（優先級次高）- 橙色框 + 閃爍
          "ring-2 ring-orange-400 ring-offset-1 drop-shadow-md animate-pulse-strong": props.isMultipleMatchHighlight && !props.isSelected,
          // 單一配對高亮（優先級中）- 綠色框 + 輕微閃爍
          "ring-2 ring-green-400 ring-offset-1 drop-shadow-md animate-pulse-soft": props.isSingleMatchHighlight && !props.isMultipleMatchHighlight && !props.isSelected,
          // 原配對高亮狀態（保留，用於其他情境）- 綠色框，不閃爍
          "ring-2 ring-green-400 ring-offset-1 drop-shadow-md": props.isHighlighted && !props.isSingleMatchHighlight && !props.isMultipleMatchHighlight && !props.isSelected,
          // 預覽高亮狀態（最低優先）- 紫色框
          "ring-2 ring-purple-400 ring-offset-1 drop-shadow-sm": props.isPreviewHighlighted && !props.isHighlighted && !props.isSingleMatchHighlight && !props.isMultipleMatchHighlight && !props.isSelected
        }
      ];
    });
    const cardIconName = computed(() => {
      if (props.isFaceDown) {
        return CARD_BACK_ICON_NAME;
      }
      return getCardIconName(props.cardId);
    });
    const cardRef = ref(null);
    const { apply } = useMotion(cardRef, {
      initial: {
        scale: 1,
        y: 0
      },
      hovered: {
        scale: 1.05,
        y: -4,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      },
      selected: {
        scale: 1.08,
        y: -6,
        transition: {
          type: "spring",
          stiffness: 500,
          damping: 20
        }
      },
      rest: {
        scale: 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 30
        }
      }
    });
    watch(() => props.isSelected, (selected) => {
      if (selected) {
        apply("selected");
      } else {
        apply("rest");
      }
    });
    watch(() => props.enableShake, (shouldShake) => {
      if (shouldShake && cardRef.value) {
        cardRef.value.classList.add("shake");
        setTimeout(() => {
          cardRef.value?.classList.remove("shake");
        }, 500);
      }
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "cardRef",
        ref: cardRef,
        class: [containerClasses.value, { "invisible": isHidden.value }],
        "data-card-id": __props.isAnimationClone ? void 0 : __props.cardId
      }, _attrs))} data-v-f01fc33a>`);
      _push(ssrRenderComponent(SvgIcon, {
        name: cardIconName.value,
        "class-name": sizeClasses.value,
        "aria-label": `Card ${__props.cardId}`
      }, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup$e = _sfc_main$e.setup;
_sfc_main$e.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/CardComponent.vue");
  return _sfc_setup$e ? _sfc_setup$e(props, ctx) : void 0;
};
const CardComponent = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["__scopeId", "data-v-f01fc33a"]]);
const _sfc_main$d = /* @__PURE__ */ defineComponent({
  __name: "FieldZone",
  __ssrInlineRender: true,
  setup(__props) {
    const gameState = useGameStateStore();
    const uiState = useUIStateStore();
    const { elementRef: fieldRef } = useZoneRegistration("field");
    const { fieldCards } = storeToRefs(gameState);
    const {
      previewHighlightedTargets,
      fieldCardSelectionMode,
      fieldCardSelectableTargets,
      fieldCardHighlightType,
      handCardConfirmationMode,
      matchableFieldCards,
      matchCount
    } = storeToRefs(uiState);
    const selectMatchTargetPort = useDependency(TOKENS.SelectMatchTargetPort);
    const playHandCardPort = useDependency(TOKENS.PlayHandCardPort);
    function isPreviewHighlighted(cardId) {
      if (handCardConfirmationMode.value || fieldCardSelectionMode.value) {
        return false;
      }
      return previewHighlightedTargets.value.includes(cardId);
    }
    function isSingleMatchHighlight(cardId) {
      if (fieldCardSelectionMode.value && fieldCardHighlightType.value === "single") {
        return fieldCardSelectableTargets.value.includes(cardId);
      }
      if (handCardConfirmationMode.value && matchCount.value === 1) {
        return matchableFieldCards.value.includes(cardId);
      }
      return false;
    }
    function isMultipleMatchHighlight(cardId) {
      if (fieldCardSelectionMode.value && fieldCardHighlightType.value === "multiple") {
        return fieldCardSelectableTargets.value.includes(cardId);
      }
      if (handCardConfirmationMode.value && matchCount.value > 1) {
        return matchableFieldCards.value.includes(cardId);
      }
      return false;
    }
    function handleCardClick(cardId) {
      if (fieldCardSelectionMode.value && fieldCardSelectableTargets.value.includes(cardId)) {
        const drawnCard = gameState.drawnCard;
        const possibleTargets = gameState.possibleTargetCardIds;
        if (!drawnCard || possibleTargets.length === 0) {
          console.error("[FieldZone] Missing drawnCard or possibleTargets for AWAITING_SELECTION");
          return;
        }
        selectMatchTargetPort.execute({
          sourceCardId: drawnCard,
          targetCardId: cardId,
          possibleTargets
        });
        uiState.exitFieldCardSelectionMode();
        return;
      }
      if (handCardConfirmationMode.value && matchableFieldCards.value.includes(cardId)) {
        if (!uiState.handCardAwaitingConfirmation) {
          console.warn("[FieldZone] No handCard awaiting confirmation");
          return;
        }
        const selectedHandCard = uiState.handCardAwaitingConfirmation;
        console.info("[FieldZone] 手牌確認模式 - 執行配對:", { selectedHandCard, fieldCard: cardId });
        playHandCardPort.execute({
          cardId: selectedHandCard,
          handCards: gameState.myHandCards,
          fieldCards: gameState.fieldCards,
          targetCardId: cardId
        });
        uiState.exitHandCardConfirmationMode();
        return;
      }
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "fieldRef",
        ref: fieldRef,
        class: "h-full flex items-center justify-center p-4"
      }, _attrs))} data-v-a621d96c><div${ssrRenderAttrs({
        name: "field-cards",
        class: "grid grid-flow-col grid-rows-2 gap-4"
      })} data-v-a621d96c>`);
      ssrRenderList(unref(fieldCards), (cardId) => {
        _push(ssrRenderComponent(CardComponent, {
          key: cardId,
          "card-id": cardId,
          "is-selectable": unref(fieldCardSelectionMode) && unref(fieldCardSelectableTargets).includes(cardId) || unref(handCardConfirmationMode) && unref(matchableFieldCards).includes(cardId),
          "is-preview-highlighted": isPreviewHighlighted(cardId),
          "is-single-match-highlight": isSingleMatchHighlight(cardId),
          "is-multiple-match-highlight": isMultipleMatchHighlight(cardId),
          size: "md",
          onClick: handleCardClick
        }, null, _parent));
      });
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$d = _sfc_main$d.setup;
_sfc_main$d.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/FieldZone.vue");
  return _sfc_setup$d ? _sfc_setup$d(props, ctx) : void 0;
};
const FieldZone = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["__scopeId", "data-v-a621d96c"]]);
const MATSU_HIKARI = Object.freeze({
  card_id: "0111",
  month: 1,
  type: "BRIGHT",
  display_name: "松鶴"
});
const MATSU_AKATAN = Object.freeze({
  card_id: "0131",
  month: 1,
  type: "RIBBON",
  display_name: "松赤短"
});
const MATSU_KASU_1 = Object.freeze({
  card_id: "0141",
  month: 1,
  type: "PLAIN",
  display_name: "松かす1"
});
const MATSU_KASU_2 = Object.freeze({
  card_id: "0142",
  month: 1,
  type: "PLAIN",
  display_name: "松かす2"
});
const UME_UGUISU = Object.freeze({
  card_id: "0221",
  month: 2,
  type: "ANIMAL",
  display_name: "梅鶯"
});
const UME_AKATAN = Object.freeze({
  card_id: "0231",
  month: 2,
  type: "RIBBON",
  display_name: "梅赤短"
});
const UME_KASU_1 = Object.freeze({
  card_id: "0241",
  month: 2,
  type: "PLAIN",
  display_name: "梅かす1"
});
const UME_KASU_2 = Object.freeze({
  card_id: "0242",
  month: 2,
  type: "PLAIN",
  display_name: "梅かす2"
});
const SAKURA_HIKARI = Object.freeze({
  card_id: "0311",
  month: 3,
  type: "BRIGHT",
  display_name: "櫻幕"
});
const SAKURA_AKATAN = Object.freeze({
  card_id: "0331",
  month: 3,
  type: "RIBBON",
  display_name: "櫻赤短"
});
const SAKURA_KASU_1 = Object.freeze({
  card_id: "0341",
  month: 3,
  type: "PLAIN",
  display_name: "櫻かす1"
});
const SAKURA_KASU_2 = Object.freeze({
  card_id: "0342",
  month: 3,
  type: "PLAIN",
  display_name: "櫻かす2"
});
const FUJI_HOTOTOGISU = Object.freeze({
  card_id: "0421",
  month: 4,
  type: "ANIMAL",
  display_name: "藤不如歸"
});
const FUJI_TAN = Object.freeze({
  card_id: "0431",
  month: 4,
  type: "RIBBON",
  display_name: "藤短冊"
});
const FUJI_KASU_1 = Object.freeze({
  card_id: "0441",
  month: 4,
  type: "PLAIN",
  display_name: "藤かす1"
});
const FUJI_KASU_2 = Object.freeze({
  card_id: "0442",
  month: 4,
  type: "PLAIN",
  display_name: "藤かす2"
});
const AYAME_KAKITSUBATA = Object.freeze({
  card_id: "0521",
  month: 5,
  type: "ANIMAL",
  display_name: "菖蒲燕子花"
});
const AYAME_TAN = Object.freeze({
  card_id: "0531",
  month: 5,
  type: "RIBBON",
  display_name: "菖蒲短冊"
});
const AYAME_KASU_1 = Object.freeze({
  card_id: "0541",
  month: 5,
  type: "PLAIN",
  display_name: "菖蒲かす1"
});
const AYAME_KASU_2 = Object.freeze({
  card_id: "0542",
  month: 5,
  type: "PLAIN",
  display_name: "菖蒲かす2"
});
const BOTAN_CHOU = Object.freeze({
  card_id: "0621",
  month: 6,
  type: "ANIMAL",
  display_name: "牡丹蝶"
});
const BOTAN_AOTAN = Object.freeze({
  card_id: "0631",
  month: 6,
  type: "RIBBON",
  display_name: "牡丹青短"
});
const BOTAN_KASU_1 = Object.freeze({
  card_id: "0641",
  month: 6,
  type: "PLAIN",
  display_name: "牡丹かす1"
});
const BOTAN_KASU_2 = Object.freeze({
  card_id: "0642",
  month: 6,
  type: "PLAIN",
  display_name: "牡丹かす2"
});
const HAGI_INO = Object.freeze({
  card_id: "0721",
  month: 7,
  type: "ANIMAL",
  display_name: "萩豬"
});
const HAGI_TAN = Object.freeze({
  card_id: "0731",
  month: 7,
  type: "RIBBON",
  display_name: "萩短冊"
});
const HAGI_KASU_1 = Object.freeze({
  card_id: "0741",
  month: 7,
  type: "PLAIN",
  display_name: "萩かす1"
});
const HAGI_KASU_2 = Object.freeze({
  card_id: "0742",
  month: 7,
  type: "PLAIN",
  display_name: "萩かす2"
});
const SUSUKI_HIKARI = Object.freeze({
  card_id: "0811",
  month: 8,
  type: "BRIGHT",
  display_name: "芒月"
});
const SUSUKI_KARI = Object.freeze({
  card_id: "0821",
  month: 8,
  type: "ANIMAL",
  display_name: "芒雁"
});
const SUSUKI_KASU_1 = Object.freeze({
  card_id: "0841",
  month: 8,
  type: "PLAIN",
  display_name: "芒かす1"
});
const SUSUKI_KASU_2 = Object.freeze({
  card_id: "0842",
  month: 8,
  type: "PLAIN",
  display_name: "芒かす2"
});
const KIKU_SAKAZUKI = Object.freeze({
  card_id: "0921",
  month: 9,
  type: "ANIMAL",
  display_name: "菊盃"
});
const KIKU_AOTAN = Object.freeze({
  card_id: "0931",
  month: 9,
  type: "RIBBON",
  display_name: "菊青短"
});
const KIKU_KASU_1 = Object.freeze({
  card_id: "0941",
  month: 9,
  type: "PLAIN",
  display_name: "菊かす1"
});
const KIKU_KASU_2 = Object.freeze({
  card_id: "0942",
  month: 9,
  type: "PLAIN",
  display_name: "菊かす2"
});
const MOMIJI_SHIKA = Object.freeze({
  card_id: "1021",
  month: 10,
  type: "ANIMAL",
  display_name: "紅葉鹿"
});
const MOMIJI_AOTAN = Object.freeze({
  card_id: "1031",
  month: 10,
  type: "RIBBON",
  display_name: "紅葉青短"
});
const MOMIJI_KASU_1 = Object.freeze({
  card_id: "1041",
  month: 10,
  type: "PLAIN",
  display_name: "紅葉かす1"
});
const MOMIJI_KASU_2 = Object.freeze({
  card_id: "1042",
  month: 10,
  type: "PLAIN",
  display_name: "紅葉かす2"
});
const YANAGI_HIKARI = Object.freeze({
  card_id: "1111",
  month: 11,
  type: "BRIGHT",
  display_name: "柳小野道風(雨)"
});
const YANAGI_TSUBAME = Object.freeze({
  card_id: "1121",
  month: 11,
  type: "ANIMAL",
  display_name: "柳燕"
});
const YANAGI_TAN = Object.freeze({
  card_id: "1131",
  month: 11,
  type: "RIBBON",
  display_name: "柳短冊"
});
const YANAGI_KASU = Object.freeze({
  card_id: "1141",
  month: 11,
  type: "PLAIN",
  display_name: "柳かす"
});
const KIRI_HIKARI = Object.freeze({
  card_id: "1211",
  month: 12,
  type: "BRIGHT",
  display_name: "桐鳳凰"
});
const KIRI_KASU_1 = Object.freeze({
  card_id: "1241",
  month: 12,
  type: "PLAIN",
  display_name: "桐かす1"
});
const KIRI_KASU_2 = Object.freeze({
  card_id: "1242",
  month: 12,
  type: "PLAIN",
  display_name: "桐かす2"
});
const KIRI_KASU_3 = Object.freeze({
  card_id: "1243",
  month: 12,
  type: "PLAIN",
  display_name: "桐かす3"
});
const ALL_CARDS = Object.freeze([
  // 1月 - 松 (4張)
  MATSU_HIKARI,
  MATSU_AKATAN,
  MATSU_KASU_1,
  MATSU_KASU_2,
  // 2月 - 梅 (4張)
  UME_UGUISU,
  UME_AKATAN,
  UME_KASU_1,
  UME_KASU_2,
  // 3月 - 櫻 (4張)
  SAKURA_HIKARI,
  SAKURA_AKATAN,
  SAKURA_KASU_1,
  SAKURA_KASU_2,
  // 4月 - 藤 (4張)
  FUJI_HOTOTOGISU,
  FUJI_TAN,
  FUJI_KASU_1,
  FUJI_KASU_2,
  // 5月 - 菖蒲 (4張)
  AYAME_KAKITSUBATA,
  AYAME_TAN,
  AYAME_KASU_1,
  AYAME_KASU_2,
  // 6月 - 牡丹 (4張)
  BOTAN_CHOU,
  BOTAN_AOTAN,
  BOTAN_KASU_1,
  BOTAN_KASU_2,
  // 7月 - 萩 (4張)
  HAGI_INO,
  HAGI_TAN,
  HAGI_KASU_1,
  HAGI_KASU_2,
  // 8月 - 芒 (4張)
  SUSUKI_HIKARI,
  SUSUKI_KARI,
  SUSUKI_KASU_1,
  SUSUKI_KASU_2,
  // 9月 - 菊 (4張)
  KIKU_SAKAZUKI,
  KIKU_AOTAN,
  KIKU_KASU_1,
  KIKU_KASU_2,
  // 10月 - 紅葉 (4張)
  MOMIJI_SHIKA,
  MOMIJI_AOTAN,
  MOMIJI_KASU_1,
  MOMIJI_KASU_2,
  // 11月 - 柳 (4張)
  YANAGI_HIKARI,
  YANAGI_TSUBAME,
  YANAGI_TAN,
  YANAGI_KASU,
  // 12月 - 桐 (4張)
  KIRI_HIKARI,
  KIRI_KASU_1,
  KIRI_KASU_2,
  KIRI_KASU_3
]);
function getCardById(cardId) {
  return ALL_CARDS.find((card) => card.card_id === cardId);
}
const _sfc_main$c = /* @__PURE__ */ defineComponent({
  __name: "PlayerHandZone",
  __ssrInlineRender: true,
  emits: ["cardSelect"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const gameState = useGameStateStore();
    const uiState = useUIStateStore();
    const { elementRef: handRef } = useZoneRegistration("player-hand");
    const { myHandCards, isMyTurn, fieldCards } = storeToRefs(gameState);
    const { handCardAwaitingConfirmation } = storeToRefs(uiState);
    const playHandCardPort = useDependency(TOKENS.PlayHandCardPort);
    const domainFacade = useDependency(TOKENS.DomainFacade);
    const animationPort = useDependency(TOKENS.AnimationPort);
    const emit = __emit;
    function handleCardClick(cardId) {
      if (!isMyTurn.value) return;
      if (animationPort.isAnimating()) return;
      if (handCardAwaitingConfirmation.value !== cardId) {
        const handCard2 = getCardById(cardId);
        if (!handCard2) {
          console.warn("[PlayerHandZone] Card not found:", cardId);
          return;
        }
        const fieldCardObjects2 = fieldCards.value.map((id) => getCardById(id)).filter((card) => card !== void 0);
        const matchableCards2 = domainFacade.findMatchableCards(handCard2, fieldCardObjects2);
        const matchableCardIds2 = matchableCards2.map((card) => card.card_id);
        uiState.enterHandCardConfirmationMode(cardId, matchableCardIds2, matchableCardIds2.length);
        emit("cardSelect", cardId);
        return;
      }
      const handCard = getCardById(cardId);
      if (!handCard) {
        console.warn("[PlayerHandZone] Card not found:", cardId);
        return;
      }
      const fieldCardObjects = fieldCards.value.map((id) => getCardById(id)).filter((card) => card !== void 0);
      const matchableCards = domainFacade.findMatchableCards(handCard, fieldCardObjects);
      const matchableCardIds = matchableCards.map((card) => card.card_id);
      if (matchableCardIds.length === 0 || matchableCardIds.length === 1) {
        playHandCardPort.execute({
          cardId,
          handCards: myHandCards.value,
          fieldCards: fieldCards.value
        });
        uiState.exitHandCardConfirmationMode();
      } else {
        console.info("[PlayerHandZone] Multiple matches, please click field card");
      }
    }
    function handleMouseEnter(cardId) {
      if (!isMyTurn.value) return;
      if (animationPort.isAnimating()) return;
      if (handCardAwaitingConfirmation.value === cardId) {
        return;
      }
      const handCard = getCardById(cardId);
      if (!handCard) return;
      const fieldCardObjects = fieldCards.value.map((id) => getCardById(id)).filter((card) => card !== void 0);
      const matchableCards = domainFacade.findMatchableCards(handCard, fieldCardObjects);
      const matchableCardIds = matchableCards.map((card) => card.card_id);
      uiState.setHandCardHoverPreview(cardId, matchableCardIds);
    }
    function handleMouseLeave() {
      uiState.clearHandCardHoverPreview();
    }
    function isSelected(cardId) {
      return handCardAwaitingConfirmation.value === cardId;
    }
    function clearSelection() {
      uiState.exitHandCardConfirmationMode();
    }
    watch(isMyTurn, (newIsMyTurn) => {
      if (!newIsMyTurn && uiState.handCardConfirmationMode) {
        uiState.exitHandCardConfirmationMode();
      }
    });
    const { flowStage, possibleTargetCardIds } = storeToRefs(gameState);
    watch(flowStage, (newStage, oldStage) => {
      if (newStage === "AWAITING_SELECTION" && possibleTargetCardIds.value.length > 0) {
        const sourceCard = possibleTargetCardIds.value[0] ?? "";
        const highlightType = possibleTargetCardIds.value.length === 1 ? "single" : "multiple";
        if (uiState.handCardConfirmationMode) {
          uiState.exitHandCardConfirmationMode();
        }
        uiState.enterFieldCardSelectionMode(
          sourceCard,
          possibleTargetCardIds.value,
          highlightType
        );
        console.info("[PlayerHandZone] 進入場牌選擇模式:", {
          targets: possibleTargetCardIds.value,
          highlightType
        });
      } else if (oldStage === "AWAITING_SELECTION" && newStage !== "AWAITING_SELECTION") {
        uiState.exitFieldCardSelectionMode();
        console.info("[PlayerHandZone] 離開場牌選擇模式");
      }
    });
    __expose({
      clearSelection
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "handRef",
        ref: handRef,
        class: "h-full flex items-center justify-center p-4 overflow-x-auto"
      }, _attrs))} data-v-b5fc7271>`);
      if (unref(myHandCards).length > 0) {
        _push(`<div${ssrRenderAttrs({
          name: "hand-cards",
          class: "flex gap-3"
        })} data-v-b5fc7271>`);
        ssrRenderList(unref(myHandCards), (cardId) => {
          _push(ssrRenderComponent(CardComponent, {
            key: cardId,
            "card-id": cardId,
            "is-selectable": unref(isMyTurn),
            "is-selected": isSelected(cardId),
            size: "lg",
            onClick: handleCardClick,
            onMouseenter: ($event) => handleMouseEnter(cardId),
            onMouseleave: handleMouseLeave
          }, null, _parent));
        });
        _push(`</div>`);
      } else {
        _push(`<div class="text-gray-500 text-sm" data-v-b5fc7271> No cards </div>`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$c = _sfc_main$c.setup;
_sfc_main$c.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/PlayerHandZone.vue");
  return _sfc_setup$c ? _sfc_setup$c(props, ctx) : void 0;
};
const PlayerHandZone = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["__scopeId", "data-v-b5fc7271"]]);
const _sfc_main$b = /* @__PURE__ */ defineComponent({
  __name: "OpponentDepositoryZone",
  __ssrInlineRender: true,
  setup(__props) {
    const gameStateStore = useGameStateStore();
    const { elementRef: depositoryRef } = useZoneRegistration("opponent-depository");
    const cardGroups = computed(() => {
      const grouped = gameStateStore.groupedOpponentDepository;
      return [
        { type: "BRIGHT", label: "光", cards: grouped.BRIGHT },
        { type: "ANIMAL", label: "種", cards: grouped.ANIMAL },
        { type: "RIBBON", label: "短冊", cards: grouped.RIBBON },
        { type: "PLAIN", label: "かす", cards: grouped.PLAIN }
      ];
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "depositoryRef",
        ref: depositoryRef,
        class: "opponent-depository-zone w-full h-full overflow-x-auto"
      }, _attrs))} data-v-bc1bd4e3><div class="flex gap-4 p-2 min-w-min h-full" data-v-bc1bd4e3><!--[-->`);
      ssrRenderList(cardGroups.value, (group) => {
        _push(`<div class="depository-group flex flex-col min-w-[60px]" data-v-bc1bd4e3><div class="text-xs text-gray-400 mb-1 text-center" data-v-bc1bd4e3>${ssrInterpolate(group.label)} `);
        if (group.cards.length > 0) {
          _push(`<span class="text-gray-500" data-v-bc1bd4e3>(${ssrInterpolate(group.cards.length)})</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div><div class="flex gap-1 flex-wrap justify-center flex-1 items-center" data-v-bc1bd4e3><!--[-->`);
        ssrRenderList(group.cards, (cardId) => {
          _push(ssrRenderComponent(CardComponent, {
            key: cardId,
            "card-id": cardId,
            "is-selectable": false,
            "is-selected": false,
            "is-highlighted": false,
            size: "sm",
            class: "shrink-0"
          }, null, _parent));
        });
        _push(`<!--]--></div></div>`);
      });
      _push(`<!--]--></div></div>`);
    };
  }
});
const _sfc_setup$b = _sfc_main$b.setup;
_sfc_main$b.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/OpponentDepositoryZone.vue");
  return _sfc_setup$b ? _sfc_setup$b(props, ctx) : void 0;
};
const OpponentDepositoryZone = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["__scopeId", "data-v-bc1bd4e3"]]);
const _sfc_main$a = /* @__PURE__ */ defineComponent({
  __name: "PlayerDepositoryZone",
  __ssrInlineRender: true,
  setup(__props) {
    const gameStateStore = useGameStateStore();
    const { elementRef: depositoryRef } = useZoneRegistration("player-depository");
    const cardGroups = computed(() => {
      const grouped = gameStateStore.groupedMyDepository;
      return [
        { type: "BRIGHT", label: "光", cards: grouped.BRIGHT },
        { type: "ANIMAL", label: "種", cards: grouped.ANIMAL },
        { type: "RIBBON", label: "短冊", cards: grouped.RIBBON },
        { type: "PLAIN", label: "かす", cards: grouped.PLAIN }
      ];
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "depositoryRef",
        ref: depositoryRef,
        class: "player-depository-zone w-full h-full overflow-x-auto"
      }, _attrs))} data-v-c6b3f960><div class="flex gap-4 p-2 min-w-min h-full" data-v-c6b3f960><!--[-->`);
      ssrRenderList(cardGroups.value, (group) => {
        _push(`<div class="depository-group flex flex-col min-w-[60px]" data-v-c6b3f960><div class="text-xs text-gray-400 mb-1 text-center" data-v-c6b3f960>${ssrInterpolate(group.label)} `);
        if (group.cards.length > 0) {
          _push(`<span class="text-gray-500" data-v-c6b3f960>(${ssrInterpolate(group.cards.length)})</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div><div class="flex gap-1 flex-wrap justify-center flex-1 items-center" data-v-c6b3f960><!--[-->`);
        ssrRenderList(group.cards, (cardId) => {
          _push(ssrRenderComponent(CardComponent, {
            key: cardId,
            "card-id": cardId,
            "is-selectable": false,
            "is-selected": false,
            "is-highlighted": false,
            size: "sm",
            class: "shrink-0"
          }, null, _parent));
        });
        _push(`<!--]--></div></div>`);
      });
      _push(`<!--]--></div></div>`);
    };
  }
});
const _sfc_setup$a = _sfc_main$a.setup;
_sfc_main$a.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/PlayerDepositoryZone.vue");
  return _sfc_setup$a ? _sfc_setup$a(props, ctx) : void 0;
};
const PlayerDepositoryZone = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["__scopeId", "data-v-c6b3f960"]]);
const _sfc_main$9 = /* @__PURE__ */ defineComponent({
  __name: "DeckZone",
  __ssrInlineRender: true,
  setup(__props) {
    const gameState = useGameStateStore();
    const { deckRemaining, visualLayers } = storeToRefs(gameState);
    const { elementRef: deckRef } = useZoneRegistration("deck");
    const layerStyles = computed(() => {
      const layers = [];
      for (let i = 0; i < visualLayers.value; i++) {
        layers.push({
          transform: `translate(0px, ${i * -2}px)`,
          zIndex: i
        });
      }
      return layers;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "deckRef",
        ref: deckRef,
        class: "relative flex flex-col items-center justify-center h-full p-2"
      }, _attrs))}><div class="relative w-16 h-24"><!--[-->`);
      ssrRenderList(layerStyles.value, (style, index) => {
        _push(`<div style="${ssrRenderStyle(style)}"${ssrRenderAttr("data-testid", "deck-layer")} class="absolute inset-0">`);
        _push(ssrRenderComponent(SvgIcon, {
          name: unref(CARD_BACK_ICON_NAME),
          "class-name": "h-24 w-auto",
          "aria-label": "Card back"
        }, null, _parent));
        _push(`</div>`);
      });
      _push(`<!--]--></div><div class="mt-2 text-white text-sm font-medium bg-black/60 px-2 py-0.5 rounded">${ssrInterpolate(unref(deckRemaining))}</div></div>`);
    };
  }
});
const _sfc_setup$9 = _sfc_main$9.setup;
_sfc_main$9.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/DeckZone.vue");
  return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
const _sfc_main$8 = /* @__PURE__ */ defineComponent({
  __name: "DecisionModal",
  __ssrInlineRender: true,
  setup(__props) {
    const uiState = useUIStateStore();
    const gameState = useGameStateStore();
    const { decisionModalVisible, decisionModalData, displayTimeoutRemaining } = storeToRefs(uiState);
    const { myDepository, myKoiKoiMultiplier } = storeToRefs(gameState);
    useDependency(TOKENS.MakeKoiKoiDecisionPort);
    const countdownClass = computed(() => {
      if (displayTimeoutRemaining.value !== null && displayTimeoutRemaining.value <= 5) {
        return "text-red-500";
      }
      return "text-gray-800";
    });
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderTeleport(_push, (_push2) => {
        if (unref(decisionModalVisible) && unref(decisionModalData)) {
          _push2(`<div class="fixed inset-0 flex items-center justify-center bg-black/60" style="${ssrRenderStyle({ zIndex: unref(Z_INDEX).MODAL })}" data-v-49f0f414><div class="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl" data-v-49f0f414><h2 class="mb-4 text-center text-2xl font-bold text-yellow-600" data-v-49f0f414> Yaku Achieved! </h2>`);
          if (unref(displayTimeoutRemaining) !== null) {
            _push2(`<div class="mb-4 text-center" data-v-49f0f414><div class="text-sm text-gray-600 mb-1" data-v-49f0f414>Time Remaining</div><div data-testid="decision-countdown" class="${ssrRenderClass([countdownClass.value, "text-3xl font-bold"])}" data-v-49f0f414>${ssrInterpolate(unref(displayTimeoutRemaining))}</div></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`<div class="mb-6 space-y-2" data-v-49f0f414><!--[-->`);
          ssrRenderList(unref(decisionModalData).currentYaku, (yaku) => {
            _push2(`<div class="flex items-center justify-between rounded bg-yellow-50 px-4 py-2" data-v-49f0f414><span class="font-medium text-gray-800" data-v-49f0f414>${ssrInterpolate(yaku.yaku_type)}</span><span class="text-yellow-700" data-v-49f0f414>${ssrInterpolate(yaku.base_points)} pts</span></div>`);
          });
          _push2(`<!--]--></div><div class="mb-6 rounded bg-gray-50 p-4" data-v-49f0f414><div class="mb-2 flex items-center justify-between" data-v-49f0f414><span class="text-gray-600" data-v-49f0f414>Current Score:</span><span class="text-xl font-bold text-gray-800" data-v-49f0f414>${ssrInterpolate(unref(decisionModalData).currentScore)} pts </span></div>`);
          if (unref(decisionModalData).potentialScore) {
            _push2(`<div class="flex items-center justify-between" data-v-49f0f414><span class="text-gray-600" data-v-49f0f414>Potential Score:</span><span class="text-xl font-bold text-green-600" data-v-49f0f414>${ssrInterpolate(unref(decisionModalData).potentialScore)} pts </span></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div><p class="mb-6 text-center text-sm text-gray-600" data-v-49f0f414> Choose &quot;Koi-Koi&quot; to continue and increase multiplier, but opponent may catch up. <br data-v-49f0f414> Choose &quot;End Round&quot; to get your current score immediately. </p><div class="grid grid-cols-2 gap-4" data-v-49f0f414><button class="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500" data-v-49f0f414> Koi-Koi </button><button class="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500" data-v-49f0f414> End Round </button></div><p class="mt-4 text-center text-xs text-gray-600" data-v-49f0f414> ⚠️ If you choose Koi-Koi and opponent scores first, you lose all points </p></div></div>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
    };
  }
});
const _sfc_setup$8 = _sfc_main$8.setup;
_sfc_main$8.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/DecisionModal.vue");
  return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
const DecisionModal = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["__scopeId", "data-v-49f0f414"]]);
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  __name: "ErrorToast",
  __ssrInlineRender: true,
  setup(__props) {
    const uiStateStore = useUIStateStore();
    let autoCloseTimer = null;
    watch(
      () => uiStateStore.errorMessage,
      (newMessage) => {
        if (autoCloseTimer) {
          clearTimeout(autoCloseTimer);
          autoCloseTimer = null;
        }
        if (newMessage) {
          autoCloseTimer = setTimeout(() => {
            uiStateStore.errorMessage = null;
          }, 5e3);
        }
      }
    );
    return (_ctx, _push, _parent, _attrs) => {
      if (unref(uiStateStore).errorMessage) {
        _push(`<div${ssrRenderAttrs(mergeProps({
          class: "fixed top-4 right-4 z-50 flex items-center gap-3 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md",
          role: "alert",
          "aria-live": "assertive"
        }, _attrs))} data-v-78cccbf4><svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" data-v-78cccbf4><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" data-v-78cccbf4></path></svg><div class="flex-1" data-v-78cccbf4><p class="text-sm font-medium" data-v-78cccbf4>${ssrInterpolate(unref(uiStateStore).errorMessage)}</p></div><button type="button" class="flex-shrink-0 ml-4 text-white hover:text-red-100 transition-colors" aria-label="Close error message" data-v-78cccbf4><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-78cccbf4><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" data-v-78cccbf4></path></svg></button></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$7 = _sfc_main$7.setup;
_sfc_main$7.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/ErrorToast.vue");
  return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
const ErrorToast = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__scopeId", "data-v-78cccbf4"]]);
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "GameFinishedModal",
  __ssrInlineRender: true,
  setup(__props) {
    const uiStateStore = useUIStateStore();
    const gameStateStore = useGameStateStore();
    useRouter();
    function getPlayerName(playerId) {
      if (playerId === gameStateStore.localPlayerId) {
        return "You";
      } else if (playerId === gameStateStore.opponentPlayerId) {
        return "Opponent";
      }
      return playerId;
    }
    return (_ctx, _push, _parent, _attrs) => {
      if (unref(uiStateStore).gameFinishedModalVisible && unref(uiStateStore).gameFinishedModalData) {
        _push(`<div${ssrRenderAttrs(mergeProps({
          class: "fixed inset-0 flex items-center justify-center bg-black/60",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "game-finished-title",
          style: { zIndex: unref(Z_INDEX).MODAL }
        }, _attrs))} data-v-1ff88b3c><div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all" data-v-1ff88b3c><div class="${ssrRenderClass([
          "px-6 py-5 text-white",
          unref(uiStateStore).gameFinishedModalData.isPlayerWinner ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-blue-500 to-blue-600"
        ])}" data-v-1ff88b3c><h2 id="game-finished-title" class="text-2xl font-bold text-center" data-v-1ff88b3c>${ssrInterpolate(unref(uiStateStore).gameFinishedModalData.isPlayerWinner ? "🎉 Victory!" : "Game Over")}</h2></div><div class="px-6 py-6 space-y-4" data-v-1ff88b3c><p class="text-center text-lg font-medium text-gray-800" data-v-1ff88b3c>${ssrInterpolate(unref(uiStateStore).gameFinishedModalData.isPlayerWinner ? "Congratulations! You won the game!" : `Player ${getPlayerName(unref(uiStateStore).gameFinishedModalData.winnerId)} won the game.`)}</p><div class="bg-gray-50 rounded-lg p-4 space-y-2" data-v-1ff88b3c><h3 class="text-sm font-semibold text-gray-700 mb-3" data-v-1ff88b3c> Final Scores </h3><!--[-->`);
        ssrRenderList(unref(uiStateStore).gameFinishedModalData.finalScores, (score) => {
          _push(`<div class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0" data-v-1ff88b3c><span class="text-gray-700 font-medium" data-v-1ff88b3c>${ssrInterpolate(getPlayerName(score.player_id))} `);
          if (score.player_id === unref(uiStateStore).gameFinishedModalData.winnerId) {
            _push(`<span class="ml-2 text-xs text-green-600 font-bold" data-v-1ff88b3c> 👑 Winner </span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</span><span class="${ssrRenderClass([
            "text-xl font-bold",
            score.player_id === unref(uiStateStore).gameFinishedModalData.winnerId ? "text-green-600" : "text-gray-600"
          ])}" data-v-1ff88b3c>${ssrInterpolate(score.score)}</span></div>`);
        });
        _push(`<!--]--></div></div><div class="px-6 py-4 bg-gray-50 flex gap-3 justify-end" data-v-1ff88b3c><button type="button" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium" data-v-1ff88b3c> Close </button><button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium" data-v-1ff88b3c> New Game </button></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/GameFinishedModal.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const GameFinishedModal = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["__scopeId", "data-v-1ff88b3c"]]);
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "RoundEndModal",
  __ssrInlineRender: true,
  setup(__props) {
    const uiState = useUIStateStore();
    const gameState = useGameStateStore();
    const {
      displayTimeoutRemaining,
      roundDrawnModalVisible,
      roundScoredModalVisible,
      roundEndedInstantlyModalVisible,
      roundScoredModalData,
      roundEndedInstantlyModalData
    } = storeToRefs(uiState);
    const panelType = computed(() => {
      if (roundDrawnModalVisible.value) return "roundDrawn";
      if (roundScoredModalVisible.value) return "roundScored";
      if (roundEndedInstantlyModalVisible.value) return "roundEndedInstantly";
      return null;
    });
    const shouldShowPanel = computed(() => {
      return panelType.value !== null && displayTimeoutRemaining.value !== null;
    });
    const displayCountdown = computed(() => {
      return displayTimeoutRemaining.value ?? 0;
    });
    const headerClass = computed(() => {
      switch (panelType.value) {
        case "roundScored":
          return "bg-gradient-to-r from-yellow-500 to-yellow-600";
        case "roundEndedInstantly":
          return "bg-gradient-to-r from-blue-500 to-blue-600";
        case "roundDrawn":
          return "bg-gradient-to-r from-gray-500 to-gray-600";
        default:
          return "bg-gradient-to-r from-gray-500 to-gray-600";
      }
    });
    const headerTitle = computed(() => {
      switch (panelType.value) {
        case "roundScored":
          return "Round Complete";
        case "roundEndedInstantly":
          return "Round Ended";
        case "roundDrawn":
          return "Round Draw";
        default:
          return "Round End";
      }
    });
    const countdownWarningClass = computed(() => {
      const remaining = displayTimeoutRemaining.value ?? 0;
      return remaining < 5 ? "text-red-500" : "text-gray-800";
    });
    function getYakuName(yakuType) {
      const yakuNames = {
        INOU_SHIKO: "Boar-Deer-Butterfly",
        KASU: "Plain Cards",
        TANZAKU: "Ribbons",
        TANE: "Animals",
        AKATAN: "Red Ribbons",
        AOTAN: "Blue Ribbons",
        SANKO: "Three Brights",
        SHIKOU: "Four Brights",
        GOKOU: "Five Brights",
        TSUKIMI_ZAKE: "Moon Viewing",
        HANAMI_ZAKE: "Flower Viewing"
      };
      return yakuNames[yakuType] || yakuType;
    }
    function getRoundEndReasonText(reason) {
      const reasonTexts = {
        TESHI: "Hand Yaku (Teshi)",
        FIELD_KUTTSUKI: "Field Four-of-a-Kind",
        NO_YAKU: "No Yaku Formed"
      };
      return reasonTexts[reason] || reason;
    }
    function getPlayerName(playerId) {
      const localPlayerId = gameState.getLocalPlayerId();
      return playerId === localPlayerId ? "You" : "Opponent";
    }
    return (_ctx, _push, _parent, _attrs) => {
      if (shouldShowPanel.value) {
        _push(`<div${ssrRenderAttrs(mergeProps({
          class: "fixed inset-0 flex items-center justify-center bg-black/60",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "round-end-title",
          style: { zIndex: unref(Z_INDEX).MODAL }
        }, _attrs))} data-v-65df56ec><div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all" data-v-65df56ec><div class="${ssrRenderClass([
          "px-6 py-5 text-white",
          headerClass.value
        ])}" data-v-65df56ec><h2 id="round-end-title" class="text-2xl font-bold text-center" data-v-65df56ec>${ssrInterpolate(headerTitle.value)}</h2></div><div class="px-6 py-6 space-y-4" data-v-65df56ec>`);
        if (panelType.value === "roundDrawn") {
          _push(`<div class="text-center" data-v-65df56ec><p class="text-lg font-medium text-gray-800 mb-4" data-v-65df56ec> 引き分け (Draw) </p><div class="bg-gray-50 rounded-lg p-4 space-y-2" data-v-65df56ec><h3 class="text-sm font-semibold text-gray-700 mb-3" data-v-65df56ec> Current Scores </h3><!--[-->`);
          ssrRenderList(unref(uiState).roundDrawnModalScores, (score) => {
            _push(`<div class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0" data-v-65df56ec><span class="text-gray-700 font-medium" data-v-65df56ec>${ssrInterpolate(getPlayerName(score.player_id))}</span><span class="text-xl font-bold text-gray-600" data-v-65df56ec>${ssrInterpolate(score.score)}</span></div>`);
          });
          _push(`<!--]--></div></div>`);
        } else if (panelType.value === "roundScored" && unref(roundScoredModalData)) {
          _push(`<div class="text-center" data-v-65df56ec><p class="text-lg font-medium text-gray-800 mb-4" data-v-65df56ec>${ssrInterpolate(getPlayerName(unref(roundScoredModalData).winnerId))} won this round! </p><div class="bg-yellow-50 rounded-lg p-4 mb-4" data-v-65df56ec><h3 class="text-sm font-semibold text-yellow-800 mb-3" data-v-65df56ec>Yaku Achieved</h3><div class="space-y-2" data-v-65df56ec><!--[-->`);
          ssrRenderList(unref(roundScoredModalData).yakuList, (yaku) => {
            _push(`<div class="flex items-center justify-between py-2 border-b border-yellow-200 last:border-0" data-v-65df56ec><span class="text-gray-700 font-medium" data-v-65df56ec>${ssrInterpolate(getYakuName(yaku.yaku_type))}</span><span class="text-lg font-bold text-yellow-700" data-v-65df56ec>${ssrInterpolate(yaku.base_points)} pts</span></div>`);
          });
          _push(`<!--]--></div></div><div class="bg-gray-50 rounded-lg p-4 space-y-2" data-v-65df56ec><div class="flex items-center justify-between py-1" data-v-65df56ec><span class="text-sm text-gray-600" data-v-65df56ec>Base Score:</span><span class="text-lg font-semibold text-gray-700" data-v-65df56ec>${ssrInterpolate(unref(roundScoredModalData).baseScore)}</span></div><div class="flex items-center justify-between py-1" data-v-65df56ec><span class="text-sm text-gray-600" data-v-65df56ec>Multiplier:</span><span class="text-lg font-semibold text-gray-700" data-v-65df56ec>×${ssrInterpolate(unref(roundScoredModalData).multipliers.player_multipliers[unref(roundScoredModalData).winnerId])}</span></div><div class="flex items-center justify-between py-2 border-t-2 border-gray-300" data-v-65df56ec><span class="text-base font-bold text-gray-800" data-v-65df56ec>Final Score:</span><span class="text-2xl font-bold text-yellow-600" data-v-65df56ec>${ssrInterpolate(unref(roundScoredModalData).finalScore)}</span></div></div><div class="bg-gray-50 rounded-lg p-4 mt-4" data-v-65df56ec><h3 class="text-sm font-semibold text-gray-700 mb-3" data-v-65df56ec>Total Scores</h3><!--[-->`);
          ssrRenderList(unref(roundScoredModalData).updatedTotalScores, (score) => {
            _push(`<div class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0" data-v-65df56ec><span class="text-gray-700 font-medium" data-v-65df56ec>${ssrInterpolate(getPlayerName(score.player_id))}</span><span class="text-xl font-bold text-gray-600" data-v-65df56ec>${ssrInterpolate(score.score)}</span></div>`);
          });
          _push(`<!--]--></div></div>`);
        } else if (panelType.value === "roundEndedInstantly" && unref(roundEndedInstantlyModalData)) {
          _push(`<div class="text-center" data-v-65df56ec><p class="text-lg font-medium text-gray-800 mb-4" data-v-65df56ec>${ssrInterpolate(getRoundEndReasonText(unref(roundEndedInstantlyModalData).reason))}</p>`);
          if (unref(roundEndedInstantlyModalData).winnerId) {
            _push(`<div class="bg-blue-50 rounded-lg p-4 mb-4" data-v-65df56ec><p class="text-base text-gray-700 mb-2" data-v-65df56ec><span class="font-bold text-blue-700" data-v-65df56ec>${ssrInterpolate(getPlayerName(unref(roundEndedInstantlyModalData).winnerId))}</span> received <span class="font-bold text-blue-700" data-v-65df56ec>${ssrInterpolate(unref(roundEndedInstantlyModalData).awardedPoints)} points</span></p></div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<div class="bg-gray-50 rounded-lg p-4" data-v-65df56ec><h3 class="text-sm font-semibold text-gray-700 mb-3" data-v-65df56ec>Total Scores</h3><!--[-->`);
          ssrRenderList(unref(roundEndedInstantlyModalData).updatedTotalScores, (score) => {
            _push(`<div class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0" data-v-65df56ec><span class="text-gray-700 font-medium" data-v-65df56ec>${ssrInterpolate(getPlayerName(score.player_id))}</span><span class="text-xl font-bold text-gray-600" data-v-65df56ec>${ssrInterpolate(score.score)}</span></div>`);
          });
          _push(`<!--]--></div></div>`);
        } else {
          _push(`<div class="text-center text-gray-600" data-v-65df56ec><p data-v-65df56ec>Round ended</p></div>`);
        }
        _push(`</div><div class="px-6 py-4 bg-gray-50 border-t border-gray-200" data-v-65df56ec><div class="flex items-center justify-center gap-2 text-gray-700" data-v-65df56ec><span class="text-sm font-medium" data-v-65df56ec>Next round in:</span><span class="${ssrRenderClass([
          "text-2xl font-bold tabular-nums",
          countdownWarningClass.value
        ])}" data-v-65df56ec>${ssrInterpolate(displayCountdown.value)}</span><span class="text-sm" data-v-65df56ec>s</span></div><p class="text-xs text-gray-500 text-center mt-2" data-v-65df56ec> Please wait for the countdown to finish </p></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/RoundEndModal.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const RoundEndModal = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-65df56ec"]]);
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "ReconnectionBanner",
  __ssrInlineRender: true,
  setup(__props) {
    const uiStore = useUIStateStore();
    const isVisible = computed(() => {
      return uiStore.reconnecting || uiStore.connectionStatus === "connecting";
    });
    const statusMessage = computed(() => {
      if (uiStore.reconnecting) {
        return "連線中斷，正在嘗試重連...";
      }
      if (uiStore.connectionStatus === "connecting") {
        return "正在連線...";
      }
      return "";
    });
    return (_ctx, _push, _parent, _attrs) => {
      ({ style: {
        ":--c3370b10": unref(Z_INDEX).RECONNECTION
      } });
      if (isVisible.value) {
        _push(`<div${ssrRenderAttrs(mergeProps({
          class: "reconnection-banner",
          role: "alert",
          "aria-live": "polite"
        }, _attrs))} data-v-b87a223c><div class="banner-content" data-v-b87a223c><span class="loading-spinner" aria-hidden="true" data-v-b87a223c></span><span class="status-message" data-v-b87a223c>${ssrInterpolate(statusMessage.value)}</span></div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/ReconnectionBanner.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const ReconnectionBanner = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-b87a223c"]]);
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "AnimationLayer",
  __ssrInlineRender: true,
  setup(__props) {
    const store = useAnimationLayerStore();
    ref(/* @__PURE__ */ new Set());
    ref(/* @__PURE__ */ new Map());
    ref(/* @__PURE__ */ new Set());
    ref(/* @__PURE__ */ new Map());
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderTeleport(_push, (_push2) => {
        _push2(`<div class="fixed inset-0 pointer-events-none" style="${ssrRenderStyle({ zIndex: unref(Z_INDEX).ANIMATION })}"><!--[-->`);
        ssrRenderList(unref(store).animatingCards, (card) => {
          _push2(`<div class="absolute" style="${ssrRenderStyle({
            left: `${card.fromRect.x}px`,
            top: `${card.fromRect.y}px`,
            width: `${card.fromRect.width}px`,
            height: `${card.fromRect.height}px`
          })}">`);
          _push2(ssrRenderComponent(CardComponent, {
            "card-id": card.renderCardId || card.cardId,
            "is-animation-clone": true,
            "is-face-down": card.isFaceDown
          }, null, _parent));
          _push2(`</div>`);
        });
        _push2(`<!--]--><!--[-->`);
        ssrRenderList(unref(store).animatingGroups, (group) => {
          _push2(`<div class="absolute" style="${ssrRenderStyle({
            left: `${group.boundingBox.x}px`,
            top: `${group.boundingBox.y}px`,
            width: `${group.boundingBox.width}px`,
            height: `${group.boundingBox.height}px`
          })}"><!--[-->`);
          ssrRenderList(group.cards, (card) => {
            _push2(`<div class="absolute" style="${ssrRenderStyle({
              left: `${card.fromRect.x - group.boundingBox.x}px`,
              top: `${card.fromRect.y - group.boundingBox.y}px`,
              width: `${card.fromRect.width}px`,
              height: `${card.fromRect.height}px`
            })}">`);
            _push2(ssrRenderComponent(CardComponent, {
              "card-id": card.renderCardId || card.cardId,
              "is-animation-clone": true,
              "is-face-down": card.isFaceDown
            }, null, _parent));
            _push2(`</div>`);
          });
          _push2(`<!--]--></div>`);
        });
        _push2(`<!--]--></div>`);
      }, "body", false, _parent);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/AnimationLayer.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "ConfirmationHint",
  __ssrInlineRender: true,
  setup(__props) {
    const uiState = useUIStateStore();
    const { handCardConfirmationMode, matchCount } = storeToRefs(uiState);
    const hintText = computed(() => {
      if (!handCardConfirmationMode.value) {
        return "";
      }
      switch (matchCount.value) {
        case 0:
          return "Click to play card";
        case 1:
          return "Click card again or click field card to play";
        default:
          return "Click highlighted field card to select match";
      }
    });
    const isVisible = computed(() => {
      return handCardConfirmationMode.value && hintText.value !== "";
    });
    return (_ctx, _push, _parent, _attrs) => {
      if (isVisible.value) {
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "fixed bottom-8 left-1/2 -translate-x-1/2 z-50" }, _attrs))} data-v-4cee72e9><div class="px-6 py-3 bg-gray-800 bg-opacity-90 text-white text-sm font-medium rounded-lg shadow-lg" data-v-4cee72e9>${ssrInterpolate(hintText.value)}</div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("views/GamePage/components/ConfirmationHint.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const ConfirmationHint = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-4cee72e9"]]);
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "ConfirmDialog",
  __ssrInlineRender: true,
  props: {
    isOpen: { type: Boolean },
    title: {},
    message: {},
    confirmText: { default: "確認" },
    cancelText: { default: "取消" }
  },
  emits: ["confirm", "cancel"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const dialogRef = ref();
    const initMotion = () => {
      if (!dialogRef.value) return;
      useMotion(dialogRef.value, {
        initial: { scale: 0.95, opacity: 0 },
        enter: {
          scale: 1,
          opacity: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 25
          }
        },
        leave: {
          scale: 0.95,
          opacity: 0,
          transition: { duration: 150 }
        }
      });
    };
    watch(
      () => props.isOpen,
      (newValue) => {
        if (newValue) {
          initMotion();
        }
      },
      { immediate: true }
    );
    watch(
      () => props.isOpen,
      (isOpen) => {
        if (isOpen) {
          (void 0).body.style.overflow = "hidden";
        } else {
          (void 0).body.style.overflow = "";
        }
      },
      { immediate: true }
    );
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderTeleport(_push, (_push2) => {
        if (__props.isOpen) {
          _push2(`<div data-testid="confirm-dialog-overlay" class="fixed inset-0 flex items-center justify-center" style="${ssrRenderStyle({ zIndex: unref(Z_INDEX).MODAL })}" data-v-986e4c68><div class="absolute inset-0 bg-black bg-opacity-50 transition-opacity" data-v-986e4c68></div><div data-testid="confirm-dialog" role="dialog" aria-modal="true"${ssrRenderAttr("aria-labelledby", __props.title)} class="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-2xl" data-v-986e4c68><h2 data-testid="dialog-title" class="mb-4 text-xl font-bold text-gray-900" data-v-986e4c68>${ssrInterpolate(__props.title)}</h2><p data-testid="dialog-message" class="mb-6 text-base text-gray-700" data-v-986e4c68>${ssrInterpolate(__props.message)}</p><div class="flex justify-end space-x-3" data-v-986e4c68><button data-testid="cancel-button" type="button" class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 transition-colors" data-v-986e4c68>${ssrInterpolate(__props.cancelText)}</button><button data-testid="confirm-button" type="button" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors" data-v-986e4c68>${ssrInterpolate(__props.confirmText)}</button></div></div></div>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ConfirmDialog.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const ConfirmDialog = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-986e4c68"]]), { __name: "ConfirmDialog" });
function useLeaveGame(options = {}) {
  const { requireConfirmation = false } = options;
  const router = useRouter();
  const gameState = useGameStateStore();
  const uiState = useUIStateStore();
  const matchmakingState = useMatchmakingStateStore();
  const gameApiClient = useDependency(TOKENS.SendCommandPort);
  const notification = useDependency(TOKENS.NotificationPort);
  const isActionPanelOpen = ref(false);
  const isConfirmDialogOpen = ref(false);
  const menuItems = [
    {
      id: "leave-game",
      label: "Leave Game",
      icon: "🚪",
      onClick: handleLeaveGameClick
    }
  ];
  function toggleActionPanel() {
    isActionPanelOpen.value = !isActionPanelOpen.value;
  }
  function closeActionPanel() {
    isActionPanelOpen.value = false;
  }
  function handleLeaveGameClick() {
    if (requireConfirmation) {
      isConfirmDialogOpen.value = true;
    } else {
      handleLeaveGameConfirm();
    }
  }
  async function handleLeaveGameConfirm() {
    try {
      isConfirmDialogOpen.value = false;
      isActionPanelOpen.value = false;
      const gameId = gameState.gameId;
      if (!gameId) {
        console.warn("[useLeaveGame] 無法退出遊戲：找不到 gameId");
        clearLocalStateAndNavigate();
        return;
      }
      if (gameApiClient) {
        try {
          await gameApiClient.leaveGame(gameId);
          console.info("[useLeaveGame] 成功調用 leaveGame API");
        } catch (error) {
          console.error("[useLeaveGame] leaveGame API 失敗:", error);
        }
      } else {
        console.warn("[useLeaveGame] GameApiClient 未注入");
      }
      clearLocalStateAndNavigate();
    } catch (error) {
      console.error("[useLeaveGame] 退出遊戲流程失敗:", error);
      clearLocalStateAndNavigate();
    }
  }
  function handleLeaveGameCancel() {
    isConfirmDialogOpen.value = false;
  }
  function clearLocalStateAndNavigate() {
    sessionStorage.removeItem("session_token");
    notification.cleanup();
    gameState.$reset();
    uiState.$reset();
    matchmakingState.$reset();
    router.push("/");
  }
  return {
    // State
    isActionPanelOpen,
    isConfirmDialogOpen,
    // Menu Items
    menuItems,
    // Methods
    toggleActionPanel,
    closeActionPanel,
    handleLeaveGameClick,
    handleLeaveGameConfirm,
    handleLeaveGameCancel
  };
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "game",
  __ssrInlineRender: true,
  setup(__props) {
    useZoneRegistration("opponent-hand");
    const gameState = useGameStateStore();
    const uiState = useUIStateStore();
    const { opponentHandCount, fieldCards } = storeToRefs(gameState);
    const { infoMessage, handCardConfirmationMode, handCardAwaitingConfirmation, connectionStatus } = storeToRefs(uiState);
    const connectionStatusText = computed(() => {
      switch (connectionStatus.value) {
        case "connected":
          return "Connected";
        case "connecting":
          return "Connecting...";
        case "disconnected":
          return "Disconnected";
        default:
          return "";
      }
    });
    const connectionStatusClass = computed(() => {
      switch (connectionStatus.value) {
        case "connected":
          return "text-green-400";
        case "connecting":
          return "text-yellow-400";
        case "disconnected":
          return "text-red-400";
        default:
          return "";
      }
    });
    const {
      isActionPanelOpen,
      isConfirmDialogOpen,
      menuItems,
      toggleActionPanel,
      closeActionPanel,
      handleLeaveGameConfirm,
      handleLeaveGameCancel
    } = useLeaveGame({ requireConfirmation: true });
    sessionStorage.getItem("gameMode") || "mock";
    function handleFieldCardClick(cardId) {
      console.info("[GamePage] 場牌點擊事件（已由 FieldZone 處理）:", cardId);
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "h-screen w-screen flex flex-col bg-green-900 overflow-hidden" }, _attrs))} data-v-b9415c95><div class="fixed w-full h-24" style="${ssrRenderStyle({ "top": "-150px", "left": "0" })}" aria-hidden="true" data-v-b9415c95></div><header class="h-[10%] min-h-12 relative" data-v-b9415c95>`);
      _push(ssrRenderComponent(TopInfoBar, {
        variant: "game",
        onMenuClick: unref(toggleActionPanel)
      }, {
        right: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="flex items-center gap-4" data-v-b9415c95${_scopeId}><div class="text-center" data-v-b9415c95${_scopeId}><div class="text-xs text-gray-400" data-v-b9415c95${_scopeId}>You</div><div class="text-xl font-bold" data-v-b9415c95${_scopeId}>${ssrInterpolate(unref(gameState).myScore)}</div></div><div class="${ssrRenderClass([connectionStatusClass.value, "text-xs"])}" data-v-b9415c95${_scopeId}>${ssrInterpolate(connectionStatusText.value)}</div><button data-testid="menu-button" aria-label="Open menu" class="p-2 rounded-lg hover:bg-white/10 transition-colors" data-v-b9415c95${_scopeId}><svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" data-v-b9415c95${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" data-v-b9415c95${_scopeId}></path></svg></button></div>`);
          } else {
            return [
              createVNode("div", { class: "flex items-center gap-4" }, [
                createVNode("div", { class: "text-center" }, [
                  createVNode("div", { class: "text-xs text-gray-400" }, "You"),
                  createVNode("div", { class: "text-xl font-bold" }, toDisplayString(unref(gameState).myScore), 1)
                ]),
                createVNode("div", {
                  class: ["text-xs", connectionStatusClass.value]
                }, toDisplayString(connectionStatusText.value), 3),
                createVNode("button", {
                  "data-testid": "menu-button",
                  "aria-label": "Open menu",
                  class: "p-2 rounded-lg hover:bg-white/10 transition-colors",
                  onClick: unref(toggleActionPanel)
                }, [
                  (openBlock(), createBlock("svg", {
                    class: "h-6 w-6 text-white",
                    xmlns: "http://www.w3.org/2000/svg",
                    fill: "none",
                    viewBox: "0 0 24 24",
                    stroke: "currentColor"
                  }, [
                    createVNode("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "2",
                      d: "M4 6h16M4 12h16M4 18h16"
                    })
                  ]))
                ], 8, ["onClick"])
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</header><section class="h-[15%] bg-gray-700/50 overflow-x-auto" data-v-b9415c95>`);
      _push(ssrRenderComponent(OpponentDepositoryZone, null, null, _parent));
      _push(`</section><section class="h-[30%] bg-green-800/50 flex" data-v-b9415c95>`);
      _push(ssrRenderComponent(FieldZone, {
        class: "flex-1",
        onCardClick: handleFieldCardClick
      }, null, _parent));
      _push(ssrRenderComponent(_sfc_main$9, { class: "w-24 shrink-0" }, null, _parent));
      _push(`</section><section class="h-[15%] bg-gray-700/50 overflow-x-auto" data-v-b9415c95>`);
      _push(ssrRenderComponent(PlayerDepositoryZone, null, null, _parent));
      _push(`</section><section class="h-[30%] bg-gray-800/50" data-v-b9415c95>`);
      _push(ssrRenderComponent(PlayerHandZone, null, null, _parent));
      _push(`</section><div class="fixed top-20 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm" data-v-b9415c95> Opponent Hand: ${ssrInterpolate(unref(opponentHandCount))}</div>`);
      _push(ssrRenderComponent(ErrorToast, null, null, _parent));
      if (unref(infoMessage)) {
        _push(`<div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg" data-v-b9415c95>${ssrInterpolate(unref(infoMessage))}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(ReconnectionBanner, null, null, _parent));
      _push(ssrRenderComponent(DecisionModal, null, null, _parent));
      _push(ssrRenderComponent(GameFinishedModal, null, null, _parent));
      _push(ssrRenderComponent(RoundEndModal, null, null, _parent));
      _push(ssrRenderComponent(_sfc_main$3, null, null, _parent));
      _push(ssrRenderComponent(ConfirmationHint, null, null, _parent));
      _push(ssrRenderComponent(ActionPanel, {
        "is-open": unref(isActionPanelOpen),
        items: unref(menuItems),
        onClose: unref(closeActionPanel)
      }, null, _parent));
      _push(ssrRenderComponent(ConfirmDialog, {
        "is-open": unref(isConfirmDialogOpen),
        title: "Leave Game",
        message: "Are you sure you want to leave this game? Your progress will be lost.",
        "confirm-text": "Leave",
        "cancel-text": "Cancel",
        onConfirm: unref(handleLeaveGameConfirm),
        onCancel: unref(handleLeaveGameCancel)
      }, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/game.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const game = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b9415c95"]]);

export { game as default };
//# sourceMappingURL=game-Dgs9wsIV.mjs.map
