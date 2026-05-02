/**
 * ------------------------------------------------------------------
 * CONCURRENCY / RACE CONDITION TEST
 * ------------------------------------------------------------------
 * This script proves that our backend SQL Transactions successfully 
 * prevent "Overselling". 
 * 
 * We simulate 10 users clicking "Buy" at the EXACT same millisecond 
 * for a product that only has 1 item in stock.
 */
const http = require('http');

const REQUESTS = 10;
let successCount = 0;
let failCount = 0;

console.log(`🔥 Firing ${REQUESTS} concurrent requests to buy the 'Limited Edition Sneaker' (Only 1 in stock)...`);
console.log(`⏳ Waiting for backend transaction resolution...\n`);

for (let i = 0; i < REQUESTS; i++) {
    const data = JSON.stringify({
        userId: 1, // John Doe
        productId: 1, // Limited Edition Sneaker (Stock: 1)
        quantity: 1
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/checkout',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
            const body = JSON.parse(responseBody);
            if (res.statusCode === 200) {
                console.log(`✅ Request ${i+1}: SUCCESS - ${body.message}`);
                successCount++;
            } else {
                console.log(`❌ Request ${i+1}: REJECTED - ${body.error}`);
                failCount++;
            }
            
            if (successCount + failCount === REQUESTS) {
                console.log("\n=======================================================");
                console.log("📊 TEST RESULTS");
                console.log("=======================================================");
                console.log(`Total Successes (Should be 1): ${successCount}`);
                console.log(`Total Rejections (Should be ${REQUESTS - 1}): ${failCount}`);
                if (successCount === 1) {
                    console.log("\n🎯 CONCURRENCY TEST PASSED!");
                    console.log("The SQL Transaction locked the database properly and prevented overselling.");
                } else {
                    console.log("\n⚠️ CONCURRENCY TEST FAILED! Overselling occurred.");
                }
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(data);
    req.end();
}
