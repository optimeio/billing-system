<?php
/**
 * Ultra-Fast High-Performance API & Uploads Reverse Proxy
 * Forwards requests from https://billing.thesmgroups.com to the Node.js backend on VPS
 */

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Target VPS Backend (Port 80 via Nginx reverse proxy)
$vps_base = "http://187.77.184.25";

// Determine endpoint path
if (strpos($request_uri, '/uploads/') !== false) {
    $relative_path = substr($request_uri, strpos($request_uri, '/uploads/'));
} elseif (strpos($request_uri, '/api') !== false) {
    $relative_path = substr($request_uri, strpos($request_uri, '/api'));
} else {
    $relative_path = $request_uri;
}

$target_url = $vps_base . $relative_path;

// Check if request is multipart/form-data (File uploads)
$content_type = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
$is_multipart = stripos($content_type, 'multipart/form-data') !== false;
$has_php_files = !empty($_FILES) || (!empty($_POST) && $method === 'POST');
$use_curl_files = $is_multipart && $has_php_files;

// Read incoming headers
$headers = [];
$incoming_headers = getallheaders();
foreach ($incoming_headers as $key => $value) {
    $lower = strtolower($key);
    if ($lower === 'host' || $lower === 'content-length') {
        continue;
    }
    // For multipart uploads where cURL builds the body, let cURL create the boundary header automatically
    if ($use_curl_files && $lower === 'content-type') {
        continue;
    }
    $headers[] = "$key: $value";
}

$ch = curl_init($target_url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

if ($use_curl_files) {
    // Build multipart data with CURLFile for standard POST uploads
    $post_data = $_POST;
    if (!empty($_FILES)) {
        foreach ($_FILES as $field_name => $file_info) {
            if (is_array($file_info['tmp_name'])) {
                foreach ($file_info['tmp_name'] as $idx => $tmp_path) {
                    if (!empty($tmp_path) && is_uploaded_file($tmp_path)) {
                        $post_data[$field_name . "[$idx]"] = new CURLFile(
                            $tmp_path,
                            $file_info['type'][$idx] ?: 'application/octet-stream',
                            $file_info['name'][$idx]
                        );
                    }
                }
            } else {
                if (!empty($file_info['tmp_name']) && is_uploaded_file($file_info['tmp_name'])) {
                    $post_data[$field_name] = new CURLFile(
                        $file_info['tmp_name'],
                        $file_info['type'] ?: 'application/octet-stream',
                        $file_info['name']
                    );
                }
            }
        }
    }
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
} else {
    // Stream raw body directly (works for JSON, text, and PUT/PATCH multipart streams)
    $raw_body = file_get_contents('php://input');
    if (!empty($raw_body) || in_array($method, ['POST', 'PUT', 'PATCH'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $raw_body);
    }
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'message' => 'Backend connection timeout. Please check VPS server.',
        'error' => curl_error($ch)
    ]);
    curl_close($ch);
    exit();
}

$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$response_headers = substr($response, 0, $header_size);
$response_body = substr($response, $header_size);
curl_close($ch);

// Forward HTTP status code
http_response_code($http_code);

// Forward response Content-Type and headers
$header_lines = explode("\r\n", $response_headers);
foreach ($header_lines as $header_line) {
    if (stripos($header_line, 'content-type:') === 0 || stripos($header_line, 'content-disposition:') === 0) {
        header($header_line);
    }
}

echo $response_body;
