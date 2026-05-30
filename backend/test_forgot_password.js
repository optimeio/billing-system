const http = require("http");

const testData = JSON.stringify({
    loginId: "thesmgroups@gmail.com"
});

const options = {
    hostname: "localhost",
    port: 5002,
    path: "/api/auth/forgot-password",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(testData)
    }
};

console.log("Sending forgot password request...");

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let data = "";
    
    res.on("data", (chunk) => {
        data += chunk;
    });
    
    res.on("end", () => {
        console.log("Response Body:");
        try {
            console.log(JSON.stringify(JSON.parse(data), null, 2));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on("error", (e) => {
    console.error(`❌ HTTP request error: ${e.message}`);
});

req.write(testData);
req.end();
