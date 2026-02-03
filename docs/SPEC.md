# FlipNote - 学習用単語カード PWA アプリ 仕様書

## 1. 概要

**FlipNote** - ブラウザ上で動作する単語カード（フラッシュカード）PWA アプリケーション。
オフラインでも利用可能で、スマートフォン・PC の両方に対応する。

## 2. 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | React 18 + TypeScript |
| ビルドツール | Vite |
| スタイリング | CSS Modules |
| データ保存 | IndexedDB（Dexie.js） |
| PWA | vite-plugin-pwa（Workbox） |
| テスト | Vitest + React Testing Library |

- バックエンドなし。全データはブラウザのローカルストレージ (IndexedDB) に保存
- 外部 API 不使用

## 3. データモデル

### Deck（デッキ / 単語帳）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| name | string | デッキ名（主キー） |
| description | string | 説明（任意） |
| createdAt | number | 作成日時 (Unix ms) |
| updatedAt | number | 更新日時 (Unix ms) |

- 主キー: `name`
- デッキ名の重複は不可
- デッキ名変更時は Card・DailyStats の deckName も連動更新

### Card（カード）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| deckName | string | 所属デッキ名（複合キー） |
| front | string | 表面・問題（複合キー） |
| back | string | 裏面（答え） |
| correctCount | number | 「覚えた」累計回数（初期値 0） |
| incorrectCount | number | 「もう一度」累計回数（初期値 0） |
| lastStudiedAt | number \| null | 最終学習日時 (Unix ms)。未学習なら null |
| createdAt | number | 作成日時 (Unix ms) |
| updatedAt | number | 更新日時 (Unix ms) |

- 主キー: `[deckName, front]` の複合キー
- 同一デッキ内で表面の重複は不可
- 学習時に correctCount / incorrectCount / lastStudiedAt を直接更新

### DailyStats（日別学習サマリー）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| deckName | string | デッキ名（複合キー） |
| date | string | 学習日 "YYYY-MM-DD"（複合キー） |
| studiedCount | number | 学習したカード枚数 |
| correctCount | number | 「覚えた」回数 |
| incorrectCount | number | 「もう一度」回数 |

- 主キー: `[deckName, date]` の複合キー
- 学習のたびに該当日のレコードを加算更新（なければ新規作成）
- デッキ名変更時は連動更新

## 4. 画面構成

### ルーティング

- `/` → `/v1/` にリダイレクト（将来バージョンアップ時は最新の `/v*/` へ）
- 全画面は `/v1/` 配下

### 4.1 ホーム画面 `/v1/`

- アプリ名（FlipNote）の表示
- 各機能へのナビゲーションリンク
  - デッキ一覧
  - （将来的に学習統計など追加可能）

### 4.2 デッキ一覧画面 `/v1/decks`

- デッキ一覧を表示（カード形式のリスト）
- 各デッキに名前・カード枚数・最終学習日を表示
- 「+ 新規デッキ作成」ボタン
- デッキタップでデッキ詳細へ

### 4.3 デッキ詳細画面 `/v1/deck/:deckName`

- デッキ名・説明の表示と編集
- カード一覧（表面のプレビュー表示）
- カードの追加・編集・削除
- 「学習を始める」ボタン
- デッキの削除
- カードのインポート（TSV ファイル読み込み）/ エクスポート（TSV ファイル出力）

### 4.4 カード編集画面 `/v1/deck/:deckName/card/new` `/v1/deck/:deckName/card/:front/edit`

- 表面・裏面のテキスト入力
- 保存 / キャンセル

### 4.5 学習画面 `/v1/deck/:deckName/study`

- カードを1枚ずつ表示
- タップ / クリックでカードを裏返す（フリップアニメーション）
- 裏面表示後に「覚えた」「もう一度」ボタンを表示
- 進捗バー（現在 / 全体）
- 学習順序: シャッフルして出題

### 4.6 学習結果画面 `/v1/deck/:deckName/result`

- 正解数 / 全体数
- 正答率（%）
- 間違えたカードの一覧
- 「間違えたカードだけ再学習」ボタン
- 「ホームに戻る」ボタン

## 5. 機能詳細

### 5.1 デッキ管理

