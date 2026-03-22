# astrobit: 設計プラン v2

MoonBitで書いたインタラクティブなコンポーネントを、Astroのislandとして動かすための薄いフレームワーク。

---

## 設計原則

- **MoonBit-first**: コンポーネントのロジックとUI定義はすべてMoonBit
- **薄いグルーコード**: Astroとの接点はJS/TSで書く最小限のアダプタ層
- **1つの定義から2つの出力**: 同じコンポーネント関数からSSR(HTML文字列)とクライアント(DOM操作)の両方を生成
- **Signal系リアクティビティ**: `mizchi/signals`を活用（自前実装しない）
- **最小限のFFI**: DOM操作に必要な約16個のFFI関数だけ自前で書く
- **デフォルト安全**: テキストは自動エスケープ、生HTMLは明示的APIのみ

---

## 依存関係

```json
// moon.mod.json
{
  "name": "SouichiroTsujimoto/astrobit",
  "version": "0.1.0",
  "deps": {
    "mizchi/signals": "0.6.4"
  },
  "preferred-target": "js"
}
```

- `mizchi/signals` — signal, memo, render_effect, batch, on_cleanup, create_root, untracked
- DOM FFI — 自前で最小限を実装（16関数）
- `mizchi/js` — 使わない（必要になれば後から合流可能）

---

## アーキテクチャ全体像

```
┌──────────────────────────────────────────────┐
│  .astro ファイル                              │
│  <Counter client:only="astrobit" />          │
│  <Counter client:load initial={5} />  (SSR)  │
└──────────────┬───────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  Astro Integration  │  astrobit/integration.ts
    │  addRenderer()      │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Glue Layer (JS/TS) │
    │  server.ts → check / renderToStaticMarkup
    │  client.ts → mount
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Counter.ts         │  __moonbit マーカー + mount()
    │  (components/)      │  MoonBitビルド成果物を呼び出す
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  MoonBit Component  │
    │  fn counter() -> Node を定義
    │  ├── render_to_html(node) → String  (SSR, Phase 2)
    │  └── mount_dom(el, node)            (クライアント)
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  mizchi/signals      │  signal, memo, render_effect, batch ...
    └──────────────────────┘
```

---

## コア型定義

### Node（VNode: DOMの設計図）

```moonbit
// 実装済み（astrobit.mbt）
pub(all) enum Node {
  /// <tag attrs...>children...</tag>
  Element(String, Map[String, String], Array[Node])

  /// 静的テキスト（自動エスケープされる）
  Text(String)

  /// 空
  Empty

  /// 生HTML（エスケープしない）— dangerouslySetInnerHTML相当
  RawHtml(String)

  /// signal連動テキスト（自動エスケープされる）— TextNodeのin-place更新でSSR構造と一致
  DynText(() -> String)

  /// signalに連動する動的なNode（spanでラップ）
  Dynamic(() -> Node)

  /// イベントハンドラ付きNode（SSR時は無視される）
  WithEvents(Node, Array[(String, (@dom.Event) -> Unit)])

  /// 動的属性付きNode（String? = None で属性削除）
  WithDynAttrs(Node, Array[(String, () -> String?)])
}
```

**設計ポイント:**
- `Show`/`ForEach` は削除。`Dynamic` 内でMoonBitネイティブな `if`/`.map()` を使う
- `WithDynBoolAttrs` は削除。`WithDynAttrs` の `String?` で統合（`None` = 属性削除）
- `Dynamic` は `span` でラップして DOM 構造を安定させる
- `DynText` は TextNode の in-place 更新（SSR/クライアントで構造一致 → Phase 2 hydration に必須）

### ToArrayNode trait — 単一Nodeでも配列でも子要素として渡せる

```moonbit
pub(open) trait ToArrayNode {
  to_array_node(Self) -> Array[Node]
}

pub impl ToArrayNode for Array[Node] with to_array_node(self) { self }
pub impl ToArrayNode for Node with to_array_node(self) { [self] }
pub impl ToArrayNode for String with to_array_node(self) { [Text(self)] }
```

**注意:** 外部パッケージから可視にするには `pub impl`（`impl` だと外部から見えない）

