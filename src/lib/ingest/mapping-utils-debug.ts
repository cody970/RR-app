import { autoMapHeaders, applyMapping } from "./mapping-utils";
import { industryTemplates } from "../reports/templates";

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error("❌ ASSERTION FAILED: " + message);
        process.exit(1);
    }
}

console.log("🚀 Starting CSV Mapping Verification...");

// Test Case 1: Spotify-like headers
const spotifyHeaders = ["track name", "artist name", "platform", "timestamp", "ms_played"];
const spotifyMapping = autoMapHeaders(spotifyHeaders, "DSP Report");
assert(spotifyMapping["track name"] === "Title", "Spotify Title mapping failed");
assert(spotifyMapping["artist name"] === "Artist", "Spotify Artist mapping failed");
assert(spotifyMapping["platform"] === "Source", "Spotify Source mapping failed");
console.log("✅ Test Case 1 Passed: Spotify-like headers");

// Test Case 2: ASCAP-like headers
const ascapHeaders = ["WORK TITLE", "ISRC", "PERFORMANCE QUARTER", "DOLLARS", "SOURCE"];
const ascapMapping = autoMapHeaders(ascapHeaders, "Statement Lines");
assert(ascapMapping["WORK TITLE"] === "Title", "ASCAP Title mapping failed");
assert(ascapMapping["ISRC"] === "ISRC", "ASCAP ISRC mapping failed");
assert(ascapMapping["DOLLARS"] === "Amount", "ASCAP Amount mapping failed");
console.log("✅ Test Case 2 Passed: ASCAP-like headers");

// Test Case 3: Mixed case and normalization
const mixedHeaders = ["TrackTitle ", "  isrc  ", "Net_Amount"];
const mixedMapping = autoMapHeaders(mixedHeaders, "Statement Lines");
assert(mixedMapping["TrackTitle "] === "Title", "Mixed Title mapping failed");
assert(mixedMapping["  isrc  "] === "ISRC", "Mixed ISRC mapping failed");
assert(mixedMapping["Net_Amount"] === "Amount", "Mixed Amount mapping failed");
console.log("✅ Test Case 3 Passed: Mixed case and normalization");

// Test Case 4: Templates
const spotifyTemplate = industryTemplates.SPOTIFY_STREAMING;
assert(spotifyTemplate.targetType === "DSP Report", "Spotify template type mismatch");
assert(spotifyTemplate.mapping["track name"] === "Title", "Spotify template mapping mismatch");
console.log("✅ Test Case 4 Passed: Industry Templates");

console.log("🎉 ALL VERIFICATION TESTS PASSED!");
