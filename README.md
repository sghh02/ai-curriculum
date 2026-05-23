# ai-curriculum

「AIと問いから始める学び方」カリキュラムのコンテンツ（`index.json` + `chapters/*.md`）と、
それをブラウザで閲覧するためのHTMLビューアー。

## HTMLビューアー

`index.html` / `styles.css` / `app.js` が、`index.json` と `chapters/*.md` を
ブラウザ上で読み込んで表示します。ビルドや依存パッケージは不要です
（Markdownの変換は CDN の [marked](https://marked.js.org/) を使用）。
md を編集すれば、再読み込み（手動アップロード運用なら再アップロード）するだけで反映されます。

### ローカルで確認する

`file://` で直接開くと `fetch` がブロックされるため、簡易HTTPサーバ経由で開きます。

```bash
# このディレクトリ直下で実行
python3 -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```

URL末尾に `#<章のid>`（例 `#engineer-roles`）を付けると、その章を直接開けます。

## Netlify で公開する（手動アップロード）

ビルド不要のため、フォルダをそのままアップロードするだけで公開できます。

1. <https://app.netlify.com/drop> を開く
2. この `ai-curriculum` フォルダごとドラッグ&ドロップする
3. 発行された公開URLを共有する

- 配信に必要なのは `index.html` / `styles.css` / `app.js` / `index.json` / `chapters/` です。
  `.git` や `scripts/` も同梱されますが配信上は無害です（URLを知らなければ参照されません）。
  気になる場合は上記5点だけを別フォルダにコピーしてアップロードしてください。
- 公開URLはランダムなサブドメインなので、実質「URLを知っている人だけ」が閲覧できます。
  さらに限定したい場合は Netlify の Password protection（有料プラン）を利用してください。
- 内容を更新したら、同じフォルダをもう一度ドロップすれば再デプロイされます。

## Validate

```bash
node scripts/validate-index.mjs
```
