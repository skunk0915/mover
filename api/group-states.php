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
            display_order INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // display_orderカラムが存在しない場合は追加（既存テーブル対応）
    $pdo->exec("
        ALTER TABLE group_states
        ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0
    ");

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // グループ状態を取得
        $stmt = $pdo->query("
            SELECT
                group_name,
                is_enabled,
                display_order
            FROM group_states
            ORDER BY display_order ASC, group_name ASC
        ");

        $data = $stmt->fetchAll();

        $groupStates = [];
        $groupOrders = [];
        foreach ($data as $row) {
            $groupStates[$row['group_name']] = (bool)$row['is_enabled'];
            $groupOrders[$row['group_name']] = (int)$row['display_order'];
        }

        echo json_encode([
            'success' => true,
            'groupStates' => $groupStates,
            'groupOrders' => $groupOrders
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // グループ状態を保存・更新
        $input = json_decode(file_get_contents('php://input'), true);

        // グループ順序の一括更新
        if (isset($input['groupOrders']) && is_array($input['groupOrders'])) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO group_states (group_name, display_order, is_enabled)
                    VALUES (:group_name, :display_order, 1)
                    ON DUPLICATE KEY UPDATE
                        display_order = :display_order_update
                ");

                foreach ($input['groupOrders'] as $groupName => $order) {
                    $stmt->execute([
                        ':group_name' => $groupName,
                        ':display_order' => (int)$order,
                        ':display_order_update' => (int)$order
                    ]);
                }

                $pdo->commit();
                echo json_encode([
                    'success' => true,
                    'message' => 'Group orders saved successfully'
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
        }
        // グループON/OFF状態の更新
        elseif (isset($input['groupName']) && isset($input['isEnabled'])) {
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
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