---

## ショートハンド関数

`attrs` はオプショナル引数（デフォルト `{}`）にして省略可能にする。
汎用フォールバックは `tag()`。

```moonbit
pub fn[C : ToArrayNode] tag(tag : String, attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] div(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] p(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] span(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] button(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] a(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] form(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] label(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] ul(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] li(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] select(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] option(attrs? : Map[String, String], children : C) -> Node
pub fn[C : ToArrayNode] input(attrs? : Map[String, String], _ : C) -> Node   // void element
pub fn[C : ToArrayNode] img(attrs? : Map[String, String], _ : C) -> Node     // void element
pub fn[C : ToArrayNode] br(attrs? : Map[String, String], _ : C) -> Node      // void element
pub fn[C : ToArrayNode] hr(attrs? : Map[String, String], _ : C) -> Node      // void element
pub fn[C : ToArrayNode] main_tag(attrs? : Map[String, String], children : C) -> Node  // main は予約語
// ... h1〜h6, nav, header, footer, section, article, etc.
```

### テキスト・動的ノード系

```moonbit
/// 動的テキスト（signalに連動、エスケープされる）
pub fn dyn_text(f : () -> String) -> Node { DynText(f) }

/// 動的Node（signalに連動、spanでラップ）
pub fn dyn(f : () -> Node) -> Node { Dynamic(f) }

/// 生HTML（エスケープしない）
pub fn raw_html(html : String) -> Node { RawHtml(html) }
```

### イベント・動的属性の付与

```moonbit
pub fn on(node : Node, event : String, handler : (@dom.Event) -> Unit) -> Node
pub fn on_click(node : Node, handler : (@dom.Event) -> Unit) -> Node
pub fn on_input(node : Node, handler : (@dom.Event) -> Unit) -> Node
pub fn on_submit(node : Node, handler : (@dom.Event) -> Unit) -> Node

/// 動的属性を付与（String = 値をセット）
pub fn dyn_attr(node : Node, name : String, f : () -> String) -> Node {
  WithDynAttrs(node, [(name, fn() { Some(f()) })])
}

/// 動的bool属性を付与（true = 空文字セット、false = 属性削除）
pub fn dyn_bool_attr(node : Node, name : String, f : () -> Bool) -> Node {
  WithDynAttrs(node, [(name, fn() { if f() { Some("") } else { None } })])
}
```

---

## コンポーネントの記述例

### カウンター（実装済み）

```moonbit
// cmd/main/main.mbt
pub fn counter(init : Int) -> @a.Node {
  let count = @signals.signal(init)
  @a.div(attrs={"class": "counter"}, [
    @a.p(@a.dyn_text(fn() { "Count: " + count.get().to_string() })),
    @a.button("-") |> @a.on_click(fn(_) { count.update(fn(n) { n - 1 }) }),
    @a.button("+") |> @a.on_click(fn(_) { count.update(fn(n) { n + 1 }) }),
  ])
}

pub fn mount(element : @dom.Element, initial : Int) -> Unit {
  @a.mount_dom(element, counter(initial))
}
```

**規約:** メインライブラリは `@a` エイリアスで import（`@astrobit` は長いため）

```
// moon.pkg
import {
  "SouichiroTsujimoto/astrobit" @a,
  "SouichiroTsujimoto/astrobit/dom",
  "mizchi/signals",
}
```

### 条件付き表示・リスト（Dynamicを使う）

```moonbit
// Show相当: Dynamic内でif式
@a.dyn(fn() {
  if error.get().length() > 0 {
    @a.p(attrs={"class": "error"}, @a.dyn_text(fn() { error.get() }))
  } else {
    @a.Empty
  }
})

// ForEach相当: Dynamic内で.map()
@a.dyn(fn() {
  @a.div(items.get().map(fn(item) {
    @a.li(item.name)
  }))
})
```

---

## SSR: render_to_html（Node → HTML文字列）

pure MoonBitで実装。FFI不要。

