<?php
session_start();
if (!isset($_SESSION['user_id'])) { header('Location: /auth/login.php'); exit; }
$html = file_get_contents(__DIR__.'/dashboard-template.html');
$html = str_replace('{{USER_NAME}}', htmlspecialchars($_SESSION['user_name'] ?? '', ENT_QUOTES, 'UTF-8'), $html);
$initial = strtoupper(substr(trim($_SESSION['user_name'] ?? 'U'), 0, 1));
$html = str_replace('{{USER_INITIAL}}', htmlspecialchars($initial, ENT_QUOTES, 'UTF-8'), $html);
echo $html;
