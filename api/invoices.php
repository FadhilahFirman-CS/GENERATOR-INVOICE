<?php

declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__.'/../config/database.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesi login berakhir.']);
    exit;
}

try {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT business_id FROM business_user WHERE user_id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $businessId = $stmt->fetchColumn();

    if (!$businessId) {
        throw new RuntimeException('Profil usaha belum tersedia.');
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT i.*, GROUP_CONCAT(CONCAT_WS("|", ii.name, ii.qty, ii.price) SEPARATOR "~") AS item_rows FROM invoices i LEFT JOIN invoice_items ii ON ii.invoice_id = i.id WHERE i.business_id = ? GROUP BY i.id ORDER BY i.updated_at DESC, i.id DESC');
        $stmt->execute([$businessId]);
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $items = [];
            foreach (array_filter(explode('~', (string) $row['item_rows'])) as $item) {
                [$name, $qty, $price] = array_pad(explode('|', $item, 3), 3, '');
                $items[] = ['id' => uniqid('item_', true), 'name' => $name, 'qty' => (float) $qty, 'price' => (float) $price];
            }
            $result[] = ['id' => (string) $row['id'], 'number' => $row['number'], 'date' => $row['issued_at'], 'due' => $row['due_at'], 'customer' => ['name' => $row['customer_name'], 'contact' => $row['customer_contact'] ?? '', 'address' => $row['customer_address'] ?? ''], 'items' => $items ?: [['id' => uniqid('item_', true), 'name' => '', 'qty' => 1, 'price' => 0]], 'discount' => (float) $row['discount'], 'tax' => (float) $row['tax'], 'notes' => $row['notes'] ?? '', 'template' => $row['template'], 'updated' => strtotime($row['updated_at'] ?? 'now') * 1000];
        }
        echo json_encode($result);
        exit;
    }

    $payload = json_decode(file_get_contents('php://input'), true) ?: [];
    if ($method === 'POST') {
        foreach (['id', 'number', 'date', 'due', 'customer', 'items', 'discount', 'tax', 'notes', 'template'] as $field) {
            if (!array_key_exists($field, $payload)) throw new InvalidArgumentException('Data invoice belum lengkap.');
        }
        $pdo->beginTransaction();
        $find = $pdo->prepare('SELECT id FROM invoices WHERE business_id = ? AND number = ? LIMIT 1');
        $find->execute([$businessId, $payload['number']]);
        $invoiceId = $find->fetchColumn();
        $values = [$businessId, $payload['number'], $payload['date'], $payload['due'] ?: null, $payload['customer']['name'], $payload['customer']['contact'] ?? '', $payload['customer']['address'] ?? '', $payload['discount'] ?? 0, $payload['tax'] ?? 0, $payload['notes'] ?? '', $payload['template'] ?? 'klasik'];
        if ($invoiceId) {
            $stmt = $pdo->prepare('UPDATE invoices SET issued_at=?, due_at=?, customer_name=?, customer_contact=?, customer_address=?, discount=?, tax=?, notes=?, template=?, updated_at=NOW() WHERE id=? AND business_id=?');
            $stmt->execute(array_merge(array_slice($values, 2), [$invoiceId, $businessId]));
            $pdo->prepare('DELETE FROM invoice_items WHERE invoice_id = ?')->execute([$invoiceId]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO invoices (business_id,number,issued_at,due_at,customer_name,customer_contact,customer_address,discount,tax,notes,template,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())');
            $stmt->execute($values); $invoiceId = $pdo->lastInsertId();
        }
        $itemStmt = $pdo->prepare('INSERT INTO invoice_items (invoice_id,name,qty,price,created_at,updated_at) VALUES (?,?,?,?,NOW(),NOW())');
        foreach ($payload['items'] as $item) if (trim((string) ($item['name'] ?? '')) !== '') $itemStmt->execute([$invoiceId, $item['name'], $item['qty'] ?? 0, $item['price'] ?? 0]);
        $pdo->commit(); echo json_encode(['success' => true, 'id' => (string) $invoiceId]); exit;
    }

    if ($method === 'DELETE') {
        $number = $_GET['number'] ?? '';
        $stmt = $pdo->prepare('DELETE FROM invoices WHERE business_id = ? AND number = ?');
        $stmt->execute([$businessId, $number]); echo json_encode(['success' => true]); exit;
    }

    http_response_code(405); echo json_encode(['error' => 'Metode tidak didukung.']);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
}
