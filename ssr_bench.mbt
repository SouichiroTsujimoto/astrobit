test "bench: render_to_html - simple element" (b : @bench.T) {
  let node = div("hello")
  b.bench(fn() { b.keep(render_to_html(node)) })
}

test "bench: render_to_html - nested tree (depth 5)" (b : @bench.T) {
  let node = div(
    [
      h1("Title"),
      div(
        [
          p("paragraph 1"),
          p("paragraph 2"),
          div([span("inner 1"), span("inner 2"), span("inner 3")]),
        ],
      ),
      ul(
        [
          li("item 1"),
          li("item 2"),
          li("item 3"),
          li("item 4"),
          li("item 5"),
        ],
      ),
    ],
  )
  b.bench(fn() { b.keep(render_to_html(node)) })
}

test "bench: render_to_html - wide list (100 items)" (b : @bench.T) {
  let items : Array[Node] = Array::new(capacity=100)
  for i = 0; i < 100; i = i + 1 {
    items.push(li("item " + i.to_string()))
  }
  let node = ul(items)
  b.bench(fn() { b.keep(render_to_html(node)) })
}

test "bench: render_to_html - attributes" (b : @bench.T) {
  let node = div(
    attrs={"class": "container mx-auto", "id": "main", "data-value": "42"},
    [
      a(attrs={"href": "/about", "class": "link"}, "About"),
      img(attrs={"src": "/img.png", "alt": "photo", "width": "200"}),
      input(
        attrs={
          "type": "text",
          "name": "q",
          "placeholder": "Search...",
          "class": "input",
        },
      ),
    ],
  )
  b.bench(fn() { b.keep(render_to_html(node)) })
}

test "bench: render_to_html - html escape" (b : @bench.T) {
  let node = div(
    [
      p("<script>alert('xss')</script>"),
      p("Tom & Jerry"),
      p("a < b > c & d \"e\" f'g'"),
    ],
  )
  b.bench(fn() { b.keep(render_to_html(node)) })
}

test "bench: render_to_html - counter component" (b : @bench.T) {
  let count = @signals.signal(0)
  let node = div(
    [
      p(dyn_text(fn() { "Count: " + count.get().to_string() })),
      button("-") |> on_click(fn(_) { count.update(fn(n) { n - 1 }) }),
      button("+") |> on_click(fn(_) { count.update(fn(n) { n + 1 }) }),
    ],
  )
  b.bench(fn() { b.keep(render_to_html(node)) })
}

test "bench: render_to_html - large page" (b : @bench.T) {
  let rows : Array[Node] = Array::new(capacity=50)
  for i = 0; i < 50; i = i + 1 {
    rows.push(
      div(
        attrs={"class": "row"},
        [
          span(attrs={"class": "col"}, "Name " + i.to_string()),
          span(attrs={"class": "col"}, "Value " + (i * 10).to_string()),
          button(attrs={"class": "btn"}, "Edit"),
        ],
      ),
    )
  }
  let node = div(
    attrs={"class": "app"},
    [
      header(attrs={"class": "header"}, [h1("Dashboard"), nav([a("Home"), a("Settings")])]),
      main_tag(attrs={"class": "main"}, rows),
      footer(attrs={"class": "footer"}, [p("© 2025")]),
    ],
  )
  b.bench(fn() { b.keep(render_to_html(node)) })
}
