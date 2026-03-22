///|
pub fn counter(init : Int) -> @a.Node {
  let count = @signals.signal(init)
  @a.div(attrs={ "class": "counter" }, [
    @a.p(@a.dyn_text(fn() { "Count" + count.get().to_string() })),
    @a.button("-") |> @a.on_click(fn(_) { count.update(fn(n) { n - 1 }) }),
    @a.button("+") |> @a.on_click(fn(_) { count.update(fn(n) { n + 1 }) }),
  ])
}

// ///|
// fn main {
//   match @dom.query_selector("#app") {
//     Some(el) => {
//       let node = counter(0)
//       @a.mount_dom(el, node)
//     }
//     None => ()
//   }
// }

///|
pub fn mount(element : @dom.Element, init : Int) -> Unit {
  @a.mount_dom(element, counter(init))
}

///|
pub fn render(init : Int) -> String {
  @a.render_to_html(counter(init))
}

///|
pub fn hydrate(element : @dom.Element, init : Int) -> Unit {
  @a.hydrate_dom(element, counter(init))
}

fn greeting(name : String) -> @a.Node {
  let open = @signals.signal(false)
  @a.div(attrs={ "class": "greeting" }, [
    @a.p(attrs={ "class": "greeting-title" }, "Hello, " + name + "!"),
    @a.button(@a.dyn_text(fn() { if open.get() { "Hide" } else { "Show more" } }))
      |> @a.on_click(fn(_) { open.update(fn(b) { !b }) }),
    @a.dyn(fn() {
      if open.get() {
        @a.p("This paragraph appears after clicking — client-side only.")
      } else {
        @a.Empty
      }
    }),
  ])
}

///|
pub fn mount_greeting(element : @dom.Element, name : String) -> Unit {
  @a.mount_dom(element, greeting(name))
}

///|
pub fn render_greeting(name : String) -> String {
  @a.render_to_html(greeting(name))
}

///|
pub fn hydrate_greeting(element : @dom.Element, name : String) -> Unit {
  @a.hydrate_dom(element, greeting(name))
}
