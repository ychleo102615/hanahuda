import { defineComponent, computed, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr } from 'vue/server-renderer';
import { _ as _export_sfc } from './server.mjs';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SvgIcon",
  __ssrInlineRender: true,
  props: {
    prefix: { default: "icon" },
    name: {},
    className: { default: "" }
  },
  setup(__props) {
    const props = __props;
    const symbolId = computed(() => `#${props.prefix}-${props.name}`);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<svg${ssrRenderAttrs(mergeProps({
        class: ["svg-icon", __props.className],
        "aria-hidden": "true",
        viewBox: "0 0 976 1600"
      }, _attrs))} data-v-844649ea><use${ssrRenderAttr("href", symbolId.value)} data-v-844649ea></use></svg>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SvgIcon.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const SvgIcon = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main, [["__scopeId", "data-v-844649ea"]]), { __name: "SvgIcon" });
const MONTH_MAP = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  "10": "October",
  "11": "November",
  "12": "December"
};
const TYPE_MAP = {
  "1": "Hikari",
  "2": "Tane",
  "3": "Tanzaku",
  "4": "Kasu"
};
const DEFAULT_CARD_ICON_NAME = "Hanafuda_Default";
const CARD_BACK_ICON_NAME = "Hanafuda_Back";
function mmtiToSvgName(mmti) {
  if (!mmti || mmti.length !== 4) {
    console.warn(`[cardMapping] Invalid MMTI format: "${mmti}" (length should be 4)`);
    return null;
  }
  const month = mmti.substring(0, 2);
  const type = mmti.substring(2, 3);
  const index = mmti.substring(3, 4);
  const monthName = MONTH_MAP[month];
  if (!monthName) {
    console.warn(`[cardMapping] Invalid month code: "${month}" in MMTI "${mmti}"`);
    return null;
  }
  const typeName = TYPE_MAP[type];
  if (!typeName) {
    console.warn(`[cardMapping] Invalid type code: "${type}" in MMTI "${mmti}"`);
    return null;
  }
  const indexNum = parseInt(index, 10);
  if (isNaN(indexNum) || indexNum < 1 || indexNum > 4) {
    console.warn(`[cardMapping] Invalid index: "${index}" in MMTI "${mmti}"`);
    return null;
  }
  if (type === "4") {
    return `Hanafuda_${monthName}_${typeName}_${index}`;
  } else {
    return `Hanafuda_${monthName}_${typeName}`;
  }
}
function getCardIconName(mmti) {
  return mmtiToSvgName(mmti) || DEFAULT_CARD_ICON_NAME;
}

export { CARD_BACK_ICON_NAME as C, SvgIcon as S, getCardIconName as g };
//# sourceMappingURL=cardMapping-CW6u8nZX.mjs.map
