// Blackbox tests run against the package's public API. Use `@astrobit` to import.
// Prefer high-level behaviors over implementation details.
// Run `moon test` to execute and `moon test --update` to refresh snapshots.

///|
test "render simple element" {
  let node : Node = Element("div", {}, [Text("hello")])
  assert_eq(render_to_html(node), "<div>hello</div>")
}
