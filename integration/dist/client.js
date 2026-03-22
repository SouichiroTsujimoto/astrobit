// client.ts
var client_default = (element) => {
  return async (Component, props) => {
    if (element.innerHTML.trim() && typeof Component.hydrate === "function") {
      Component.hydrate(element, props);
    } else {
      element.innerHTML = "";
      Component.mount(element, props);
    }
  };
};
export {
  client_default as default
};
