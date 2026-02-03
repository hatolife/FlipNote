# FlipNote 環境構築手順

## 前提条件

- Linux (WSL2) または macOS
- Git

## 1. Node.js のインストール (fnm)

```bash
# fnm (Fast Node Manager) のインストール
curl -fsSL https://fnm.vercel.app/install | bash

# シェルを再読み込み
source ~/.bashrc

# Node.js LTS のインストール
fnm install --lts
```

確認:
```bash
node --version   # v24.x.x
npm --version    # 11.x.x
```

## 2. リポジトリのクローンと依存パッケージのインストール

```bash
git clone <repository-url>
cd wordcard
npm install
```

## 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス。

## 4. テストの実行

```bash
# ウォッチモード（ファイル変更時に自動実行）
npm test

# 単発実行
npm run test:run
```

## 5. ビルド

```bash
npm run build
```

`dist/` ディレクトリに成果物が出力される。

## 6. ビルド結果のプレビュー

```bash
npm run preview
```

## 技術スタック

| 項目 | 技術 | バージョン |
|------|------|-----------|
| ランタイム | Node.js | 24.x (LTS) |
| バージョン管理 | fnm | latest |
| フレームワーク | React | 19.x |
| 言語 | TypeScript | 5.9.x |
| ビルドツール | Vite | 7.x |
| テスト | Vitest + React Testing Library | 4.x |
| DB | Dexie.js (IndexedDB) | 4.x |
| ルーティング | React Router | 7.x |

## npm scripts 一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLint によるコード検査 |
| `npm test` | テスト実行（ウォッチモード） |
| `npm run test:run` | テスト実行（単発） |
