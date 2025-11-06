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

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // データ使用量を取得
        $stmt = $pdo->query("
            SELECT
                date,
                size_bytes,
                file_count
            FROM data_usage
            ORDER BY date ASC
        ");

        $data = $stmt->fetchAll();

        // 合計を計算
        $totalSize = 0;
        $totalCount = 0;
        $dataByDate = [];

        foreach ($data as $row) {
            $date = $row['date'];
            $sizeBytes = (int)$row['size_bytes'];
            $fileCount = (int)$row['file_count'];

            $dataByDate[$date] = [
                'size' => $sizeBytes,
                'count' => $fileCount
            ];

            $totalSize += $sizeBytes;
            $totalCount += $fileCount;
        }

        echo json_encode([
            'success' => true,
            'dataByDate' => $dataByDate,
            'totalSize' => $totalSize,
            'totalCount' => $totalCount
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // データ使用量を保存・更新
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['date']) || !isset($input['sizeBytes']) || !isset($input['fileCount'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: date, sizeBytes, fileCount']);
            exit;
        }

        $date = $input['date'];
        $sizeBytes = (int)$input['sizeBytes'];
        $fileCount = (int)$input['fileCount'];

        // 日付のバリデーション
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid date format. Expected YYYY-MM-DD']);
            exit;
        }

        // INSERT ... ON DUPLICATE KEY UPDATE を使用
        $stmt = $pdo->prepare("
            INSERT INTO data_usage (date, size_bytes, file_count)
            VALUES (:date, :size_bytes, :file_count)
            ON DUPLICATE KEY UPDATE
                size_bytes = size_bytes + :size_bytes_update,
                file_count = file_count + :file_count_update
        ");

        $stmt->execute([
            ':date' => $date,
            ':size_bytes' => $sizeBytes,
            ':file_count' => $fileCount,
            ':size_bytes_update' => $sizeBytes,
            ':file_count_update' => $fileCount
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Data usage recorded successfully'
        ]);

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
