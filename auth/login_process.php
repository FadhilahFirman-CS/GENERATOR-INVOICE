<?php
declare(strict_types=1); session_start(); require_once __DIR__.'/../config/database.php';
$email=trim($_POST['email']??'');$password=$_POST['password']??'';
if(!filter_var($email,FILTER_VALIDATE_EMAIL)||$password===''){$_SESSION['auth_error']='Email dan password wajib diisi.';header('Location:/auth/login.php');exit;}
try {$stmt=db()->prepare('SELECT id,name,email,password FROM users WHERE email=? LIMIT 1');$stmt->execute([$email]);$user=$stmt->fetch();} catch (Throwable $e) {$_SESSION['auth_error']='Database MySQL belum siap. Jalankan generator_invoice.sql dan cek config/database.php.';header('Location:/auth/login.php');exit;}
if(!$user||!password_verify($password,$user['password'])){$_SESSION['auth_error']='Email atau password salah.';header('Location:/auth/login.php');exit;}
session_regenerate_id(true);$_SESSION['user_id']=$user['id'];$_SESSION['user_name']=$user['name'];$_SESSION['user_email']=$user['email'];header('Location:/');exit;