```moonbit
pub fn render_to_html(node : Node) -> String {
  match node {
    Element(tag, attrs, children) => {
      let attr_str = render_attrs(attrs)
      let children_str = children.map(render_to_html)
        .fold(init="", fn(acc, s) { acc + s })
      if is_void_element(tag) {
        "<" + tag + attr_str + "/>"
      } else {
        "<" + tag + attr_str + ">" + children_str + "</" + tag + ">"
      }
    }
    Text(s) => escape_html(s)
    DynText(f) => escape_html(f())
    RawHtml(html) => html
    Dynamic(f) => render_to_html(f())
    WithEvents(inner, _) => render_to_html(inner)  // イベントは無視
    WithDynAttrs(inner, dyn_attrs) => {
      match inner {
        Element(tag, attrs, children) => {
          let merged = attrs.copy()
          for pair in dyn_attrs {
            match pair.1() {
              Some(v) => merged[pair.0] = v
              None => ()
            }
          }
          render_to_html(Element(tag, merged, children))
        }
        _ => render_to_html(inner)
      }
    }
    Empty => ""
  }
}
```

---

## クライアント: mount_dom（Node → 実DOM操作）

```moonbit
pub fn mount_dom(parent : @dom.Element, node : Node) -> Unit {
  match node {
    Element(tag, attrs, children) => {
      let el = @dom.create_element(tag)
      attrs.each(fn(k, v) { @dom.set_attribute(el, k, v) })
      for child in children { mount_dom(el, child) }
      @dom.append_child(parent, el)
    }
    Text(s) => {
      @dom.append_child_node(parent, @dom.create_text_node(s))
    }
    DynText(f) => {
      let tn = @dom.create_text_node(f())
      @dom.append_child_node(parent, tn)
      let _ = @signals.render_effect(fn() { @dom.set_node_text(tn, f()) })
    }
    RawHtml(html) => {
      let wrapper = @dom.create_element("span")
      @dom.set_inner_html(wrapper, html)
      @dom.append_child(parent, wrapper)
    }
    Dynamic(f) => {
      let marker = @dom.create_comment("dynamic")
      @dom.append_child_comment(parent, marker)
      let mut current : @dom.Element? = None
      let _ = @signals.render_effect(fn() {
        match current {
          Some(el) => { @dom.remove_child(parent, el); current = None }
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
          match pair.1() {
            Some(v) => @dom.set_attribute(el, pair.0, v)
            None => @dom.remove_attribute(el, pair.0)
          }
        })
      }
    }
    Empty => ()
  }
}
```

**ポイント:**
- `Dynamic` は `comment` マーカーを anchor として `insert_after` で DOM を更新
- `render_effect` 内で前の要素を `remove_child` してから新しい要素を挿入
- `WithDynAttrs` の `render_effect` 内で `pair.1()` を毎回再評価（キャプチャしない）
- `append_child_comment` は Comment 型用の専用 FFI（TextNode 用の `append_child_node` とは別）

---

## DOM FFI（dom/ パッケージ）

```moonbit
// dom/types.mbt — jsターゲット専用
#external
pub type Element
#external
pub type TextNode
#external
pub type Comment
#external
pub type Event

// dom/ffi.mbt — jsターゲット専用

// --- 要素の生成 ---
pub extern "js" fn create_element(tag : String) -> Element =
  #|(tag) => document.createElement(tag)
pub extern "js" fn create_text_node(text : String) -> TextNode =
  #|(t) => document.createTextNode(t)
pub extern "js" fn create_comment(text : String) -> Comment =
  #|(t) => document.createComment(t)

// --- ツリー操作 ---
pub extern "js" fn append_child(parent : Element, child : Element) -> Unit =
  #|(p, c) => p.appendChild(c)
pub extern "js" fn append_child_node(parent : Element, child : TextNode) -> Unit =
  #|(p, c) => p.appendChild(c)
pub extern "js" fn append_child_comment(parent : Element, child : Comment) -> Unit =
  #|(p, c) => p.appendChild(c)
pub extern "js" fn remove_child(parent : Element, child : Element) -> Unit =
  #|(p, c) => p.removeChild(c)
pub extern "js" fn insert_after(parent : Element, node : Element, ref_ : Comment) -> Unit =
  #|(p, n, r) => r.after(n)
pub extern "js" fn last_child(parent : Element) -> Element =
  #|(p) => p.lastElementChild

// --- 属性 ---
pub extern "js" fn set_attribute(el : Element, name : String, value : String) -> Unit =
  #|(el, n, v) => el.setAttribute(n, v)
pub extern "js" fn remove_attribute(el : Element, name : String) -> Unit =
  #|(el, n) => el.removeAttribute(n)

// --- テキスト ---
pub extern "js" fn set_node_text(node : TextNode, text : String) -> Unit =
  #|(n, t) => { n.textContent = t; }
pub extern "js" fn set_inner_html(el : Element, html : String) -> Unit =
  #|(el, h) => { el.innerHTML = h; }

// --- イベント ---
pub extern "js" fn add_event_listener(el : Element, event : String, f : (Event) -> Unit) -> Unit =
  #|(el, ev, f) => el.addEventListener(ev, f)
pub extern "js" fn prevent_default(e : Event) -> Unit =
  #|(e) => e.preventDefault()
pub extern "js" fn target_value(e : Event) -> String =
  #|(e) => e.target.value

// --- クエリ ---
pub extern "js" fn query_selector(selector : String) -> Element? =
  #|(s) => {
    const el = document.querySelector(s);
    if (el === null) return {$tag: 0};
    return {$tag: 1, _0: el};
  }
```