- CRUD 操作（作成・読取・更新・削除）
- デッキ削除時は確認ダイアログ表示
- カードのインポート / エクスポート（TSV 形式）

### 5.2 カード管理

- CRUD 操作
- カード削除時は確認ダイアログ表示

### 5.3 カードのインポート / エクスポート（TSV）

TSV（タブ区切り）形式でカードを入出力する。Excel / Google スプレッドシートとの連携が容易。

**TSV フォーマット**:
```
front	back	correctCount	incorrectCount	lastStudiedAt
apple	りんご	5	2	2026-02-04T10:30:00
book	本	3	0	2026-02-03T15:00:00
dog	犬	0	0
```

| 列 | 必須 | 説明 |
|----|------|------|
| front | はい | 表面（問題） |
| back | はい | 裏面（答え） |
| correctCount | いいえ | 「覚えた」累計回数 |
| incorrectCount | いいえ | 「もう一度」累計回数 |
| lastStudiedAt | いいえ | 最終学習日時（ISO 8601 形式、未学習なら空欄） |

- 1行目はヘッダ行。インポート時はヘッダ行で列を識別する
- 各行が1枚のカードに対応
- エクスポート時のファイル名: `{デッキ名}.tsv`
- エクスポート時: Card の correctCount / incorrectCount / lastStudiedAt をそのまま出力
- インポート時: `.tsv` / `.txt` ファイルを受け付ける
- インポート時: 学習列がある場合は学習状況も復元、ない場合（front / back のみ）はカードのみ取り込み
- 既存デッキへの追加インポート（既存カードは維持）

### 5.4 学習モード

- デッキ内のカードをシャッフルして出題
- カードフリップアニメーション（CSS 3D transform）
- 「覚えた (correct)」「もう一度 (incorrect)」で自己判定
- 全カード終了後に結果画面へ遷移
- 間違えたカードのみ再学習可能

### 5.5 学習記録

- 学習時に Card の correctCount / incorrectCount / lastStudiedAt を更新
- 同時に DailyStats の該当日レコードを加算更新
- 結果画面で今回のセッション結果を表示

### 5.6 PWA 機能

- Service Worker によるオフライン対応
- ホーム画面へのインストール（A2HS）
- アプリアイコン・スプラッシュスクリーン

## 6. UI / UX 方針

- モバイルファースト（レスポンシブ対応）
- カードフリップは 0.4s の CSS 3D アニメーション
- カラーテーマ: ライトモード（ダークモードは将来対応）
- フォント: システムフォント使用
- 画面遷移: React Router によるクライアントサイドルーティング

## 7. ディレクトリ構成

```
wordcard/
├── public/
│   ├── icons/            # PWA アイコン
│   └── manifest.json
├── src/
│   ├── components/       # 共通UIコンポーネント
│   │   ├── Header/
│   │   ├── Button/
│   │   ├── Card/
│   │   └── Modal/
│   ├── pages/            # 各画面
│   │   ├── Home/
│   │   ├── DeckDetail/
│   │   ├── CardEdit/
│   │   ├── Study/
│   │   └── Result/
│   ├── db/               # IndexedDB (Dexie) 定義
│   ├── hooks/            # カスタムフック
│   ├── types/            # TypeScript 型定義
│   ├── utils/            # ユーティリティ関数
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── docs/
│   └── SPEC.md
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 8. 非機能要件

- **パフォーマンス**: 初回ロード 3 秒以内（Lighthouse Performance 90+目標）
- **オフライン**: Service Worker キャッシュによりネットワークなしで完全動作
- **データ永続性**: IndexedDB に保存。ブラウザのストレージ削除まで保持
- **対応ブラウザ**: Chrome / Safari / Firefox / Edge（最新2バージョン）
- **アクセシビリティ**: セマンティック HTML、キーボード操作対応

## 9. 将来の拡張候補（今回のスコープ外）

- Google Sheets URL からの直接インポート（OAuth 連携）
- クリップボード貼り付けインポート
- ダークモード対応
- 間隔反復学習（SRS: Spaced Repetition System）
- マークダウン / 画像対応（カード内容）
- デッキの共有機能（URL / QRコード）
- 複数デッキ横断学習
- 学習統計ダッシュボード
