// server.ts
var server_default = {
  name: "astrobit",
  check(Component) {
    return Component?.__moonbit === true;
  },
  async renderToStaticMarkup(Component, props) {
    return { html: Component.render?.(props) ?? "<div></div>" };
  }
};
export {
  server_default as default
};
