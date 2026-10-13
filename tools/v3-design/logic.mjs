// Loads the design's DC logic class in Node with browser stubs so we can
// evaluate renderVals() for any state and record what each handler does.
import fs from "node:fs";

export function loadLogic(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const start = html.indexOf("<script type=\"text/x-dc\"");
  const bodyStart = html.indexOf(">", start) + 1;
  const end = html.indexOf("</script>", bodyStart);
  const code = html.slice(bodyStart, end);
  const template = html.slice(html.indexOf("<x-dc>"), start);

  const env = { width: 1536, scrollTo: [], printed: 0 };
  const fakeWindow = {
    get innerWidth() {
      return env.width;
    },
    scrollY: 0,
    addEventListener() {},
    removeEventListener() {},
    scrollTo(a, b) {
      env.scrollTo.push(typeof a === "object" ? a : { top: b });
    },
    print() {
      env.printed++;
    },
    ResizeObserver: undefined,
  };
  const fakeDocument = {
    getElementById: (id) => {
      env.lastId = id;
      return { getBoundingClientRect: () => ({ top: 500 }), scrollIntoView() {}, focus() {} };
    },
    addEventListener() {},
    documentElement: {},
    querySelector: () => null,
  };
  class DCLogic {
    constructor() {
      this.props = { startPage: "home", submitResult: "success", stickyHeader: true, sideTab: true };
    }
    setState(patch) {
      const p = typeof patch === "function" ? patch(this.state) : patch;
      this.state = { ...this.state, ...p };
    }
  }
  const React = { createRef: () => ({ current: null }) };
  const localStorage = { getItem: () => null, setItem() {} };
  const fn = new Function(
    "DCLogic", "React", "window", "document", "localStorage", "requestAnimationFrame",
    code + "\nreturn Component;",
  );
  const Component = fn(DCLogic, React, fakeWindow, fakeDocument, localStorage, () => {});
  return { Component, env, template };
}
