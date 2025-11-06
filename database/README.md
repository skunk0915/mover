# データベースセットアップ手順

このアプリケーションは、データ通信量をサーバー側（MySQL）で管理します。

## 1. データベースの作成

MySQLにログインして、データベースを作成します。

```sql
CREATE DATABASE mover_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. テーブルの作成

`schema.sql` を実行して、`data_usage` テーブルを作成します。

```bash
mysql -u root -p mover_db < database/schema.sql
```

または、MySQLクライアントで直接実行：

```sql
USE mover_db;
SOURCE database/schema.sql;
```

## 3. データベース接続設定

`api/config.php` を編集して、データベース接続情報を設定します。

```php
define('DB_HOST', 'localhost');      // MySQLホスト
define('DB_NAME', 'mover_db');       // データベース名
define('DB_USER', 'root');           // ユーザー名
define('DB_PASS', 'your_password');  // パスワード
```

## 4. 権限の設定（必要に応じて）

特定のユーザーに権限を付与する場合：

```sql
GRANT SELECT, INSERT, UPDATE ON mover_db.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

## 5. 既存のusage.csvからデータをインポート（オプション）

既存の `usage.csv` がある場合、以下のPHPスクリプトを実行してデータをインポートできます。

```php
<?php
require_once 'api/config.php';

$pdo = getDBConnection();

$csv = file_get_contents('usage.csv');
$lines = explode("\n", trim($csv));

// ヘッダー行をスキップ
for ($i = 1; $i < count($lines); $i++) {
    $line = trim($lines[$i]);
    if (empty($line)) continue;

    $parts = explode(',', $line);
    if (count($parts) >= 3) {
        $date = str_replace('/', '-', trim($parts[0])); // YYYY/MM/DD → YYYY-MM-DD
        $sizeMB = floatval(trim($parts[1]));
        $count = intval(trim($parts[2]));

        $sizeBytes = $sizeMB * 1024 * 1024;

        $stmt = $pdo->prepare("
            INSERT INTO data_usage (date, size_bytes, file_count)
            VALUES (:date, :size_bytes, :file_count)
            ON DUPLICATE KEY UPDATE
                size_bytes = :size_bytes,
                file_count = :file_count
        ");

        $stmt->execute([
            ':date' => $date,
            ':size_bytes' => $sizeBytes,
            ':file_count' => $count
        ]);

        echo "Imported: $date\n";
    }
}

echo "Import completed!\n";
?>
```

## テーブル構造

```sql
CREATE TABLE IF NOT EXISTS data_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    file_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## トラブルシューティング

### 接続エラー

- MySQLサービスが起動しているか確認
- `api/config.php` の接続情報が正しいか確認
- ファイアウォール設定を確認

### 権限エラー

- データベースユーザーに適切な権限があるか確認
- `GRANT` コマンドで権限を付与

### CORSエラー

- `api/data-usage.php` の `Access-Control-Allow-Origin` ヘッダーを確認
- 本番環境では、特定のドメインのみ許可するように変更してください

```php
// 開発環境
header('Access-Control-Allow-Origin: *');

// 本番環境（例）
header('Access-Control-Allow-Origin: https://yourdomain.com');
```
