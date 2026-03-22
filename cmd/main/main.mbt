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