合計: **16個のFFI関数** + 4個の外部型

**注意:** MoonBitの `Option` 型はJS側では `{$tag: 0}` (None) / `{$tag: 1, _0: v}` (Some) で表現される

**jsターゲット限定設定（dom/moon.pkg.json）:**
```json
{
  "targets": {
    "ffi.mbt": ["js"],
    "types.mbt": ["js"]
  }
}
```

---

## Astro Integration（JS/TSグルーコード）

### integration/integration.ts（実装済み）

```ts
import type { AstroIntegration } from 'astro'

export default function astroMoonbit(): AstroIntegration {
  return {
    name: 'astrobit',
    hooks: {
      'astro:config:setup': ({ addRenderer }) => {
        addRenderer({
          name: 'astrobit',
          clientEntrypoint: new URL('./client.ts', import.meta.url).href,
          serverEntrypoint: new URL('./server.ts', import.meta.url).href,
        })
      }
    }
  }
}
```

### integration/server.ts（実装済み）

```ts
export default {
  name: 'astrobit',
  check(Component: any) {
    return Component?.__moonbit === true
  },
  async renderToStaticMarkup(Component: any, props: any) {
    return { html: Component.render?.(props) ?? '<div></div>' }
  }
}
```

### integration/client.ts（実装済み）

```ts
export default (element: HTMLElement) => {
  return async (Component: any, props: any) => {
    Component.mount(element, props)
  }
}
```

---

## コンポーネントのエクスポート規約（現在の実装パターン）

MoonBitビルド成果物を呼び出す **Counter.ts** を手動で記述するパターン:

```ts
// examples/basic/src/components/Counter.ts
import * as moonbit from '../../../../_build/js/debug/build/cmd/main/main.js'

function Counter() {}
Counter.__moonbit = true                                    // renderer識別マーカー
Counter.mount = function(element: HTMLElement, props: Record<string, any>) {
  moonbit.mount(element, props.initial ?? 0)              // MoonBit側のmount()を呼び出す
}

export default Counter
```

使用側 (.astro):
```astro
---
import Counter from '../components/Counter.ts'
---
<Counter client:only="astrobit" initial={10} />
```

**注意:** `client:only` の値は Integration の `name` と一致させる（`"astrobit"`）

---

## パッケージ構成（現在の実装）

