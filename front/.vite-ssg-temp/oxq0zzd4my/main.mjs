import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
const reactLogo = "/assets/react-CHdo91hT.svg";
const viteLogo = "/vite.svg";
function App() {
  const [count, setCount] = useState(0);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("a", { href: "https://vite.dev", target: "_blank", children: /* @__PURE__ */ jsx("img", { src: viteLogo, className: "logo", alt: "Vite logo" }) }),
      /* @__PURE__ */ jsx("a", { href: "https://react.dev", target: "_blank", children: /* @__PURE__ */ jsx("img", { src: reactLogo, className: "logo react", alt: "React logo" }) })
    ] }),
    /* @__PURE__ */ jsx("h1", { children: "Vite + React" }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("button", { onClick: () => setCount((count2) => count2 + 1), children: [
        "count is ",
        count
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Edit ",
        /* @__PURE__ */ jsx("code", { children: "src/App.jsx" }),
        " and save to test HMR"
      ] })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "read-the-docs", children: "Click on the Vite and React logos to learn more" })
  ] });
}
createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsx(StrictMode, { children: /* @__PURE__ */ jsx(App, {}) })
);
