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

`get_share_url/.env` ファイルに Dropbox トークンを設定：

```env
DBX_TOKEN=sl.xxxxxxxxxxxxxxxxxxxxxxxxx
```

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

### エラー: `環境変数 DBX_TOKEN が設定されていません`

**原因:** .env ファイルにトークンが設定されていない

**解決策:** `get_share_url/.env` を作成し、`DBX_TOKEN=sl.xxxxx` を追加

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