```
astrobit/
├── moon.mod.json             # SouichiroTsujimoto/astrobit, preferred-target: js
├── moon.pkg                  # ルートパッケージ（import dom, signals）
├── astrobit.mbt              # Node enum, ToArrayNode, render_to_html, mount_dom, ショートハンド
├── astrobit_test.mbt         # テスト
│
├── dom/                      # DOM FFI パッケージ
│   ├── moon.pkg.json         # targets: ffi.mbt/types.mbt → ["js"]
│   ├── types.mbt             # Element, TextNode, Comment, Event（jsターゲット専用）
│   └── ffi.mbt               # 16個のDOM FFI関数（jsターゲット専用）
│
├── cmd/
│   └── main/
│       ├── moon.pkg          # import @a, dom, signals; link: {js: {exports: ["mount"], format: "esm"}}
│       └── main.mbt          # counter(), mount() — ESMエントリポイント
│
├── integration/              # Astro Integration（npm パッケージ "astrobit"）
│   ├── package.json          # name: "astrobit", main: "integration.ts"
│   ├── integration.ts        # addRenderer()
│   ├── server.ts             # check(), renderToStaticMarkup()
│   └── client.ts             # mount()
│
└── examples/
    └── basic/
        ├── package.json      # dependencies: astrobit: "file:../../integration"
        ├── astro.config.mjs  # integrations: [astroMoonbit()]
        └── src/
            ├── components/
            │   └── Counter.ts    # __moonbit マーカー + mount() グルーコード
            └── pages/
                └── index.astro  # <Counter client:only="astrobit" initial={10} />
```

### moon.pkg（ルート）

```
import {
  "SouichiroTsujimoto/astrobit/dom",
  "mizchi/signals",
}
```

### cmd/main/moon.pkg

```
import {
  "SouichiroTsujimoto/astrobit" @a,
  "SouichiroTsujimoto/astrobit/dom",
  "mizchi/signals",
}
options(
  link: {
    js: {
      exports: ["mount"],
      format: "esm",
    }
  }
)
```

---

## 実装状況・順序

### Phase 1: client:only で動くカウンター ✅ 完了

1. ✅ `Node` enum（8 variants）+ `ToArrayNode` trait — `astrobit.mbt`
2. ✅ `render_to_html`, `escape_html`, `is_void_element` — `astrobit.mbt`
3. ✅ ショートハンド関数（div, p, button, tag, h1-h6, nav, section...）— `astrobit.mbt`
4. ✅ `dom/ffi.mbt` — DOM FFI（Element, TextNode, Comment, Event + 16関数）
5. ✅ `Node` enum に DynText, RawHtml, Dynamic, WithEvents, WithDynAttrs を追加
6. ✅ `on`, `on_click`, `on_input`, `on_submit`, `dyn_text`, `dyn`, `dyn_attr`, `dyn_bool_attr` を追加
7. ✅ `mount_dom` の実装（全8 variants対応）
8. ✅ `integration/` — Astro Integration（addRenderer, server.ts, client.ts）
9. ✅ Counter が `<Counter client:only="astrobit" />` で動くことを確認

### Phase 2: DX改善（グルーコード削減）

現在の課題: Counter.ts のような手書きグルーコードが必要。3つのアプローチ案:

**Option A: コンポーネントをMoonBitプロジェクト内に配置（現在のパターンを整理）**
- `cmd/` 以下に各コンポーネントの moon.pkg + .mbt を配置
- `moon build` でビルドし、ビルド成果物を Counter.ts から参照
- グルーコード削減は限定的だが、理解しやすい

**Option B: Vite Plugin で自動ビルド**
- `astrobit` integration に Vite Plugin を追加
- `*.moonbit.ts` のような特殊拡張子を検出して `moon build` を自動実行
- Counter.ts のマーカーやビルドパス参照は引き続き必要

**Option C: .mbt ファイルを直接 import（仮想モジュール）**
- Vite Plugin の仮想モジュールで `.mbt` ファイルを直接 import 可能にする
- `import Counter from './Counter.mbt'` → Vite がビルドして JS モジュールとして提供
- 最も DX が高いが実装が複雑
- .astro ファイルから直接 `.mbt` を使える可能性

### Phase 3: SSR対応（hydration）

- `render_to_html` が既に実装済みのため、server.ts の `Component.render(props)` を接続する
- `<Counter client:load />` でSSR + hydrationが動くことを確認
- `hydrate_dom` の実装（既存DOMの再利用）— DynText の構造一致が活きる

### Phase 4: 拡充

- `core/` への分割（node.mbt, html.mbt, events.mbt, render.mbt, mount.mbt）
- ドキュメントとサンプルの整備
- テスト整備
