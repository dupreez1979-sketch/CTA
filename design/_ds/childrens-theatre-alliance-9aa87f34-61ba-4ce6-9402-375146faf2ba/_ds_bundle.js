/* @ds-bundle: {"format":3,"namespace":"DesignSystem_9aa87f","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"CloudDivider","sourcePath":"components/brand/CloudDivider.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"PuzzleShape","sourcePath":"components/brand/PuzzleShape.jsx"},{"name":"BannerCard","sourcePath":"components/content/BannerCard.jsx"},{"name":"FeatureCard","sourcePath":"components/content/FeatureCard.jsx"},{"name":"SectionHeading","sourcePath":"components/content/SectionHeading.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"4e8fc8cdb811","components/brand/CloudDivider.jsx":"286dbf8fa903","components/brand/Logo.jsx":"443b4bf9bc7f","components/brand/PuzzleShape.jsx":"e762d39bdb57","components/content/BannerCard.jsx":"f4a4937f1ffc","components/content/FeatureCard.jsx":"7b833f82f23f","components/content/SectionHeading.jsx":"28c8f4721119","components/forms/Input.jsx":"5e435545002d","ui_kits/website/Sections.jsx":"d18bd8efbad4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_9aa87f = window.DesignSystem_9aa87f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Children's Theatre Alliance
 * Chunky pill/rounded button with the signature hard black offset shadow
 * and a playful resting tilt. Hover lifts, press collapses the shadow.
 */
function Button({
  children,
  variant = 'primary',
  // primary | dark | warm | white | ghost
  size = 'md',
  // sm | md | lg
  tilt = true,
  as = 'button',
  ...rest
}) {
  const palette = {
    primary: {
      bg: 'var(--cta-purple)',
      fg: 'var(--cta-ink)',
      border: 'var(--cta-ink)'
    },
    dark: {
      bg: 'var(--cta-ink)',
      fg: 'var(--cta-cream)',
      border: 'var(--cta-ink)'
    },
    warm: {
      bg: 'var(--cta-yellow)',
      fg: 'var(--cta-ink)',
      border: 'var(--cta-ink)'
    },
    white: {
      bg: 'var(--cta-white)',
      fg: 'var(--cta-ink)',
      border: 'var(--cta-ink)'
    },
    ghost: {
      bg: 'transparent',
      fg: 'var(--cta-ink)',
      border: 'var(--cta-ink)'
    }
  }[variant] || {};
  const sizing = {
    sm: {
      padding: '8px 16px',
      font: 'var(--text-sm)'
    },
    md: {
      padding: '13px 26px',
      font: 'var(--text-md)'
    },
    lg: {
      padding: '18px 38px',
      font: 'var(--text-lg)'
    }
  }[size];
  const Tag = as;
  const [pressed, setPressed] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const rest0 = -1.5; // resting tilt in deg
  const rot = tilt ? hover ? 0 : rest0 : 0;
  const lift = hover && !pressed ? -2 : 0;
  return /*#__PURE__*/React.createElement(Tag, _extends({}, rest, {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPressed(false);
    },
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: sizing.font,
      padding: sizing.padding,
      color: palette.fg,
      background: palette.bg,
      border: `var(--border-w-bold) solid ${palette.border}`,
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      textDecoration: 'none',
      lineHeight: 1.1,
      whiteSpace: 'nowrap',
      boxShadow: pressed ? 'var(--shadow-hard-pressed)' : 'var(--shadow-hard-md)',
      transform: `translate(${pressed ? 4 : 0}px, ${pressed ? 4 : lift}px) rotate(${rot}deg)`,
      transition: 'transform var(--dur-fast) var(--ease-pop), box-shadow var(--dur-fast) var(--ease-out)',
      ...(rest.style || {})
    }
  }), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/brand/CloudDivider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * CloudDivider — Children's Theatre Alliance
 * A bumpy, hand-cut cloud edge used as a section transition (teal "sky"
 * with cream clouds at the top of a section; a black cloud band above the
 * footer). Renders a full-width SVG band; the bumps sit on `edge`.
 */
