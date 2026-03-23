# astrobit

A thin framework for running [MoonBit](https://www.moonbitlang.com/) components as [Astro](https://astro.build/) islands.

Write your UI logic in MoonBit, use it directly in `.astro` files — SSR and client-side hydration included.

## Requirements

- [Astro](https://astro.build/) 6+
- [MoonBit toolchain](https://www.moonbitlang.com/download/) (`moon` CLI)

## Installation

```sh
npm install astrobit
```

Add the integration to your `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import astrobit from 'astrobit'

export default defineConfig({
  integrations: [astrobit()],
})
```

## Project Setup

Place a `moon.mod.json` at the root of your Astro project:

```json
{
  "name": "yourname/your-project",
  "deps": {
    "SouichiroTsujimoto/astrobit": "0.1.0",
    "mizchi/signals": "0.6.4"
  },
  "preferred-target": "js"
}
```

Then install the MoonBit dependencies:

```sh
moon install
```

## Writing a Component

Each component lives in its own directory with a `moon.pkg` file.

**`src/components/counter/moon.pkg`**
```json
{
  "import": [
    "SouichiroTsujimoto/astrobit",
    "SouichiroTsujimoto/astrobit/dom",
    "mizchi/signals"
  ]
}
```

**`src/components/counter/counter.mbt`**
```moonbit
fn counter(initial : Int) -> @a.Node {
  let count = @signals.signal(initial)
  @a.div([
    @a.p(@a.dyn_text(fn() { "Count: " + count.get().to_string() })),
    @a.button("-") |> @a.on_click(fn(_) { count.update(fn(n) { n - 1 }) }),
    @a.button("+") |> @a.on_click(fn(_) { count.update(fn(n) { n + 1 }) }),
  ])
}

pub fn mount(element : @dom.Element, initial : Int) -> Unit {
  @a.mount_dom(element, counter(initial))
}

pub fn render(initial : Int) -> String {
  @a.render_to_html(counter(initial))
}

pub fn hydrate(element : @dom.Element, initial : Int) -> Unit {
  @a.hydrate_dom(element, counter(initial))
}
```

## Using in Astro

Import the `.mbt` file directly. The Vite plugin handles the rest.

```astro
---
import Counter from '../components/counter/counter.mbt'
---

<!-- client:only — mount on the client, no SSR -->
<Counter client:only="astrobit" initial={0} />

<!-- client:load — SSR + hydration -->
<Counter client:load initial={0} />
```

## Build

Before running the dev server, build the MoonBit sources:

```sh
moon build
```

Then start Astro:

```sh
npm run dev
```

HMR is supported — saving a `.mbt` file triggers an automatic rebuild and page reload.

## How It Works

- **SSR**: `render(props)` returns an HTML string, rendered server-side by Astro.
- **Hydration** (`client:load`): `hydrate(element, props)` attaches signals and event listeners to the existing DOM without re-rendering.
- **Mount** (`client:only`): `mount(element, props)` builds the DOM from scratch on the client.
- **Reactivity**: Powered by [`mizchi/signals`](https://mooncakes.io/docs/#/mizchi/signals/).

## License

MIT
