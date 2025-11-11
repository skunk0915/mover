<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

try {
    $pdo = getDBConnection();

    // テーブルが存在しない場合は作成
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS group_states (
            group_name VARCHAR(255) PRIMARY KEY,
            is_enabled TINYINT(1) NOT NULL DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // グループ状態を取得
        $stmt = $pdo->query("
            SELECT
                group_name,
                is_enabled
            FROM group_states
            ORDER BY group_name ASC
        ");

        $data = $stmt->fetchAll();

        $groupStates = [];
        foreach ($data as $row) {
            $groupStates[$row['group_name']] = (bool)$row['is_enabled'];
        }

        echo json_encode([
            'success' => true,
            'groupStates' => $groupStates
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // グループ状態を保存・更新
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['groupName']) || !isset($input['isEnabled'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: groupName, isEnabled']);
            exit;
        }

        $groupName = $input['groupName'];
        $isEnabled = (bool)$input['isEnabled'];

        // INSERT ... ON DUPLICATE KEY UPDATE を使用
        $stmt = $pdo->prepare("
            INSERT INTO group_states (group_name, is_enabled)
            VALUES (:group_name, :is_enabled)
            ON DUPLICATE KEY UPDATE
                is_enabled = :is_enabled_update
        ");

        $stmt->execute([
            ':group_name' => $groupName,
            ':is_enabled' => $isEnabled ? 1 : 0,
            ':is_enabled_update' => $isEnabled ? 1 : 0
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Group state saved successfully'
        ]);

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
