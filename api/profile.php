<?php

declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__.'/../config/database.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401); echo json_encode(['error' => 'Sesi login berakhir.']); exit;
}

try {
    $pdo = db();
    $find = $pdo->prepare('SELECT b.* FROM businesses b INNER JOIN business_user bu ON bu.business_id=b.id WHERE bu.user_id=? LIMIT 1');
    $find->execute([$_SESSION['user_id']]); $business = $find->fetch();
    if (!$business) throw new RuntimeException('Profil usaha belum tersedia.');

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(['name'=>$business['name'],'phone'=>$business['phone']??'','address'=>$business['address']??'','logo'=>$business['logo']??null]); exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'Metode tidak didukung.']); exit; }
    $data=json_decode(file_get_contents('php://input'),true)?:[];
    $name=trim((string)($data['name']??'')); if ($name==='') throw new InvalidArgumentException('Nama usaha wajib diisi.');
    $stmt=$pdo->prepare('UPDATE businesses SET name=?, phone=?, address=?, logo=?, updated_at=NOW() WHERE id=?');
    $stmt->execute([$name,$data['phone']??'',$data['address']??'', $data['logo']??null, $business['id']]);
    echo json_encode(['success'=>true]);
} catch(Throwable $e) { http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
