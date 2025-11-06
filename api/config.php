<?php
// データベース接続設定
// 本番環境に合わせて以下の値を変更してください

define('DB_HOST', 'mysql80.mizy.sakura.ne.jp');
define('DB_NAME', 'mizy_mover');
define('DB_USER', 'mizy_mover');
define('DB_PASS', '8rjcp4ck');
define('DB_CHARSET', 'utf8mb4');

// データベース接続を取得
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}
