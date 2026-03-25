# astrobit

A thin framework for running [MoonBit](https://www.moonbitlang.com/) components as [Astro](https://astro.build/) islands.

Write your UI logic in MoonBit, use it directly in `.astro` files — SSR and client-side hydration included.

## Requirements

- [Astro](https://astro.build/) 6+

> [!NOTE]
> The [MoonBit toolchain](https://www.moonbitlang.com/download/) (`moon` CLI) is required, but `astrobit build` will install it automatically if not found.

## Installation

```sh
npm install astrobit
// or
yarn add astrobit
```

Add the integration to your `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import astrobit from 'astrobit' // here

export default defineConfig({
  integrations: [
    astrobit() // and here
  ],
})
```

## Project Setup

Place a `moon.mod.json` at the **root** of your Astro project:

```json
{
  "name": "yourname/your-project",
  "deps": {
    "SouichiroTsujimoto/astrobit": "0.1.4",
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
import {
  "SouichiroTsujimoto/astrobit" @a,
  "SouichiroTsujimoto/astrobit/dom",
  "mizchi/signals",
}

options(
  link: { "js": { "exports": [ "mount", "render", "hydrate" ], "format": "esm" } },
)
```

**`src/components/counter/counter.mbt`**
```moonbit
fn counter(props : @dom.Props) -> @a.Node {
  let initial = props.get_int("initial")
  let count = @signals.signal(initial)
  @a.div([
    @a.p(@a.dyn_text(fn() { "Count: " + count.get().to_string() })),
    @a.button("-") |> @a.on_click(fn(_) { count.update(fn(n) { n - 1 }) }),
    @a.button("+") |> @a.on_click(fn(_) { count.update(fn(n) { n + 1 }) }),
  ])
}

pub fn mount(element : @dom.Element, props : @dom.Props) -> Unit {
  @a.mount_dom(element, counter(props))
}

pub fn render(props : @dom.Props) -> String {
  @a.render_to_html(counter(props))
}

pub fn hydrate(element : @dom.Element, props : @dom.Props) -> Unit {
  @a.hydrate_dom(element, counter(props))
}
```

Props are received as `@dom.Props` and extracted with typed accessors:

```moonbit
props.get_int("key")               // Int (default: 0)
props.get_string("key")            // String (default: "")
props.get_bool("key")              // Bool (default: false)

props.get_int("key", default=10)   // with explicit default
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

TypeScript types for `*.mbt` imports are injected automatically — no manual `env.d.ts` setup required.

## Build

Add `astrobit build` as your build script in `package.json`:

```json
{
  "scripts": {
    "build": "astrobit build"
  }
}
```

`astrobit build` installs the `moon` CLI automatically if it's not available, then runs `moon build` followed by `astro build`. No manual toolchain setup is required for deployment (e.g. Vercel).

For local development, build the MoonBit sources first:

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
