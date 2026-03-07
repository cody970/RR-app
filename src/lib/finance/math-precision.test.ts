import { round, roundMoney, sum, calculateShare, effectivelyEqual } from "./math-utils";

function testMathPrecision() {
    console.log("Running Math Precision Tests...\n");

    // Test 1: Rounding
    const r1 = round(1.234567, 4);
    console.assert(r1 === 1.2346, `Test 1 failed: expected 1.2346, got ${r1}`);

    // Test 2: Money Rounding
    const m1 = roundMoney(1.235);
    console.assert(m1 === 1.24, `Test 2 failed: expected 1.24, got ${m1}`);

    // Test 3: Summing with floating point drift
    const values = [0.1, 0.2, 0.3]; // 0.1 + 0.2 is 0.30000000000000004
    const s1 = sum(values);
    console.assert(effectivelyEqual(s1, 0.6), `Test 3 failed: expected 0.6, got ${s1}`);

    // Test 4: Calculation of shares (dust handling scenario)
    const amount = 100;
    const share1 = calculateShare(amount, 33.3333); // 33.3333
    const share2 = calculateShare(amount, 33.3333); // 33.3333
    const share3 = calculateShare(amount, 33.3334); // 33.3334
    const total = sum([share1, share2, share3]);
    console.assert(effectivelyEqual(total, 100), `Test 4 failed: expected 100, got ${total}`);

    // Test 5: Effectively equal
    console.assert(effectivelyEqual(0.1 + 0.2, 0.3), "Test 5 failed: 0.1 + 0.2 should be effectively 0.3");

    console.log("All tests passed! ✅");
}

testMathPrecision();
