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

// Premium Email formatting headers
$headers_mail = "MIME-Version: 1.0\r\n";
$headers_mail .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers_mail .= "From: SM GROUPS <thesmgroups@gmail.com>\r\n";
$headers_mail .= "Reply-To: thesmgroups@gmail.com\r\n";
$headers_mail .= "Bcc: thesmgroups@gmail.com\r\n"; // Ensure Owner gets confirmation
$headers_mail .= "X-Mailer: PHP/" . phpversion();

// Send mail using Hostinger native mail resolver
if (mail($to, $subject, $html, $headers_mail)) {
    echo json_encode(["status" => "success", "message" => "Email delivered successfully"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Hostinger mail() system delivery failure"]);
}
?>