function CloudDivider({
  cloud = 'var(--cta-cream)',
  // the cloud fill (also the section it leads into)
  sky = 'var(--cta-mint)',
  // the band behind the bumps
  edge = 'top',
  // 'top' = bumps rise from the bottom; 'bottom' = hang from top
  height = 160,
  bumps = 7,
  ...rest
}) {
  const w = 1200;
  const r = w / (bumps * 2);
  // Build a bumpy edge across the width using arcs.
  let d = `M0,${height} `;
  d += `L0,${height * 0.55} `;
  for (let i = 0; i < bumps; i++) {
    const cx = r + i * r * 2;
    d += `A${r},${r} 0 0 1 ${cx + r},${height * 0.55} `;
  }
  d += `L${w},${height} Z`;
  const flip = edge === 'top' ? '' : `scale(1,-1) translate(0,-${height})`;
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      position: 'relative',
      width: '100%',
      height,
      background: sky,
      lineHeight: 0,
      ...(rest.style || {})
    }
  }), /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${height}`,
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("g", {
    transform: flip
  }, /*#__PURE__*/React.createElement("path", {
    d: d,
    fill: cloud
  }))));
}
Object.assign(__ds_scope, { CloudDivider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/CloudDivider.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Logo — Children's Theatre Alliance
 * Renders the official brand lockup from an image asset, or a type-only
 * wordmark fallback (Impact caps) when no image src is supplied.
 * NOTE: the real logo is a raster asset — pass `src` pointing at your
 * copied assets/logo-full.png (or logo-mark.png). Never redraw the mark.
 */
function Logo({
  variant = 'wordmark',
  // 'full' (mark+words img) | 'mark' (glyph img) | 'wordmark' (type only)
  src,
  height = 48,
  color = 'var(--cta-ink)',
  ...rest
}) {
  if ((variant === 'full' || variant === 'mark') && src) {
    return /*#__PURE__*/React.createElement("img", _extends({}, rest, {
      src: src,
      alt: "The Children's Theatre Alliance",
      style: {
        height,
        width: 'auto',
        display: 'block',
        ...(rest.style || {})
      }
    }));
  }
  // Type-only lockup
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      lineHeight: 0.88,
      letterSpacing: '0.01em',
      fontSize: height * 0.42,
      color,
      display: 'inline-block',
      ...(rest.style || {})
    }
  }), "The Children's", /*#__PURE__*/React.createElement("br", null), "Theatre Alliance");
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/brand/PuzzleShape.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PuzzleShape — Children's Theatre Alliance
 * The core brand motif: a flat, solid-color building block drawn from the
 * puzzle-shape library (squares with knobs, arches, circles, quarters,
 * plus signs, stairs). Optional centered text turns it into a stat/label
 * shape. Purely decorative geometry — safe to recolor and rotate freely.
 */

const COLORS = {
  purple: 'var(--cta-purple)',
  pink: 'var(--cta-pink)',
  yellow: 'var(--cta-yellow)',
  teal: 'var(--cta-teal)',
  ocean: 'var(--cta-ocean)',
  emerald: 'var(--cta-emerald)',
  blue: 'var(--cta-blue)',
  sky: 'var(--cta-sky)',
  mint: 'var(--cta-mint)',
  cream: 'var(--cta-cream-deep)',
  ink: 'var(--cta-ink-2)'
};

// Each shape returns an SVG element string sized to a 100x100 box.
function ShapeSvg({
  shape,
  fill
}) {
  const common = {
    fill,
    vectorEffect: 'non-scaling-stroke'
  };
  switch (shape) {
    case 'arch':
      // rounded-top arch (doorway)
      return /*#__PURE__*/React.createElement("path", _extends({
        d: "M0,100 L0,50 A50,50 0 0 1 100,50 L100,100 Z"
      }, common));
    case 'circle':
      return /*#__PURE__*/React.createElement("circle", _extends({
        cx: "50",
        cy: "50",
        r: "50"
      }, common));
    case 'quarter':
      // quarter circle, corner top-left solid
      return /*#__PURE__*/React.createElement("path", _extends({
        d: "M0,0 L0,100 A100,100 0 0 0 100,0 Z"
      }, common));
    case 'plus':
      return /*#__PURE__*/React.createElement("path", _extends({
        d: "M35,0 H65 V35 H100 V65 H65 V100 H35 V65 H0 V35 H35 Z"
      }, common));
    case 'archCut':
      // square with an arch bitten out of the top
      return /*#__PURE__*/React.createElement("path", _extends({
        d: "M0,0 H100 V100 H0 Z M35,0 A15,15 0 0 0 65,0 Z",
        fillRule: "evenodd"
      }, common));
    case 'knobLeft':
      // square with a round knob on the left
      return /*#__PURE__*/React.createElement("path", _extends({
        d: "M0,35 A15,15 0 0 1 0,65 L0,100 H100 V0 H0 Z"
      }, common));
    case 'stairs':
      return /*#__PURE__*/React.createElement("path", _extends({
        d: "M0,100 V60 H25 V40 H50 V20 H75 V0 H100 V100 Z"
      }, common));
    case 'square':
    default:
      // square with a round knob poking out the right side
      return /*#__PURE__*/React.createElement("path", _extends({
        d: "M0,0 H100 A15,15 0 0 1 100,30 A15,15 0 0 1 100,60 V100 H0 Z"
      }, common));
  }
}
function PuzzleShape({
  shape = 'square',
  // square | arch | circle | quarter | plus | archCut | knobLeft | stairs
  color = 'purple',
  size = 120,
  rotate = 0,
  children,
  ...rest
}) {
  const fill = COLORS[color] || color;
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      position: 'relative',
      width: size,
      height: size,
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      ...(rest.style || {})
    }
  }), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement(ShapeSvg, {
    shape: shape,
    fill: fill
  })), children != null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 'var(--space-5)',
      transform: rotate ? `rotate(${-rotate}deg)` : undefined,
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--cta-ink)',
      lineHeight: 1.2,
      boxSizing: 'border-box'
    }
  }, children));
}
Object.assign(__ds_scope, { PuzzleShape });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/PuzzleShape.jsx", error: String((e && e.message) || e) }); }

// components/content/BannerCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * BannerCard — Children's Theatre Alliance
 * White card with the signature hard offset shadow and a diagonal colored
 * banner across the top carrying an italic Impact title (as on the
 * "Remove Barriers" recommendation cards).
 */
function BannerCard({
  banner,
  bannerColor = 'var(--cta-yellow)',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("article", _extends({}, rest, {
    style: {
      position: 'relative',
      background: 'var(--cta-white)',
      border: 'var(--border-w-bold) solid var(--cta-ink)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-hard-lg)',
      overflow: 'hidden',
      minHeight: 260,
      ...(rest.style || {})
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 46,
      left: -30,
      right: -30,
      transform: 'rotate(-7deg)',
      background: bannerColor,
      borderTop: 'var(--border-w-bold) solid var(--cta-ink)',
      borderBottom: 'var(--border-w-bold) solid var(--cta-ink)',
      padding: '14px 40px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontStyle: 'italic',
      textTransform: 'uppercase',
      fontSize: 'var(--display-md)',
      letterSpacing: '0.01em',
      color: 'var(--cta-ink)',
      lineHeight: 1
    }
  }, banner)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)',
      paddingTop: 150,
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xl)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--text-body)'
    }
  }, children));
}
Object.assign(__ds_scope, { BannerCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/BannerCard.jsx", error: String((e && e.message) || e) }); }

// components/content/FeatureCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * FeatureCard — Children's Theatre Alliance
 * A compact benefit/feature block: a colored shape/icon, a title, and a
 * short line of body copy (as on the "Artistic Engagement / Health and
 * wellbeing" cards). Pass a PuzzleShape (or any node) as `icon`.
 */
function FeatureCard({
  icon,
  title,
  children,
  align = 'left',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      textAlign: align,
      maxWidth: 320,
      ...(rest.style || {})
    }
  }), icon && /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 0
    }
  }, icon), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-xl)',
      color: 'var(--text-strong)',
      margin: 0,
      lineHeight: 'var(--leading-tight)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-md)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--text-body)',
      margin: 0
    }
  }, children));
}
Object.assign(__ds_scope, { FeatureCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/FeatureCard.jsx", error: String((e && e.message) || e) }); }

// components/content/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SectionHeading — Children's Theatre Alliance
 * The loud Impact all-caps section title, optionally paired with a smaller
 * Poppins kicker line (a lead-in above or a sub-line below).
 */
function SectionHeading({
  title,
  kicker,
  kickerPosition = 'below',
  // 'above' | 'below'
  align = 'left',
  // 'left' | 'center'
  size = 'xl',
  // '2xl' | 'xl' | 'lg'
  color = 'var(--text-strong)',
  children,
  ...rest
}) {
  const displaySize = {
    '2xl': 'var(--display-2xl)',
    xl: 'var(--display-xl)',
    lg: 'var(--display-lg)'
  }[size];
  const kick = kicker && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-xl)',
      color: 'var(--text-body)',
      margin: 0,
      maxWidth: '52ch',
      marginInline: align === 'center' ? 'auto' : undefined
    }
  }, kicker);
  return /*#__PURE__*/React.createElement("header", _extends({}, rest, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      textAlign: align,
      ...(rest.style || {})
    }
  }), kickerPosition === 'above' && kick, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      fontWeight: 400,
      lineHeight: 'var(--leading-display)',
      letterSpacing: 'var(--tracking-display)',
      fontSize: displaySize,
      color,
      margin: 0
    }
  }, title || children), kickerPosition === 'below' && kick);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — Children's Theatre Alliance
 * The minimal underline text field used in the site's contact form: a
 * small label above a bottom-ruled input, no box. Ink rule on light/accent
 * surfaces. Set `onDark` when placed on the ink footer band.
 */
function Input({
  label,
  required = false,
  type = 'text',
  onDark = false,
  id,
  ...rest
}) {
  const inkColor = onDark ? 'var(--cta-cream)' : 'var(--cta-ink)';
  const fieldId = id || (label ? `f-${String(label).toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--weight-medium)',
      color: inkColor
    }
  }, label, required && ' *'), /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    id: fieldId,
    type: type,
    required: required,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-lg)',
      color: inkColor,
      background: 'transparent',
      border: 'none',
      borderBottom: `2px solid ${inkColor}`,
      padding: '8px 2px',
      outline: 'none',
      width: '100%',
      ...(rest.style || {})
    }
  })));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Sections.jsx
