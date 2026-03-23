// Main package file for your library code.
// Put public APIs and shared helpers here.
// Keep blocks small and focused for easy refactors.

///|
pub(all) enum Node {
  Element(String, Map[String, String], Array[Node])
  Text(String)
  Empty
  RawHtml(String)
  DynText(() -> String)
  Dynamic(() -> Node)
  WithEvents(Node, Array[(String, (@dom.Event) -> Unit)])
  WithDynAttrs(Node, Array[(String, () -> String?)])
}

///|
pub(open) trait ToArrayNode {
  to_array_node(Self) -> Array[Node]
}

///|
pub impl ToArrayNode for String with to_array_node(self) {
  [Text(self)]
}

///|
pub impl ToArrayNode for Node with to_array_node(self) {
  [self]
}

///|
pub impl ToArrayNode for Array[Node] with to_array_node(self) {
  self
}

///|
pub fn render_to_html(node : Node) -> String {
  match node {
    Element(tag, attrs, children) => {
      let attr_str = render_attrs(attrs)
      let children_str = children
        .map(render_to_html)
        .fold(init="", fn(acc, s) { acc + s })
      if is_void_element(tag) {
        "<" + tag + attr_str + "/>"
      } else {
        "<" + tag + attr_str + ">" + children_str + "</" + tag + ">"
      }
    }
    Text(s) => escape_html(s)
    Empty => ""
    RawHtml(html) => "<span>" + html + "</span>"
    DynText(f) => escape_html(f())
    Dynamic(f) => "<!--dynamic--><span>" + render_to_html(f()) + "</span>"
    WithEvents(inner, _) => render_to_html(inner)
    WithDynAttrs(inner, dyn_a) =>
      match inner {
        Element(tag, attrs, children) => {
          let merged = attrs.copy()
          for pair in dyn_a {
            match (pair.1)() {
              Some(v) => merged[pair.0] = v
              None => ()
            }
          }
          render_to_html(Element(tag, merged, children))
        }
        _ => render_to_html(inner)
      }
  }
}

///|
fn render_attrs(attrs : Map[String, String]) -> String {
  let mut r = ""
  attrs.each(fn(key, value) {
    if value == "" {
      r = r + " " + escape_html(key)
    } else {
      r = r + " " + escape_html(key) + "=\"" + escape_html(value) + "\""
    }
  })
  r
}

///|
fn escape_html(s : String) -> String {
  let mut r = ""
  for c in s {
    match c {
      '&' => r = r + "&amp;"
      '<' => r = r + "&lt;"
      '>' => r = r + "&gt;"
      '"' => r = r + "&quot;"
      '\'' => r = r + "&#x27;"
      _ => r = r + c.to_string()
    }
  }
  r
}

///|
fn is_void_element(tag : String) -> Bool {
  match tag {
    "area"
    | "base"
    | "br"
    | "col"
    | "embed"
    | "hr"
    | "img"
    | "input"
    | "link"
    | "meta"
    | "source"
    | "track"
    | "wbr" => true
    _ => false
  }
}

///|
pub fn[C : ToArrayNode] tag(
  tag : String,
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  Element(tag, attrs, children.to_array_node())
}

///|
pub fn[C : ToArrayNode] head(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("head", attrs~, children)
}

///|
pub fn[C : ToArrayNode] body(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("body", attrs~, children)
}

///|
pub fn[C : ToArrayNode] html(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("html", attrs~, children)
}

///|
pub fn[C : ToArrayNode] title(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("title", attrs~, children)
}

///|
pub fn[C : ToArrayNode] meta(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("meta", attrs~, children)
}

///|
pub fn[C : ToArrayNode] div(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("div", attrs~, children)
}

///|
pub fn[C : ToArrayNode] h1(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("h1", attrs~, children)
}

///|
pub fn[C : ToArrayNode] h2(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("h2", attrs~, children)
}

///|
pub fn[C : ToArrayNode] h3(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("h3", attrs~, children)
}

