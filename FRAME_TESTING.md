# Farcaster Frame Testing Guide

This guide covers how to test your Farcaster iframe implementation for the Dust Cleanup feature.

## Overview

Your Farcaster Frame consists of:

- **API Route**: `/pages/api/frames/dustzap.ts` - Handles frame interactions
- **Image Generator**: `/pages/api/frames/image.tsx` - Creates dynamic OG images
- **Frame Page**: `/pages/frames/dustzap.tsx` - Landing page with frame metadata

## Quick Start

### 1. Local Development Testing

```bash
# Start the development server
doppler run -- yarn dev

# Your frame will be available at:
# - Frame page: http://localhost:3001/frames/dustzap/
# - API endpoint: http://localhost:3001/api/frames/dustzap/
# - Image endpoint: http://localhost:3001/api/frames/image/?type=default
```

### 2. Run Automated Tests

```bash
# Run all frame tests
TEST=true yarn test __tests__/frames/ --run

# Run with coverage
TEST=true yarn coverage __tests__/frames/

# Run specific test file
TEST=true yarn test __tests__/frames/frameAPI.test.js --run
```

## Testing Endpoints Manually

### Frame Metadata (GET)

```bash
curl "http://localhost:3001/api/frames/dustzap/"
```

Should return HTML with Farcaster frame meta tags.

### Frame Interaction (POST)

```bash
curl -X POST "http://localhost:3001/api/frames/dustzap/" \
  -H "Content-Type: application/json" \
  -d '{"untrustedData": {"fid": 12345, "buttonIndex": 1}}'
```

### Image Generation

```bash
# Default image
curl "http://localhost:3001/api/frames/image/?type=default" -I

# Dust image with data
curl "http://localhost:3001/api/frames/image/?type=dust&tokens=5&value=25.50&wallet=0x123" -I

# Other image types: clean, no-wallet, error
curl "http://localhost:3001/api/frames/image/?type=clean" -I
```

## Farcaster Frame Validation

### Online Validators

1. **Farcaster Frame Validator** (Primary)

   - URL: https://warpcast.com/~/developers/frames
   - Enter your deployed frame URL
   - Tests frame metadata and functionality

2. **Frames.js Validator** (Alternative)
   - URL: https://frames.js.org/
   - Comprehensive frame development toolkit

### Manual Testing in Farcaster

1. Deploy your frame to a public URL (staging/production)
2. Share the frame URL in a Warpcast cast
3. Interact with frame buttons to test functionality
4. Verify POST requests hit your API correctly

## Test Scenarios Covered

### Unit Tests (`dustzapFrame.test.js`)

- ✅ Frame HTML generation with different button types
- ✅ Multiple button handling
- ✅ Dust calculation logic
- ✅ URL generation patterns
- ✅ Error handling scenarios

### Integration Tests (`frameAPI.test.js`)

- ✅ GET endpoint returns proper frame HTML
- ✅ POST endpoint handles dust token retrieval
- ✅ Clean wallet scenario (no tokens)
- ✅ API error handling (no-wallet state)
- ✅ Unsupported HTTP methods (405 response)
- ✅ Required Farcaster meta tags
- ✅ Open Graph tags
- ✅ Token value calculations

### Image Tests (`frameImage.test.js`)

- ✅ Image generation for all frame states
- ✅ Parameter parsing and defaults
- ✅ Error handling for image generation
- ✅ Correct dimensions (1200x630)
- ✅ Wallet address formatting
- ✅ Content validation

## Frame States

Your frame handles these states:

1. **Default**: Initial frame load
2. **Dust**: Shows dust tokens found (tokens > 0)
3. **Clean**: No dust tokens found (tokens = 0)
4. **No-wallet**: User hasn't connected wallet in Farcaster
5. **Error**: Unexpected errors occurred

## Environment Configuration

The frame uses `NEXT_PUBLIC_URL` environment variable:

- Development: defaults to `http://localhost:3000`
- Production: should be set to your deployed URL

⚠️ **Note**: Your dev server runs on port 3001, but frame URLs use port 3000. Update the environment variable for local testing if needed.

## Debugging Tips

### Check Frame Meta Tags

Use browser dev tools to inspect the frame page HTML and verify all required meta tags are present:

```html
<meta name="fc:frame" content="vNext" />
<meta name="fc:frame:image" content="..." />
<meta name="fc:frame:post_url" content="..." />
<meta name="fc:frame:button:1" content="..." />
```

### Monitor API Logs

Your frame API includes console.log statements for debugging:

- `📡 Frame GET request received`
- `📨 Frame POST request received`
- `🔍 Fetching tokens for test wallet`
- `📊 Dust analysis`
- `🎯 Generated cleanup URL`

### Test Different User States

Mock different scenarios by modifying the test wallet address and mocking API responses:

- User with dust tokens
- User with clean wallet
- User without verified Farcaster wallet
- API errors

## Common Issues

1. **Port Mismatch**: Dev server on 3001 but URLs use 3000
2. **CORS Issues**: Ensure proper headers for cross-origin requests
3. **Image Generation**: Verify @vercel/og dependency and edge runtime config
4. **Meta Tag Format**: Follow exact Farcaster frame specification

## Production Deployment

Before deploying:

1. ✅ All tests pass
2. ✅ Frame validates with Farcaster tools
3. ✅ Set correct `NEXT_PUBLIC_URL` environment variable
4. ✅ Test frame interaction in actual Farcaster client

## Resources

- [Farcaster Frame Specification](https://docs.farcaster.xyz/developers/frames/spec)
- [Frames.js Documentation](https://frames.js.org/)
- [Warpcast Developer Tools](https://warpcast.com/~/developers)
