#!/bin/bash
# SDK Generation Script
# 
# This script generates TypeScript and Python SDKs from the OpenAPI spec.
# Prerequisites: openapi-generator-cli must be installed
#   npm install -g @openapitools/openapi-generator-cli
#
# Usage:
#   ./scripts/generate-sdk.sh [typescript|python|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SDK_OUTPUT_DIR="$PROJECT_ROOT/sdk"

# OpenAPI spec URL (must have the app running)
OPENAPI_SPEC_URL="${OPENAPI_SPEC_URL:-http://localhost:3000/api/docs}"
OPENAPI_SPEC_FILE="$SDK_OUTPUT_DIR/openapi.json"

# SDK package info
PACKAGE_NAME="royaltyradar"
PACKAGE_VERSION="1.0.0"

echo "🔧 RoyaltyRadar SDK Generator"
echo "=============================="

# Ensure SDK output directory exists
mkdir -p "$SDK_OUTPUT_DIR"

# Download OpenAPI spec if URL is accessible
fetch_spec() {
    echo "📥 Fetching OpenAPI spec from $OPENAPI_SPEC_URL..."
    if curl -s --fail "$OPENAPI_SPEC_URL" -o "$OPENAPI_SPEC_FILE"; then
        echo "✅ OpenAPI spec downloaded to $OPENAPI_SPEC_FILE"
    else
        echo "❌ Failed to fetch OpenAPI spec. Make sure the app is running."
        echo "   Run: npm run dev"
        echo "   Then retry this script."
        exit 1
    fi
}

generate_typescript_sdk() {
    echo ""
    echo "🟦 Generating TypeScript SDK..."
    
    openapi-generator-cli generate \
        -i "$OPENAPI_SPEC_FILE" \
        -g typescript-fetch \
        -o "$SDK_OUTPUT_DIR/typescript" \
        --additional-properties=npmName="@$PACKAGE_NAME/sdk",npmVersion="$PACKAGE_VERSION",supportsES6=true,typescriptThreePlus=true
    
    echo "✅ TypeScript SDK generated at $SDK_OUTPUT_DIR/typescript"
    echo "   To use: cd $SDK_OUTPUT_DIR/typescript && npm install && npm run build"
}

generate_python_sdk() {
    echo ""
    echo "🐍 Generating Python SDK..."
    
    openapi-generator-cli generate \
        -i "$OPENAPI_SPEC_FILE" \
        -g python \
        -o "$SDK_OUTPUT_DIR/python" \
        --additional-properties=packageName="$PACKAGE_NAME",projectName="$PACKAGE_NAME-sdk",packageVersion="$PACKAGE_VERSION"
    
    echo "✅ Python SDK generated at $SDK_OUTPUT_DIR/python"
    echo "   To install: cd $SDK_OUTPUT_DIR/python && pip install -e ."
}

# Parse command line argument
TARGET="${1:-all}"

case "$TARGET" in
    typescript|ts)
        fetch_spec
        generate_typescript_sdk
        ;;
    python|py)
        fetch_spec
        generate_python_sdk
        ;;
    all)
        fetch_spec
        generate_typescript_sdk
        generate_python_sdk
        ;;
    *)
        echo "Usage: $0 [typescript|python|all]"
        exit 1
        ;;
esac

echo ""
echo "🎉 SDK generation complete!"
echo ""
echo "Next steps:"
echo "  1. Review the generated SDK code"
echo "  2. Update any custom configurations if needed"
echo "  3. Publish to npm/PyPI for distribution"