///|
pub fn[C : ToArrayNode] h4(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("h4", attrs~, children)
}

///|
pub fn[C : ToArrayNode] h5(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("h5", attrs~, children)
}

///|
pub fn[C : ToArrayNode] p(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("p", attrs~, children)
}

///|
pub fn[C : ToArrayNode] a(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("a", attrs~, children)
}

///|
pub fn[C : ToArrayNode] ul(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("ul", attrs~, children)
}

///|
pub fn[C : ToArrayNode] ol(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("ol", attrs~, children)
}

///|
pub fn[C : ToArrayNode] li(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("li", attrs~, children)
}

///|
pub fn[C : ToArrayNode] form(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("form", attrs~, children)
}

///|
pub fn input(attrs? : Map[String, String] = {}) -> Node {
  tag("input", attrs~, "")
}

///|
pub fn[C : ToArrayNode] button(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("button", attrs~, children)
}

///|
pub fn[C : ToArrayNode] label(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("label", attrs~, children)
}

///|
pub fn[C : ToArrayNode] select(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("select", attrs~, children)
}

///|
pub fn[C : ToArrayNode] option(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("option", attrs~, children)
}

///|
pub fn[C : ToArrayNode] span(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("span", attrs~, children)
}

///|
pub fn hr(attrs? : Map[String, String] = {}) -> Node {
  tag("hr", attrs~, "")
}

///|
pub fn br(attrs? : Map[String, String] = {}) -> Node {
  tag("br", attrs~, "")
}

///|
pub fn img(attrs? : Map[String, String] = {}) -> Node {
  tag("img", attrs~, "")
}

///|
pub fn[C : ToArrayNode] nav(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("nav", attrs~, children)
}

///|
pub fn[C : ToArrayNode] header(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("header", attrs~, children)
}

///|
pub fn[C : ToArrayNode] footer(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("footer", attrs~, children)
}

///|
pub fn[C : ToArrayNode] main_tag(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("main", attrs~, children)
}

///|
pub fn[C : ToArrayNode] section(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("section", attrs~, children)
}

///|
pub fn[C : ToArrayNode] article(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("article", attrs~, children)
}

///|
pub fn[C : ToArrayNode] code(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("code", attrs~, children)
}

///|
pub fn[C : ToArrayNode] textarea(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("textarea", attrs~, children)
}

///|
pub fn[C : ToArrayNode] pre(
  attrs? : Map[String, String] = {},
  children : C,
) -> Node {
  tag("pre", attrs~, children)
}

///|
pub fn dyn_text(f : () -> String) -> Node {
  DynText(f)
}

///|
pub fn dyn(f : () -> Node) -> Node {
  Dynamic(f)
}

///|
pub fn raw_html(s : String) -> Node {
  RawHtml(s)
}

///|
pub fn on(node : Node, event : String, handler : (@dom.Event) -> Unit) -> Node {
  WithEvents(node, [(event, handler)])
}

///|
pub fn on_click(node : Node, handler : (@dom.Event) -> Unit) -> Node {
  on(node, "click", handler)
}

///|
pub fn on_input(node : Node, handler : (@dom.Event) -> Unit) -> Node {
  on(node, "input", handler)
}

///|
pub fn on_submit(node : Node, handler : (@dom.Event) -> Unit) -> Node {
  on(node, "submit", handler)
}

///|
pub fn dyn_attr(node : Node, name : String, f : () -> String) -> Node {
  WithDynAttrs(node, [(name, fn() { Some(f()) })])
}

///|
pub fn hydrate_dom(parent : @dom.Element, node : Node) -> Unit {
  let _ = hydrate_node(parent, node, 0)
}

