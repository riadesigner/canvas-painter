<?php

echo json_encode(array("OK!!!"));

exit();

echo "<pre>";

var_dump($_REQUEST);

echo "</pre>";

exit();

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
$mail->addAddress('e.pogrebnyak@mail.ru', 'Дизайнеру');  // кому

$mail->Subject = 'Проверка';  // тема письма

$mail->AddAttachment('telnyashka.png');


$mail->msgHTML("<html><body>
            <h1>Заказ с сайта!</h1>
            <p>Это тестовое письмо.</p>
            </html></body>");


if ($mail->send()) { // отправляем письмо
    echo 'Письмо отправлено!';
} else {
    echo 'Ошибка: ' . $mail->ErrorInfo;
}


exit();


   ?>