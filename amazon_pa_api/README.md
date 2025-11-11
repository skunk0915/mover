# Amazon Book Cover Finder

Amazon Product Advertising API を使って書籍の表紙画像URLを取得するツールです。

## 機能

- 書名で検索して10件の本の表紙画像候補を取得
- ページネーション対応で追加10件ずつ取得可能
- 複数サイズの画像URL取得（Large/Medium/Small）
- ASIN（Amazon商品ID）の表示

## 事前準備

### 1. Amazon アソシエイトアカウントの作成

1. [Amazon アソシエイト](https://affiliate.amazon.co.jp/)にアクセス
2. アカウントを作成
3. PA-API（Product Advertising API）のアクセス権限を申請

### 2. 認証情報の取得

Amazon アソシエイトのアカウントから以下の情報を取得：
- **AWS Access Key ID**
- **AWS Secret Access Key**
- **Associate Tag**（アソシエイトタグ）

### 3. 環境変数の設定

`.env.example` を `.env` にコピーして、認証情報を設定：

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
ASSOCIATE_TAG=your_associate_tag_here
AWS_REGION=us-west-2
PA_API_HOST=webservices.amazon.co.jp
MARKETPLACE=www.amazon.co.jp
```

### 4. 依存関係のインストール

```bash
npm install
```

## 使用方法

### 基本的な使い方

```bash
node index.js "書名"
```

**例：**
```bash
node index.js "ハリー・ポッター"
```

### ページ指定

```bash
node index.js "書名" [ページ番号]
```

**例：**
```bash
# 1ページ目（1-10件目）
node index.js "ハリー・ポッター" 1

# 2ページ目（11-20件目）
node index.js "ハリー・ポッター" 2
```

## 出力例

```
=== 検索結果: ハリー・ポッター (ページ 1) ===

1. ハリー・ポッターと賢者の石
   ASIN: B00XXXXXX
   Large: https://m.media-amazon.com/images/I/xxxxx._AC_UL1500_.jpg
   Medium: https://m.media-amazon.com/images/I/xxxxx._AC_UL320_.jpg
   Small: https://m.media-amazon.com/images/I/xxxxx._AC_UL160_.jpg

2. ハリー・ポッターと秘密の部屋
   ASIN: B00YYYYYY
   ...
```

## 注意事項

- PA-APIの利用規約に従ってください
- API呼び出しには制限があります（1秒あたり1リクエスト、1日あたり8,640リクエストなど）
- Amazonアソシエイトアカウントを持っていない場合、PA-APIは利用できません

## トラブルシューティング

### エラー: `環境変数が設定されていません`

**原因:** `.env` ファイルが正しく設定されていない

**解決策:**
1. `.env.example` を `.env` にコピー
2. 認証情報を正しく設定

### エラー: `認証エラー`

**原因:** AWS認証情報が間違っている

**解決策:**
- Amazon アソシエイトのアカウントで認証情報を再確認
- AWS_ACCESS_KEY_ID、AWS_SECRET_ACCESS_KEY、ASSOCIATE_TAGが正しいか確認

### 検索結果が0件

**原因:** 書名が見つからないか、検索キーワードが不適切

**解決策:**
- 書名を変更して再試行
- より一般的なキーワードで検索

## ライセンス

このツールはAmazon PA-APIの利用規約に従って使用してください。

## 参考リンク

- [Amazon Product Advertising API ドキュメント](https://webservices.amazon.com/paapi5/documentation/)
- [Amazon アソシエイト プログラム](https://affiliate.amazon.co.jp/)