///|
/// childNodes[index] から始まる Node を hydrate し、次の index を返す。
fn hydrate_node(parent : @dom.Element, node : Node, index : Int) -> Int {
  match node {
    Element(_, _, children) =>
      match @dom.nth_child_element(parent, index) {
        Some(el) => {
          let mut ci = 0
          for child in children {
            ci = hydrate_node(el, child, ci)
          }
          index + 1
        }
        None => index + 1
      }
    Text(_) => index + 1
    Empty => index
    RawHtml(_) => index + 1 // <span> から始まる 1 ノード
    DynText(f) =>
      match @dom.nth_child_text(parent, index) {
        Some(tn) => {
          let _ = @signals.render_effect(fn() { @dom.set_node_text(tn, f()) })
          index + 1
        }
        None => index + 1
      }
    Dynamic(f) => {
      // childNodes[index]   = <!--dynamic--> (comment)
      // childNodes[index+1] = <span>         (content wrapper)
      match @dom.nth_child_element(parent, index + 1) {
        Some(span) => {
          let _ = @signals.render_effect(fn() {
            @dom.set_inner_html(span, "")
            mount_dom(span, f())
          })
        }
        None => ()
      }
      index + 2
    }
    WithEvents(inner, events) => {
      let next = hydrate_node(parent, inner, index)
      match @dom.nth_child_element(parent, index) {
        Some(el) =>
          for pair in events {
            @dom.add_event_listener(el, pair.0, pair.1)
          }
        None => ()
      }
      next
    }
    WithDynAttrs(inner, dyn_attrs) => {
      let next = hydrate_node(parent, inner, index)
      match @dom.nth_child_element(parent, index) {
        Some(el) =>
          for pair in dyn_attrs {
            let _ = @signals.render_effect(fn() {
              match (pair.1)() {
                Some(v) => @dom.set_attribute(el, pair.0, v)
                None => @dom.remove_attribute(el, pair.0)
              }
            })
          }
        None => ()
      }
      next
    }
  }
}

///|
pub fn dyn_bool_attr(node : Node, name : String, f : () -> Bool) -> Node {
  WithDynAttrs(node, [(name, fn() { if f() { Some("") } else { None } })])
}

///|
pub fn mount_dom(parent : @dom.Element, node : Node) -> Unit {
  match node {
    Element(tag, attrs, children) => {
      let el = @dom.create_element(tag)
      attrs.each(fn(k, v) { @dom.set_attribute(el, k, v) })
      for child in children {
        mount_dom(el, child)
      }
      @dom.append_child(parent, el)
    }
    Text(s) => @dom.append_child_node(parent, @dom.create_text_node(s))
    RawHtml(html) => {
      let wrapper = @dom.create_element("span")
      @dom.set_inner_html(wrapper, html)
      @dom.append_child(parent, wrapper)
    }
    Empty => ()
    DynText(f) => {
      let t = @dom.create_text_node(f())
      @dom.append_child_node(parent, t)
      let _ = @signals.render_effect(fn() { @dom.set_node_text(t, f()) })
    }
    Dynamic(f) => {
      let marker = @dom.create_comment("dynamic")
      @dom.append_child_comment(parent, marker)
      let mut current : @dom.Element? = None
      let _ = @signals.render_effect(fn() {
        match current {
          Some(el) => {
            @dom.remove_child(parent, el)
            current = None
          }
          None => ()
        }
        let wrapper = @dom.create_element("span")
        mount_dom(wrapper, f())
        @dom.insert_after(parent, wrapper, marker)
        current = Some(wrapper)
      })
    }
    WithEvents(inner, events) => {
      mount_dom(parent, inner)
      let el = @dom.last_child(parent)
      for pair in events {
        @dom.add_event_listener(el, pair.0, pair.1)
      }
    }
    WithDynAttrs(inner, dyn_attrs) => {
      mount_dom(parent, inner)
      let el = @dom.last_child(parent)
      for pair in dyn_attrs {
        let _ = @signals.render_effect(fn() {
          match (pair.1)() {
            Some(v) => @dom.set_attribute(el, pair.0, v)
            None => @dom.remove_attribute(el, pair.0)
          }
        })
      }
    }
  }
}
