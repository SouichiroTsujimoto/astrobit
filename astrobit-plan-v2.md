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
│  <Greeting client:load name="MoonBit" /> (SSR) │
└──────────────┬───────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  Astro Integration  │  integration/integration.ts
    │  addRenderer()      │
    │  moonbitVitePlugin()│
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Vite Plugin        │  integration/vite-plugin.ts
    │  .mbt → グルーJS    │  virtual:moonbit: プレフィックス
    │  resolveId/load     │  .d.ts から関数シグネチャ解析
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Glue Layer (JS/TS) │
    │  server.ts → check / renderToStaticMarkup
    │  client.ts → hydrate / mount
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  MoonBit Component  │
    │  fn counter() -> Node を定義
    │  ├── render_to_html(node) → String  (SSR)
    │  ├── mount_dom(el, node)            (クライアント)
    │  └── hydrate_dom(el, node)          (hydration)
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
```

### ToArrayNode trait

```moonbit
pub(open) trait ToArrayNode {
  to_array_node(Self) -> Array[Node]
}
pub impl ToArrayNode for Array[Node] with to_array_node(self) { self }
pub impl ToArrayNode for Node with to_array_node(self) { [self] }
pub impl ToArrayNode for String with to_array_node(self) { [Text(self)] }
```

---

## パッケージ構成（現在）

```
astrobit/
├── moon.mod.json
├── moon.pkg
├── astrobit.mbt              # Node enum, render_to_html, mount_dom, hydrate_dom, ショートハンド
├── astrobit_test.mbt
│
├── dom/                      # DOM FFI パッケージ
│   ├── moon.pkg.json
│   ├── types.mbt
│   └── ffi.mbt               # 16個のFFI関数
│
├── integration/              # npm パッケージ "astrobit"
│   ├── package.json          # main: ./dist/integration.js
│   ├── tsup.config.ts        # ビルド設定
│   ├── tsconfig.json
│   ├── integration.ts        # addRenderer + moonbitVitePlugin
│   ├── vite-plugin.ts        # .mbt → virtual module
│   ├── server.ts             # check(), renderToStaticMarkup()
│   ├── client.ts             # hydrate() / mount()
│   └── dist/                 # tsup ビルド成果物（npm 公開対象）
│
└── examples/
    └── basic/
        ├── package.json      # astrobit: "file:../../integration"
        ├── astro.config.mjs
        └── src/
            ├── components/
            │   ├── counter/
            │   │   ├── counter.mbt
            │   │   └── moon.pkg
            │   └── greeting/
            │       ├── greeting.mbt
            │       └── moon.pkg
            └── pages/
                └── index.astro
```

---

## 実装状況

### Phase 1: client:only で動くカウンター ✅

### Phase 2: .mbt 直接 import（Vite Plugin）✅

- ✅ Option C: `import Counter from './counter.mbt'` が動く
- ✅ `virtual:moonbit:` プレフィックスで仮想モジュール
- ✅ `.d.ts` から関数シグネチャ自動解析 → グルーJS 自動生成
- ✅ コンポーネントごとに独立した `moon.pkg`（各パッケージで ESM export）

### Phase 3: SSR + hydration ✅

- ✅ `render_to_html` → SSR HTML 生成
- ✅ `hydrate_dom` → signal・イベントを既存 DOM に接続
- ✅ `client:load`（SSR + hydration）動作確認
- ✅ `client:only`（マウントのみ）動作確認

### Phase 4: ビルドステップ ✅

- ✅ `tsup` で `integration/` を `dist/` にコンパイル
- ✅ `package.json` に `exports`, `files`, `type: "module"` を設定
- ✅ `tsconfig.json` 整備

---

## 残りの課題

### 優先度: 高

**1. HMR（ホットリロード）の改善**

現在: `.mbt` ファイルを変更しても自動でリビルドされない
- `vite-plugin.ts` の `handleHotUpdate` はあるが `moon build` を手動実行している
- 理想: `.mbt` 保存 → `moon build --target js` 自動実行 → Vite HMR

**2. 開発フロー（現状維持で妥当）**

`integration/` の変更 = フレームワーク本体のアップデートなので、ユーザーが `yarn install` を実行するのは npm パッケージとして自然なフロー。
フレームワーク開発者自身は `yarn build` → `yarn install --force` が必要だが、これは許容範囲。

### 優先度: 中

**3. npm 公開準備**

- [ ] `README.md` の作成（インストール方法、使い方、サンプル）
- [ ] バージョン管理方針の決定
- [ ] `npm publish` の実施

**4. mooncakes 公開準備**

- [ ] `moon.mod.json` のメタデータ整備（description, homepage など）
- [ ] `moon publish` の実施

**5. タグ関数の拡充**

実装済み: `h1`〜`h6`, `nav`, `header`, `footer`, `section`, `article`, `textarea`, `pre`, `code`

### 優先度: 低

**6. コードの整理**

- `astrobit.mbt` が大きくなってきたら `core/` に分割
  - `node.mbt`, `html.mbt`, `mount.mbt`, `hydrate.mbt`

**7. テスト整備**

- `astrobit_test.mbt` に `render_to_html` の網羅的テスト
- `hydrate_dom` のテスト（DOM 操作はテストが難しいため後回し）

**8. `examples/` の充実**

- フォーム入力サンプル（`on_input` + `signal`）
- リストサンプル（`Dynamic` + `map`）
- 複数コンポーネント間の state 共有サンプル

---

## 既知の技術的制約

- `yarn 1.x` の `file:` 依存は変更のたびに `yarn install --force` が必要
- `client.ts` の `client:load` / `client:only` 判定は `element.innerHTML.trim()` で行っており、Astro が空白を注入するケースで誤動作する可能性がある
- HMR は現在未完全（`handleHotUpdate` フックは実装済みだが未テスト）
