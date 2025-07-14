#!/bin/bash

# Farcaster Frame Testing Script
# Usage: ./scripts/test-frame.sh [base_url]

BASE_URL="${1:-http://localhost:3001}"

echo "🧪 Testing Farcaster Frame at $BASE_URL"
echo "================================================"

# Test Frame Page
echo "📄 Testing Frame Page..."
FRAME_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/frames/dustzap/")
echo "   GET /frames/dustzap/ → $FRAME_PAGE_STATUS"

# Test Frame API GET
echo "🔗 Testing Frame API GET..."
FRAME_API_GET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frames/dustzap/")
echo "   GET /api/frames/dustzap/ → $FRAME_API_GET_STATUS"

# Test Frame API POST
echo "📨 Testing Frame API POST..."
FRAME_API_POST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/frames/dustzap/" \
  -H "Content-Type: application/json" \
  -d '{"untrustedData": {"fid": 12345, "buttonIndex": 1}}')
echo "   POST /api/frames/dustzap/ → $FRAME_API_POST_STATUS"

# Test Image Endpoints
echo "🖼️  Testing Image Generation..."
IMAGE_DEFAULT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frames/image/?type=default")
echo "   GET /api/frames/image/?type=default → $IMAGE_DEFAULT_STATUS"

IMAGE_DUST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frames/image/?type=dust&tokens=5&value=25.50")
echo "   GET /api/frames/image/?type=dust → $IMAGE_DUST_STATUS"

IMAGE_CLEAN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frames/image/?type=clean")
echo "   GET /api/frames/image/?type=clean → $IMAGE_CLEAN_STATUS"

IMAGE_NO_WALLET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frames/image/?type=no-wallet")
echo "   GET /api/frames/image/?type=no-wallet → $IMAGE_NO_WALLET_STATUS"

IMAGE_ERROR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/frames/image/?type=error")
echo "   GET /api/frames/image/?type=error → $IMAGE_ERROR_STATUS"

# Test Meta Tags
echo "🏷️  Testing Frame Meta Tags..."
FRAME_HTML=$(curl -s "$BASE_URL/api/frames/dustzap/")

if echo "$FRAME_HTML" | grep -q 'fc:frame.*vNext'; then
    echo "   ✅ Farcaster frame meta tag found"
else
    echo "   ❌ Farcaster frame meta tag missing"
fi

if echo "$FRAME_HTML" | grep -q 'fc:frame:image'; then
    echo "   ✅ Frame image meta tag found"
else
    echo "   ❌ Frame image meta tag missing"
fi

if echo "$FRAME_HTML" | grep -q 'fc:frame:button:1'; then
    echo "   ✅ Frame button meta tag found"
else
    echo "   ❌ Frame button meta tag missing"
fi

if echo "$FRAME_HTML" | grep -q 'og:title'; then
    echo "   ✅ Open Graph title found"
else
    echo "   ❌ Open Graph title missing"
fi

echo ""
echo "🎯 Summary:"
echo "   Frame Page: $FRAME_PAGE_STATUS"
echo "   API GET: $FRAME_API_GET_STATUS"
echo "   API POST: $FRAME_API_POST_STATUS"
echo "   Images: $IMAGE_DEFAULT_STATUS $IMAGE_DUST_STATUS $IMAGE_CLEAN_STATUS $IMAGE_NO_WALLET_STATUS $IMAGE_ERROR_STATUS"

# Success check
if [ "$FRAME_PAGE_STATUS" = "200" ] && [ "$FRAME_API_GET_STATUS" = "200" ] && [ "$FRAME_API_POST_STATUS" = "200" ] && [ "$IMAGE_DEFAULT_STATUS" = "200" ]; then
    echo "   ✅ All core endpoints working!"
else
    echo "   ❌ Some endpoints failed"
    exit 1
fi

echo ""
echo "🔗 Next Steps:"
echo "   1. Run automated tests: TEST=true yarn test __tests__/frames/ --run"
echo "   2. Validate with Farcaster: https://warpcast.com/~/developers/frames"
echo "   3. Test in Warpcast by sharing: $BASE_URL/frames/dustzap/"