try { (() => {
/* Children's Theatre Alliance — Website UI kit
   Faithful recreation of the marketing site, composed from the design-system
   components. Loaded after the bundle; exports sections to window.
   Wrapped in an initializer so the DS namespace is read only once the
   compiled bundle is present. */

window.__initSections = function () {
  const {
    Button,
    PuzzleShape,
    CloudDivider,
    Logo,
    SectionHeading,
    BannerCard,
    FeatureCard,
    Input
  } = window.DesignSystem_9aa87f;

  /* ---------- Nav ---------- */
  function NavBar() {
    const [open, setOpen] = React.useState(false);
    const links = ['Home', 'The Alliance', '#ForEveryChild', 'Our Work', 'About Us'];
    return /*#__PURE__*/React.createElement("header", {
      style: {
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--cta-cream)',
        borderBottom: '3px solid var(--cta-ink)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 'var(--content-max)',
        margin: '0 auto',
        padding: '14px var(--gutter)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(Logo, {
      variant: "full",
      src: "../../assets/logo-full.png",
      height: 44
    }), /*#__PURE__*/React.createElement("nav", {
      style: {
        display: 'flex',
        gap: 26,
        alignItems: 'center'
      },
      className: "cta-nav-links"
    }, links.map(l => /*#__PURE__*/React.createElement("a", {
      key: l,
      href: "#",
      style: {
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 15,
        color: 'var(--cta-ink)',
        textDecoration: 'none'
      }
    }, l)))));
  }

  /* ---------- Hero ---------- */
  function Hero() {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        background: 'var(--cta-cream)',
        overflow: 'hidden',
        padding: 'var(--section-y) var(--gutter)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement(PuzzleShape, {
      shape: "square",
      color: "pink",
      size: 120,
      rotate: -10,
      style: {
        position: 'absolute',
        top: 40,
        right: '8%'
      }
    }), /*#__PURE__*/React.createElement(PuzzleShape, {
      shape: "circle",
      color: "teal",
      size: 90,
      style: {
        position: 'absolute',
        bottom: 60,
        right: '22%'
      }
    }), /*#__PURE__*/React.createElement(PuzzleShape, {
      shape: "arch",
      color: "yellow",
      size: 100,
      rotate: 8,
      style: {
        position: 'absolute',
        top: '46%',
        right: '4%'
      }
    }), /*#__PURE__*/React.createElement(PuzzleShape, {
      shape: "plus",
      color: "emerald",
      size: 64,
      style: {
        position: 'absolute',
        bottom: 40,
        left: '6%'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        maxWidth: 'var(--content-max)',
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("h1", {
      className: "cta-display",
      style: {
        fontSize: 'var(--display-2xl)',
        margin: 0,
        maxWidth: '14ch'
      }
    }, "Theatre for ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--cta-purple)',
        WebkitTextStroke: '3px var(--cta-ink)'
      }
    }, "every"), " child"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-2xl)',
        fontWeight: 500,
        color: 'var(--text-body)',
        maxWidth: '30ch',
        marginTop: 'var(--space-5)'
      }
    }, "Australia's professional children's theatre makers working together."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-4)',
        marginTop: 'var(--space-6)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "warm",
      as: "a",
      href: "#"
    }, "Learn about Article 31"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      as: "a",
      href: "#"
    }, "About Us"))));
  }

  /* ---------- Why (stats) ---------- */
  function WhyStats() {
    const stats = [{
      s: 'square',
      t: 'Only 1 in 5 children get access to theatre'
    }, {
      s: 'arch',
      t: 'Only 6 funded theatre companies'
    }, {
      s: 'quarter',
      t: 'No national arts policy for children'
    }, {
      s: 'circle',
      t: '1 in 4 children struggle with emotional maturity'
    }, {
      s: 'knobLeft',
      t: 'Theatre is seen as enrichment. Children miss social benefits'
    }];
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--cta-cream)',
        padding: 'var(--section-y) var(--gutter) var(--space-9)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 'var(--content-max)',
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      size: "xl",
      title: "Why Children's Theatre",
      kickerPosition: "above",
      kicker: "But, we have a problem.",
      style: {
        marginBottom: 'var(--space-8)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-5)',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center'
      }
    }, stats.map((st, i) => /*#__PURE__*/React.createElement(PuzzleShape, {
      key: i,
      shape: st.s,
      color: "purple",
      size: 190,
      rotate: i % 2 ? 4 : -4
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 600
      }
    }, st.t))))));
  }

  /* ---------- Benefits ---------- */
  function Benefits() {
    const items = [{
      s: 'square',
      c: 'yellow',
      t: 'Artistic Engagement',
      d: "Children shape Australia's cultural life now, not just in the future."
    }, {
      s: 'arch',
      c: 'teal',
      t: 'Health and wellbeing',
      d: 'Arts engagement in early years strengthens brain, body and relationships.'
    }, {
      s: 'circle',
      c: 'pink',
      t: 'Emotional Wellbeing',
      d: 'Theatre builds the emotional skills children need to feel and connect.'
    }, {
      s: 'plus',
      c: 'emerald',
      t: 'Belonging and Connection',
      d: 'Children who belong thrive. Theatre builds that belonging.'
    }];
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--cta-cream-warm)',
        padding: 'var(--section-y) var(--gutter)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 'var(--content-max)',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
        gap: 'var(--space-7)'
      }
    }, items.map((it, i) => /*#__PURE__*/React.createElement(FeatureCard, {
      key: i,
      icon: /*#__PURE__*/React.createElement(PuzzleShape, {
        shape: it.s,
        color: it.c,
        size: 64
      }),
      title: it.t
    }, it.d))));
  }

  /* ---------- Partners ---------- */
  function Partners() {
    const names = ['Arena', 'Barking Gecko Arts', 'Brymore', 'CDP', 'Dead Puppet Society', 'Imaginary Theatre', 'Monkey Baa', 'Patch', 'Playable Streets', 'Polyglot', 'Sensorium', 'Shake & Stir', 'Slingsby', 'Spare Parts', 'Terrapin', 'The Listies', 'Threshold', 'Windmill'];
    return /*#__PURE__*/React.createElement("section", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) 1.2fr',
        alignItems: 'stretch'
      },
      className: "cta-partners"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--cta-yellow)',
        padding: 'var(--section-y) var(--gutter)'
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "cta-display",
      style: {
        fontSize: 'var(--display-2xl)',
        margin: 0
      }
    }, "20+"), /*#__PURE__*/React.createElement("h2", {
      className: "cta-display",
      style: {
        fontSize: 'var(--display-lg)',
        margin: '0 0 var(--space-5)',
        maxWidth: '12ch'
      }
    }, "Companies partnering for impact"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-lg)',
        lineHeight: 1.6,
        color: 'var(--cta-ink)',
        maxWidth: '40ch'
      }
    }, "The Children's Theatre Alliance is the national platform of Australia's professional theatre companies making work for children. Together we collaborate to ensure every Australian child grows up with theatre as part of their life."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 'var(--space-6)'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "white"
    }, "About the Alliance"))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--cta-cream)',
        padding: 'var(--section-y) var(--gutter)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: 'var(--space-4)',
        placeItems: 'center'
      }
    }, names.map(n => /*#__PURE__*/React.createElement("div", {
      key: n,
      style: {
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 15,
        color: 'var(--cta-ink)',
        textAlign: 'center',
        opacity: .82
      }
    }, n))));
  }

  /* ---------- Recommendations ---------- */
  function Recommendations() {
    const recs = [{
      t: 'Build a Strong Sector',
      c: 'var(--cta-purple)',
      d: 'Build capacity by investing in the Alliance and artists creating theatre for children and families.'
    }, {
      t: "Children's Theatre Fund",
      c: 'var(--cta-pink)',
      d: 'A public-private investment fund for children\u2019s theatre responding to strategic gaps.'
    }, {
      t: 'Cultural + Social',
      c: 'var(--cta-teal)',
      d: 'Commit to cross-portfolio investment in children\u2019s theatre as social infrastructure.'
    }, {
      t: 'Remove Barriers',
      c: 'var(--cta-yellow)',
      d: 'A coordinated program to remove systemic barriers to access for children across Australia.'
    }];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(CloudDivider, {
      sky: "var(--cta-mint)",
      cloud: "var(--cta-cream)",
      edge: "top",
      height: 150
    }), /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--cta-cream)',
        padding: '0 var(--gutter) var(--section-y)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 'var(--content-max)',
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      align: "center",
      size: "xl",
      title: "We are calling for",
      kicker: "Key actions for the Theatre for Young Audiences sector.",
      style: {
        marginBottom: 'var(--space-8)',
        alignItems: 'center'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
        gap: 'var(--space-7)'
      }
    }, recs.map((r, i) => /*#__PURE__*/React.createElement(BannerCard, {
      key: i,
      banner: r.t,
      bannerColor: r.c
    }, r.d))))));
  }

  /* ---------- Campaign CTA ---------- */
  function Campaign() {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--cta-purple)',
        padding: 'var(--section-y) var(--gutter)',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("h2", {
      className: "cta-display",
      style: {
        fontSize: 'var(--display-2xl)',
        margin: '0 0 var(--space-6)',
        color: 'var(--cta-ink)'
      }
    }, "I am #ForEveryChild"), /*#__PURE__*/React.createElement(Button, {
      variant: "dark",
      size: "lg"
    }, "Join the Campaign"));
  }

  /* ---------- Footer ---------- */
  function Footer() {
    const [email, setEmail] = React.useState('');
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        background: 'var(--cta-ink)',
        height: 40
      }
    }, /*#__PURE__*/React.createElement(CloudDivider, {
      sky: "var(--cta-purple)",
      cloud: "var(--cta-ink)",
      edge: "bottom",
      height: 140,
      style: {
        position: 'absolute',
        bottom: '100%',
        left: 0
      }
    }), /*#__PURE__*/React.createElement(PuzzleShape, {
      shape: "knobLeft",
      color: "pink",
      size: 120,
      style: {
        position: 'absolute',
        bottom: 20,
        left: '8%'
      }
    }), /*#__PURE__*/React.createElement(PuzzleShape, {
      shape: "square",
      color: "purple",
      size: 110,
      rotate: -14,
      style: {
        position: 'absolute',
        bottom: 24,
        left: '34%'
      }
    }), /*#__PURE__*/React.createElement(PuzzleShape, {
      shape: "archCut",
      color: "ocean",
      size: 120,
      style: {
        position: 'absolute',
        bottom: 20,
        left: '58%'
      }
    }), /*#__PURE__*/React.createElement(PuzzleShape, {
      shape: "quarter",
      color: "yellow",
      size: 110,
      style: {
        position: 'absolute',
        bottom: 22,
        right: '8%'
      }
    })), /*#__PURE__*/React.createElement("footer", {
      style: {
        background: 'var(--cta-purple)',
        padding: 'var(--space-8) var(--gutter)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 'var(--content-max)',
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
        gap: 'var(--space-6)'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      className: "cta-display",
      style: {
        fontSize: 'var(--display-md)',
        margin: 0,
        gridColumn: '1 / -1'
      }
    }, "The Children's Theatre Alliance"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'var(--font-body)',
        color: 'var(--cta-ink)'
      }
    }, ['The Alliance', 'Our Work', 'About', 'Contact'].map(l => /*#__PURE__*/React.createElement("a", {
      key: l,
      href: "#",
      style: {
        color: 'var(--cta-ink)',
        textDecoration: 'none',
        fontWeight: 500
      }
    }, l))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        color: 'var(--cta-ink)',
        lineHeight: 1.6
      }
    }, "Administered by Monkey Baa Theatre Company (Through establishing the National Children's Theatre Initiative). The Arts Exchange, Level 4, 10 Hickson Road, The Rocks NSW 2000"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'var(--font-body)',
        color: 'var(--cta-ink)'
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: 'var(--cta-ink)',
        textDecoration: 'none',
        fontWeight: 500
      }
    }, "Terms & Conditions"), /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: 'var(--cta-ink)',
        textDecoration: 'none',
        fontWeight: 500
      }
    }, "Privacy Policy"))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 'var(--space-8)',
        maxWidth: 520
      }
    }, /*#__PURE__*/React.createElement("h4", {
      style: {
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 20,
        color: 'var(--cta-ink)',
        margin: '0 0 6px'
      }
    }, "Contact us"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-body)',
        color: 'var(--cta-ink)',
        margin: '0 0 20px'
      }
    }, "Get in touch if you want to learn more about our work."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 16,
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "Your Email",
      required: true,
      type: "email",
      value: email,
      onChange: e => setEmail(e.target.value)
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "dark",
      tilt: false
    }, "Submit"))), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        color: 'var(--cta-ink)',
        marginTop: 'var(--space-8)',
        opacity: .85
      }
    }, "The Alliance acknowledges the traditional custodians of the lands on which we meet, gather, and work. We pay our respects to Elders past and present."))));
  }
  Object.assign(window, {
    NavBar,
    Hero,
    WhyStats,
    Benefits,
    Partners,
    Recommendations,
    Campaign,
    Footer
  });
}; // end __initSections
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.CloudDivider = __ds_scope.CloudDivider;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.PuzzleShape = __ds_scope.PuzzleShape;

__ds_ns.BannerCard = __ds_scope.BannerCard;

__ds_ns.FeatureCard = __ds_scope.FeatureCard;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.Input = __ds_scope.Input;

})();
