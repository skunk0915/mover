# Dropbox Video Viewer

Dropbox共有URLから動画を一覧表示するWebツール

## 使い方

### 方法1: HTMLファイルを直接開く（推奨）
1. `video_viewer.html` をダブルクリックしてブラウザで開く
2. CSVデータは埋め込まれているため、そのまま動作します

### 方法2: ローカルサーバーで実行（CSV更新時）
1. `start_server.bat` をダブルクリック
2. ブラウザで `http://localhost:8000/video_viewer.html` を開く
3. 外部CSVファイル（dropbox_url.csv）が優先的に読み込まれます

### 方法3: さくらレンタルサーバーにアップロード
1. `video_viewer.html` と `dropbox_url.csv` をサーバーにアップロード
2. ブラウザでHTMLファイルにアクセス

## 機能

- **自動URL変換**: Dropbox共有URLを動画再生用のraw URLに自動変換
- **タイル表示**: 複数動画をグリッド状に配置
- **サイズ調整**: タイルサイズをスライダーで変更可能（100px〜800px）
- **再生速度制御**:
  - グローバルスライダー: 全動画の速度を一括変更
  - 個別スライダー: 各動画の速度を個別に調整（0.1x〜3.0x）
- **自動再生**: すべての動画が自動再生・無限ループ

## CSVフォーマット

```
1→https://www.dropbox.com/scl/fi/.../video1.MP4?rlkey=...
2→https://www.dropbox.com/scl/fi/.../video2.MP4?rlkey=...
```

## URL変換規則

- ホスト名を `dl.dropboxusercontent.com` に変更
- `rlkey` パラメータのみ保持
- `st`, `dl` などのパラメータは削除
- スキームは常に `https://`

## 技術仕様

- 純粋なHTML/CSS/JavaScript（フレームワーク不要）
- CSS Grid Layoutによるレスポンシブ表示
- フォールバック機能（外部CSV → 埋め込みデータ）
