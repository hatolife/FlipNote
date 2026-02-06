# FlipNote

学習用単語カード PWA アプリ。ブラウザ上で動作し、オフラインでも利用可能。

**https://flip.hato.life/**

## 特徴

- カードをめくるフリップアニメーションで直感的に学習
- タグで整理 - 複数タグの割り当て & タグでフィルタリング学習
- 難易度設定 - カードごとに 1〜5 の難易度を設定
- TSV 形式でカードをインポート / エクスポート（Excel / Google スプレッドシート連携）
- サンプルデッキ - 日本語-韓国語など、すぐに試せるサンプルを用意
- オフライン対応 - インストールしてネットワークなしで利用可能
- 学習記録の自動保存（カードごとの正誤カウント + 日別統計）
- モバイル / PC 両対応のレスポンシブデザイン
- キーボードショートカット対応（スペースでフリップ、左右キーで回答）

## 使い方

### デッキとカードの管理

1. ホーム画面から「デッキ一覧」を開く
2. 「+ 新規デッキ作成」でデッキを作成、またはサンプルデッキを読み込む
3. デッキ内でカードを1枚ずつ追加、または TSV ファイルを一括インポート
4. カードにタグ（複数可）と難易度（1〜5）を設定可能

### TSV インポート

タブ区切りのテキストファイルを読み込んでカードを一括登録できます。

```
front	back
apple	りんご
book	本
```

Google スプレッドシートで作成し、TSV 形式でダウンロードしたファイルをそのまま読み込めます。

タグ・難易度・学習記録付きの TSV もサポートしています。

```
front	back	tags	difficulty	correctCount	incorrectCount	lastStudiedAt
apple	りんご	果物,食べ物	2	5	2	2026-02-04T10:30:00.000Z
book	本		1	3	0
```

### 学習モード

1. デッキ詳細画面でタグをタップしてフィルタリング（任意）
2. 「学習を始める」をタップ（フィルタ時は対象枚数を表示）
3. カードをタップ（またはスペースキー）で裏返す
4. 「覚えた」または「もう一度」で自己判定
5. 全カード終了後に結果を表示
6. 間違えたカードだけを再学習可能

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | React + TypeScript |
| ビルドツール | Vite |
| スタイリング | CSS Modules |
| データ保存 | IndexedDB (Dexie.js) |
| PWA | vite-plugin-pwa (Workbox) |
| テスト | Vitest + React Testing Library |
| CI/CD | GitHub Actions → GitHub Pages |

## 開発

### セットアップ

```bash
# fnm で Node.js をインストール
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install --lts

# 依存パッケージのインストール
make install
```

### コマンド

```bash
make dev          # 開発サーバー起動
make test         # テスト実行
make test-watch   # テスト実行（ウォッチモード）
make build        # プロダクションビルド
make lint         # ESLint 実行
```

### ディレクトリ構成

```
src/
├── components/    # 共通UIコンポーネント
├── pages/         # 各画面
│   ├── Home/      # ホーム（ナビゲーション）
│   ├── DeckList/  # デッキ一覧
│   ├── DeckDetail/# デッキ詳細
│   ├── CardEdit/  # カード追加・編集
│   ├── Study/     # 学習画面
│   └── Result/    # 学習結果
├── db/            # IndexedDB (Dexie) 定義・操作
├── types/         # TypeScript 型定義
└── utils/         # ユーティリティ（TSVパーサー等）
```

## ライセンス

CC0 1.0 Universal
