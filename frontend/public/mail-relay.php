<?php
/**
 * SM GROUPS - Secure Mail Relay Script for Hostinger
 * Bypasses Render Free SMTP blocking by relaying mail requests over standard HTTPS
 */

// Enable CORS for Render backend
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Secure key verification (matching JWT_SECRET)
$SECRET_KEY = "BillingSoftware_Secret_Key_2026";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

// Parse request payload first to allow body-based authentication fallback
$input = json_decode(file_get_contents("php://input"), true);

// Fetch all request headers
$headers = getallheaders();

// Normalize headers to lowercase for case-insensitive lookup
$normalizedHeaders = [];
foreach ($headers as $key => $value) {
    $normalizedHeaders[strtolower($key)] = $value;
}

$authHeader = isset($normalizedHeaders['authorization']) ? $normalizedHeaders['authorization'] : '';
$customSignature = isset($normalizedHeaders['x-relay-signature']) ? $normalizedHeaders['x-relay-signature'] : '';
$bodyKey = isset($input['relay_key']) ? $input['relay_key'] : '';

// Validate access using Bearer token, custom header, or body parameter
$authorized = false;
if ($authHeader === "Bearer " . $SECRET_KEY) {
    $authorized = true;
} elseif ($customSignature === $SECRET_KEY) {
    $authorized = true;
} elseif ($bodyKey === $SECRET_KEY) {
    $authorized = true;
}

if (!$authorized) {
    http_response_code(401);
    echo json_encode([
        "status" => "error", 
        "message" => "Unauthorized access. Header verification failed.",
        "debug_headers_received" => array_keys($headers) // Helps developer diagnose if headers are stripped
    ]);
    exit;
}

$to = isset($input['to']) ? trim($input['to']) : '';
$subject = isset($input['subject']) ? trim($input['subject']) : '';
$html = isset($input['html']) ? trim($input['html']) : '';

if (empty($to) || empty($subject) || empty($html)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required parameters (to, subject, html)"]);
    exit;
}

$smtp_user = isset($input['smtp_user']) ? trim($input['smtp_user']) : 'thesmgroups@gmail.com';
$smtp_pass = isset($input['smtp_pass']) ? trim($input['smtp_pass']) : 'btyzksrsqeqegpla';

// High-performance pure-PHP SMTP client to guarantee real-time delivery via Google SMTP
function send_smtp_email($to, $subject, $html, $user, $pass) {
    // Connect securely to Gmail SMTP over SSL on Port 465
    $socket = @stream_socket_client("ssl://smtp.gmail.com:465", $errno, $errstr, 10);
    if (!$socket) {
        throw new Exception("Connection failed: $errstr ($errno)");
    }
    
    // Inline helper to read SMTP responses line-by-line
    $read_resp = function($sock, $expected_code) {
        $response = "";
        while ($line = fgets($sock, 512)) {
            $response .= $line;
            // SMTP multiline responses have '-' after status code; final line has ' ' (space)
            if (substr($line, 3, 1) === " ") {
                break;
            }
        }
        $code = intval(substr($response, 0, 3));
        if ($code !== $expected_code) {
            throw new Exception("SMTP error ($expected_code expected): $response");
        }
        return $response;
    };

    try {
        $read_resp($socket, 220); // Greeting
        
        fwrite($socket, "EHLO localhost\r\n");
        $read_resp($socket, 250);
        
        fwrite($socket, "AUTH LOGIN\r\n");
        $read_resp($socket, 334);
        
        fwrite($socket, base64_encode($user) . "\r\n");
        $read_resp($socket, 334);
        
        fwrite($socket, base64_encode($pass) . "\r\n");
        $read_resp($socket, 235); // Authenticated!
        
        fwrite($socket, "MAIL FROM: <$user>\r\n");
        $read_resp($socket, 250);
        
        fwrite($socket, "RCPT TO: <$to>\r\n");
        $read_resp($socket, 250);
        
        // BCC Owner to verify delivery
        fwrite($socket, "RCPT TO: <$user>\r\n");
        $read_resp($socket, 250);
        
        fwrite($socket, "DATA\r\n");
        $read_resp($socket, 354);
        
        $boundary = "----=_Part_" . md5(uniqid(rand(), true));
        
        // Construct standard, premium-formatted MIME email
        $headers = "MIME-Version: 1.0\r\n" .
                   "Content-Type: text/html; charset=UTF-8\r\n" .
                   "From: SM GROUPS <$user>\r\n" .
                   "To: <$to>\r\n" .
                   "Bcc: <$user>\r\n" .
                   "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n" .
                   "Date: " . date("r") . "\r\n" .
                   "Message-ID: <" . uniqid() . "@gmail.com>\r\n" .
                   "X-Mailer: PHP/" . phpversion() . "\r\n\r\n" .
                   $html . "\r\n.\r\n";
                   
        fwrite($socket, $headers);
        $read_resp($socket, 250);
        
        fwrite($socket, "QUIT\r\n");
        fclose($socket);
        return true;
    } catch (Exception $e) {
        if ($socket) @fclose($socket);
        throw $e;
    }
}

try {
    send_smtp_email($to, $subject, $html, $smtp_user, $smtp_pass);
    echo json_encode(["status" => "success", "message" => "Email delivered successfully via SMTP in real time"]);
} catch (Exception $err) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "SMTP relay system delivery failure: " . $err->getMessage()]);
}
?>
