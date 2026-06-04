const http = require("http");

function makePostRequest(path, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: "localhost",
            port: 5002,
            path: path,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => body += chunk);
            res.on("end", () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        body: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        body: body
                    });
                }
            });
        });

        req.on("error", (err) => reject(err));
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log("================================================================");
    console.log("       BILLING SOFTWARE AUTHENTICATION VERIFICATION SUITE       ");
    console.log("================================================================\n");

    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Admin Login Verification
    totalTests++;
    console.log(`[Test 1] Verifying Admin Login: thesmgroups@gmail.com...`);
    try {
        const result = await makePostRequest("/api/auth/login", {
            loginId: "thesmgroups@gmail.com",
            password: "TSMGPVT@2026"
        });
        if (result.statusCode === 200 && result.body.token && result.body.user.role === "admin") {
            console.log("   👉 PASS: Admin logged in successfully. Token generated. Role: admin.\n");
            passedTests++;
        } else {
            console.error(`   ❌ FAIL: Admin login failed. Status: ${result.statusCode}, Response:`, result.body, "\n");
        }
    } catch (err) {
        console.error("   ❌ FAIL: Error during Admin login:", err.message, "\n");
    }

    // Test 1b: Extra Admin Login Verification
    totalTests++;
    console.log(`[Test 1b] Verifying Extra Admin Login: tsmgmdofficial@gmail.com...`);
    try {
        const result = await makePostRequest("/api/auth/login", {
            loginId: "tsmgmdofficial@gmail.com",
            password: "TSMG1997"
        });
        if (result.statusCode === 200 && result.body.token && result.body.user.role === "admin") {
            console.log("   👉 PASS: Extra Admin logged in successfully. Token generated. Role: admin.\n");
            passedTests++;
        } else {
            console.error(`   ❌ FAIL: Extra Admin login failed. Status: ${result.statusCode}, Response:`, result.body, "\n");
        }
    } catch (err) {
        console.error("   ❌ FAIL: Error during Extra Admin login:", err.message, "\n");
    }

    // Test 2: Inventory Manager Login Verification
    totalTests++;
    console.log(`[Test 2] Verifying Inventory Manager Login: theoptime.io@gmail.com (role: inventory_manager)...`);
    try {
        const result = await makePostRequest("/api/auth/login", {
            loginId: "theoptime.io@gmail.com",
            password: "TSMG1997"
        });
        if (result.statusCode === 200 && result.body.token && result.body.user.role === "inventory_manager") {
            console.log("   👉 PASS: Inventory Manager logged in successfully. Token generated. Role: inventory_manager.\n");
            passedTests++;
        } else {
            console.error(`   ❌ FAIL: Inventory Manager login failed. Status: ${result.statusCode}, Response:`, result.body, "\n");
        }
    } catch (err) {
        console.error("   ❌ FAIL: Error during Inventory Manager login:", err.message, "\n");
    }

    // Test 3: Staff Login Verification
    totalTests++;
    console.log(`[Test 3] Verifying Staff Login: shreenithya111@gmail.com...`);
    try {
        const result = await makePostRequest("/api/auth/login", {
            loginId: "shreenithya111@gmail.com",
            password: "StaffPassword123"
        });
        if (result.statusCode === 200 && result.body.token && result.body.user.role === "staff") {
            console.log("   👉 PASS: Staff logged in successfully. Token generated. Role: staff.\n");
            passedTests++;
        } else {
            console.error(`   ❌ FAIL: Staff login failed. Status: ${result.statusCode}, Response:`, result.body, "\n");
        }
    } catch (err) {
        console.error("   ❌ FAIL: Error during Staff login:", err.message, "\n");
    }

    // Test 4: Forgot Password Email/OTP Generation Verification
    totalTests++;
    console.log(`[Test 4] Verifying Forgot Password API Flow for thesmgroups@gmail.com...`);
    try {
        const result = await makePostRequest("/api/auth/forgot-password", {
            loginId: "thesmgroups@gmail.com"
        });
        if (result.statusCode === 200 && result.body.message.includes("OTP sent")) {
            console.log("   👉 PASS: Forgot password request completed successfully. OTP email sent.\n");
            passedTests++;
        } else {
            console.error(`   ❌ FAIL: Forgot password request failed. Status: ${result.statusCode}, Response:`, result.body, "\n");
        }
    } catch (err) {
        console.error("   ❌ FAIL: Error during Forgot password request:", err.message, "\n");
    }

    console.log("================================================================");
    console.log(`VERIFICATION SUMMARY: Passed ${passedTests}/${totalTests} tests.`);
    console.log("================================================================");
    
    if (passedTests === totalTests) {
        console.log("🏆 ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY! The system is fully operational.");
        process.exit(0);
    } else {
        console.error("⚠️ SOME VERIFICATION TESTS FAILED. Please review the output above.");
        process.exit(1);
    }
}

// Give a short delay to make sure dev server is listening, then run
setTimeout(() => {
    runTests();
}, 500);
