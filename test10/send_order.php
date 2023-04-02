<?php

$nm = 'arr_emails.json';    
$arr_emails = json_decode(file_get_contents($nm));


$mail_to  = isset($arr_emails->mail_to)?$arr_emails->mail_to:"";
$copy_to = isset($arr_emails->copy_to)?$arr_emails->copy_to:"";

if($mail_to==""){
    echo json_encode(array("err"=>"wrong emails"));
    exit();
}

$texture = isset($_REQUEST['texture'])?$_REQUEST['texture']:"–";
$model = isset($_REQUEST['model'])?$_REQUEST['model']:"–";
$lines = isset($_REQUEST['lines'])?$_REQUEST['lines']:"–";
$size = isset($_REQUEST['size'])?$_REQUEST['size']:"–";
$phone = isset($_REQUEST['phone'])?$_REQUEST['phone']:"–";
$firstName = isset($_REQUEST['firstName'])?$_REQUEST['firstName']:"Неизвестный";

$str = "Здравствуйте, Людмила";
$str .= "<p>высылаю эскиз моего рисунка.</p>";
$str .= "<p>&nbsp;</p>";
$str .= "<h2>Параметры изделия</h2>";
$str .= "<p>Цвет полосок: {$lines}</p>";
$str .= "<p>Батик: {$texture}</p>";
$str .= "<p>Модель: {$model}</p>";
$str .= "<p>Размер: {$size}</p>";
$str .= "<p>&nbsp;</p>";
$str .= "<p>С уважением, {$firstName},<br>";
$str .= "тел. {$phone}</p>";


use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once 'vendor/autoload.php';

$username = "cyberbrandvl@yandex.ru";
$password = "LS8OGs";

$mail = new PHPMailer();
$mail->CharSet = 'UTF-8';

// $mail->SMTPDebug = SMTP::DEBUG_SERVER;
// настройки SMTP
$mail->Mailer = 'smtp';
$mail->Host = 'ssl://smtp.yandex.ru';
$mail->Port = 465;
$mail->SMTPAuth = true;
$mail->Username = $username; // ваш email - тот же что и в поле From:
$mail->Password = $password; // ваш пароль;


// формируем письмо
// от кого: это поле должно быть равно вашему email иначе будет ошибка
$mail->setFrom($username, 'Конструктор Goranskaya');

// кому - получатель письма
$mail->addAddress($mail_to, 'Дизайнеру');  // кому

if(isset($copy_to))
$mail->AddCC($copy_to, 'Тестировщик');  // кому

$mail->Subject = 'Конструктор. Заказ с сайта!';  // тема письма


$mail->AddAttachment($_FILES['previewImage']['tmp_name'],$_FILES['previewImage']['name']);
$mail->AddAttachment($_FILES['previewLekalo']['tmp_name'],$_FILES['previewLekalo']['name']);

$mail->msgHTML("<html><body>{$str}</html></body>");

if ($mail->send()) { // отправляем письмо    
    echo json_encode(array("OK!!!"=>"$mail_to,$copy_to"));
} else {
    echo json_encode(array("err"=>$mail->ErrorInfo));    
}



   ?>