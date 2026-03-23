///|
pub extern "js" fn create_element(tag : String) -> Element =
  #|(tag) => document.createElement(tag)

///|
pub extern "js" fn create_text_node(text : String) -> TextNode =
  #|(text) => document.createTextNode(text)

///|
pub extern "js" fn create_comment(text : String) -> Comment =
  #|(text) => document.createComment(text)

///|
pub extern "js" fn append_child(parent : Element, child : Element) -> Unit =
  #|(p, c) => p.appendChild(c)

///|
pub extern "js" fn append_child_node(
  parent : Element,
  child : TextNode,
) -> Unit =
  #|(p, c) => p.appendChild(c)

///|
pub extern "js" fn append_child_comment(
  parent : Element,
  child : Comment,
) -> Unit =
  #|(p, c) => p.appendChild(c)

///|
pub extern "js" fn remove_child(parent : Element, child : Element) -> Unit =
  #|(p, c) => p.removeChild(c)

///|
pub extern "js" fn insert_after(
  parent : Element,
  node : Element,
  ref_ : Comment,
) -> Unit =
  #|(p, n, r) => r.after(n)

///|
pub extern "js" fn last_child(parent : Element) -> Element =
  #|(p) => p.lastElementChild

///|
pub extern "js" fn set_attribute(
  el : Element,
  name : String,
  value : String,
) -> Unit =
  #|(el, n, v) => el.setAttribute(n, v)

///|
pub extern "js" fn remove_attribute(el : Element, name : String) -> Unit =
  #|(el, n) => el.removeAttribute(n)

///|
pub extern "js" fn set_node_text(node : TextNode, text : String) -> Unit =
  #|(n, t) => { n.textContent = t; }

///|
pub extern "js" fn set_inner_html(el : Element, html : String) -> Unit =
  #|(el, h) => { el.innerHTML = h; }

///|
pub extern "js" fn add_event_listener(
  el : Element,
  event : String,
  f : (Event) -> Unit,
) -> Unit =
  #|(el, ev, f) => el.addEventListener(ev, f)

///|
pub extern "js" fn prevent_default(e : Event) -> Unit =
  #|(e) => e.preventDefault()

///|
pub extern "js" fn target_value(e : Event) -> String =
  #|(e) => e.target.value

///|
pub extern "js" fn nth_child_element(el : Element, i : Int) -> Element? =
  #|(el, i) => {
  #|  const node = el.childNodes[i];
  #|  if (node && node.nodeType === 1) return {$tag: 1, _0: node};
  #|  return {$tag: 0};
  #|}

///|
pub extern "js" fn nth_child_text(el : Element, i : Int) -> TextNode? =
  #|(el, i) => {
  #|  const node = el.childNodes[i];
  #|  if (node && node.nodeType === 3) return {$tag: 1, _0: node};
  #|  return {$tag: 0};
  #|}

///|
pub extern "js" fn query_selector(selector : String) -> Element? =
  #|(s) => {
  #|  const el = document.querySelector(s);
  #|  if (el == null) return {$tag: 0};
  #|  return {$tag: 1, _0: el};
  #|}

///|
extern "js" fn props_get_int_js(props : Props, key : String) -> Int? =
  #|(props, key) => {
  #|  const v = props[key];
  #|  if (v == null) return undefined;
  #|  return v;
  #|}

///|
extern "js" fn props_get_string_js(props : Props, key : String) -> String? =
  #|(props, key) => {
  #|  const v = props[key];
  #|  if (v == null) return undefined;
  #|  return String(v);
  #|}

///|
extern "js" fn props_get_bool_js(props : Props, key : String) -> Bool? =
  #|(props, key) => {
  #|  const v = props[key];
  #|  if (v == null) return undefined;
  #|  return Boolean(v);
  #|}

///|
pub fn Props::get_int(self : Props, key : String, default? : Int = 0) -> Int {
  match props_get_int_js(self, key) {
    Some(v) => v
    None => default
  }
}

///|
pub fn Props::get_string(
  self : Props,
  key : String,
  default? : String = "",
) -> String {
  match props_get_string_js(self, key) {
    Some(v) => v
    None => default
  }
}

///|
pub fn Props::get_bool(
  self : Props,
  key : String,
  default? : Bool = false,
) -> Bool {
  match props_get_bool_js(self, key) {
    Some(v) => v
    None => default
  }
}
