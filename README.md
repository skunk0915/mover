# Dropbox Video Viewer 使用マニュアル

## 概要
DropboxフォルダからビデオURLを取得し、video_viewer.htmlで複数の動画を一覧表示するツールです。

## ファイル構成

```
mover/
├── get_share_url/
│   ├── list-links.js          # Dropbox URLリスト取得スクリプト
│   ├── urls_tmp.csv            # 一時URLリスト（list-links.js出力）
│   ├── dropbox_raw_links.json  # JSONフォーマットのURLリスト
│   └── .env                    # Dropboxトークン設定
├── video_viewer.html           # ビデオビューア
└── urls.csv                    # ビューアが読み込むURLリスト
```

## 事前準備

### 1. Dropboxトークンの設定

#### 推奨: リフレッシュトークン方式（長期間有効）

`get_share_url/.env` ファイルに以下を設定：

```env
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here
DROPBOX_REFRESH_TOKEN=your_refresh_token_here
```

**リフレッシュトークンの取得方法:**

#### ステップ1: Dropboxアプリの作成

1. [Dropbox App Console](https://www.dropbox.com/developers/apps) にアクセス
2. 「Create app」をクリック
3. 以下を選択：
   - Choose an API: **Scoped access**
   - Choose the type of access: **Full Dropbox** または **App folder**（用途に応じて）
   - Name your app: 任意のアプリ名を入力
4. アプリを作成

#### ステップ2: アプリの設定

1. **Settings** タブで以下を確認：
   - **App key** をコピーして、`get_share_url/.env` に以下を追加：
     ```env
     DROPBOX_APP_KEY=your_app_key_here
     DROPBOX_APP_SECRET=your_app_secret_here
     ```
   - **Redirect URIs** に `http://localhost:8080/callback` を追加して「Add」をクリック

2. **Permissions** タブで以下の権限を有効化：
   - `files.content.read`
   - `sharing.write`
   - `sharing.read`
   - 設定後「Submit」をクリック

#### ステップ3: リフレッシュトークンの取得

1. ターミナルで以下を実行：
   ```bash
   cd get_share_url
   node get-refresh-token.js
   ```

2. ブラウザで表示されたURLを開き、Dropboxにログインしてアクセスを許可

3. リフレッシュトークンが表示されるので、`get_share_url/.env` に追加：
   ```env
   DROPBOX_REFRESH_TOKEN=your_refresh_token_here
   ```

**注意:** App Console の「Generate」ボタンで表示されるトークンは短期トークン（sl.で始まる）です。リフレッシュトークン取得には上記のスクリプトを使用してください。

#### 従来方式: 短期トークン（4時間で期限切れ、非推奨）

```env
DBX_TOKEN=sl.xxxxxxxxxxxxxxxxxxxxxxxxx
```

**注意:** 短期トークンは4時間で無効になります。リフレッシュトークンへの移行を推奨します。

### 2. 必要なパッケージのインストール

```bash
cd get_share_url
npm install
```

## 使用手順

### ステップ1: DropboxフォルダからURLリストを取得

```bash
cd get_share_url
node list-links.js "フォルダパス"
```

**例:**
```bash
node list-links.js "/同期させたくない分/mov/grok/ikoi"
```

**実行結果:**
- `get_share_url/urls_tmp.csv` - 新しいURLリスト（追記モード）
- `get_share_url/dropbox_raw_links.json` - JSON形式のURLリスト

### ステップ2: URLリストをビューア用にコピー

urls_tmp.csv から urls.csv へコピー：

**PowerShell:**
```powershell
Copy-Item get_share_url\urls_tmp.csv urls.csv
```

**コマンドプロンプト:**
```cmd
copy get_share_url\urls_tmp.csv urls.csv
```

### ステップ3: ビデオビューアで表示

1. `video_viewer.html` をブラウザで開く
2. 複数の動画がグリッド表示される
3. タイルサイズや再生速度を調整可能

## 重要な仕様

### URLリストの分離

- **urls_tmp.csv**: list-links.js の出力先（追記モード）
- **urls.csv**: video_viewer.html の読み込み元

この分離により、新しいDropboxフォルダのURLを取得しても、以前の urls.csv が上書きされることはありません。

### 複数のフォルダからURLを追加する方法

**方法1: 手動マージ**
```powershell
# 新しいフォルダのURLを取得
node list-links.js "/新しいフォルダ"

# urls_tmp.csv の内容を urls.csv に追記
Get-Content get_share_url\urls_tmp.csv | Add-Content urls.csv
```

**方法2: urls_tmp.csv を蓄積してからコピー**
```powershell
# フォルダ1のURLを取得
node list-links.js "/フォルダ1"

# フォルダ2のURLを取得（urls_tmp.csvに追記される）
node list-links.js "/フォルダ2"

# 全てのURLをurls.csvにコピー
Copy-Item get_share_url\urls_tmp.csv urls.csv
```

### urls_tmp.csv のリセット

古いURLリストをクリアしたい場合：

```powershell
# urls_tmp.csv を削除
Remove-Item get_share_url\urls_tmp.csv
```

次回の list-links.js 実行時に新しいファイルが作成されます。

## トラブルシューティング

### エラー: `urls.csvが見つかりません`

**原因:** urls.csv がまだ作成されていない

**解決策:**
```powershell
Copy-Item get_share_url\urls_tmp.csv urls.csv
```

### エラー: `環境変数が設定されていません`

**原因:** .env ファイルにトークンが設定されていない

**解決策:**
- リフレッシュトークン方式（推奨）：`get_share_url/.env` に `DROPBOX_APP_KEY`、`DROPBOX_APP_SECRET`、`DROPBOX_REFRESH_TOKEN` を追加
- 短期トークン方式：`get_share_url/.env` に `DBX_TOKEN=sl.xxxxx` を追加

### エラー: `トークン取得失敗` または `アクセストークン取得エラー`

**原因1:** リフレッシュトークンが無効または期限切れ

**解決策:** Dropbox App Consoleで新しいリフレッシュトークンを生成

**原因2:** App KeyまたはApp Secretが間違っている

**解決策:** Dropbox App Consoleで正しいApp KeyとApp Secretを確認

### 動画が表示されない

**原因1:** URLs.csv のフォーマットが間違っている

**確認:** urls.csv の各行が `https://www.dropbox.com/...` で始まっていることを確認

**原因2:** DropboxのURL有効期限が切れている

**解決策:** list-links.js を再実行して新しいURLを取得

## ビューアの機能

### グローバル設定
- **タイルサイズ**: 100px ～ 800px
- **全体再生速度**: 0.1x ～ 3.0x

### 個別設定
- 各動画の再生速度を個別に調整可能

### 自動再生
- 全ての動画が自動的にループ再生（ミュート）

## ワークフロー例

```powershell
# 1. DropboxフォルダからURLを取得
cd get_share_url
node list-links.js "/Movies/vacation"

# 2. URLリストをビューア用にコピー
cd ..
Copy-Item get_share_url\urls_tmp.csv urls.csv

# 3. ブラウザでvideo_viewer.htmlを開く
# （エクスプローラーでダブルクリック、またはブラウザにドラッグ&ドロップ）
```

## 注意事項

- list-links.js は urls_tmp.csv に**追記モード**で書き込みます
- 別のフォルダのURLを取得する前に、urls_tmp.csv をバックアップまたは削除することを推奨
- video_viewer.html は静的ファイルなので、Webサーバー不要でローカルで動作します
- DropboxのURL有効期限に注意してください（通常は長期間有効）

## ヒント

### 複数のURLセットを管理する

```powershell
# プロジェクトAのURLセット
Copy-Item get_share_url\urls_tmp.csv urls_projectA.csv

# プロジェクトBのURLセット
Copy-Item get_share_url\urls_tmp.csv urls_projectB.csv

# 使用時にurls.csvにコピー
Copy-Item urls_projectA.csv urls.csv
```

### URLの重複を削除

list-links.js は自動的に urls_tmp.csv の重複を削除しますが、手動で削除する場合：

```powershell
Get-Content urls.csv | Sort-Object -Unique | Set-Content urls_cleaned.csv
```
