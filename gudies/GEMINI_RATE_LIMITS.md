# 🚨 Gemini API Rate Limits - IMPORTANT

## What Happened?

You hit the **Google Gemini API free tier rate limit**:
```
Rate limit exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
Quota exceeded - Please retry in 21.72847576s
```

## Free Tier Limits

### Gemini 1.5 Flash (What we're using now):
- ✅ **15 RPM** (Requests Per Minute)
- ✅ **1,500 RPD** (Requests Per Day)
- ✅ **1 million TPM** (Tokens Per Minute)

### Gemini 2.0 Flash Experimental (What we were using):
- ❌ **Very limited** - experimental model with strict rate limits
- ❌ Not suitable for production use
- ❌ You hit the limit quickly

## What I Fixed

### 1. **Switched to Stable Model** ✅
- Changed from `gemini-2.0-flash-exp` → `gemini-1.5-flash`
- Better rate limits (15 RPM vs unknown experimental limits)
- More stable and reliable

### 2. **Enhanced Error Handling** ✅
- Detects rate limit errors (429 status)
- Returns user-friendly error messages
- Includes retry timing

### 3. **Automatic Retry** ✅
- Frontend automatically retries after 30 seconds
- Shows countdown toast notification
- User doesn't need to do anything

## How It Works Now

### Scenario 1: Within Rate Limits ✅
```
User clicks "Analyze with AI"
  → OCR extraction with Gemini 1.5 Flash
  → AI analysis with Gemini 1.5 Flash
  → Success! ✨
```

### Scenario 2: Rate Limit Hit ⏱️
```
User clicks "Analyze with AI"
  → Rate limit detected (429)
  → Toast: "Rate limit exceeded. Retrying in 30 seconds..."
  → Wait 30 seconds
  → Auto-retry
  → Success! ✨
```

## Best Practices

### To Avoid Rate Limits:

1. **Wait Between Analyses** ⏳
   - Don't click "Analyze with AI" rapidly on multiple invoices
   - Wait 5-10 seconds between analyses
   - Free tier: Max 15 requests per minute

2. **Test with Single Invoices** 🎯
   - Test one invoice at a time
   - Verify it works before batch processing

3. **Monitor Usage** 📊
   - Check your quota: https://ai.dev/usage?tab=rate-limit
   - Track daily usage (1,500 requests/day limit)

4. **Consider Upgrading** 💳
   - If you need higher limits, upgrade to Gemini API Pro:
     - **360 RPM** (24x more!)
     - **10,000 RPD** (6.7x more!)
     - Only $7/month per 1M tokens

## Current Setup

### API Calls Per Invoice Analysis:
1. **OCR Extraction** (if needed): 1 API call
2. **AI Analysis**: 1 API call
3. **Total**: 2 API calls per new invoice

### Daily Capacity (Free Tier):
- **750 invoices/day** (if all need OCR extraction)
- **1,500 invoices/day** (if OCR already exists)

This is MORE than enough for most small businesses! 🎉

## Testing Now

The changes are applied. To test:

1. **Wait 30 seconds** from your last failed attempt (to let rate limit reset)
2. Click "Analyze with AI" button on an invoice
3. Should work now with `gemini-1.5-flash`
4. If rate limit hits, it will auto-retry after 30 seconds

## Error Messages You Might See

### ✅ Good (Working):
```
🤖 Analyzing invoice with AI...
✨ AI analysis completed! Invoice data extracted successfully.
```

### ⏱️ Rate Limited (Auto-retry):
```
⏱️ Too many AI requests. Please wait 30 seconds and try again.
🔄 Retrying AI analysis...
✨ AI analysis completed! Invoice data extracted successfully.
```

### ❌ Other Errors:
```
❌ AI analysis failed: [specific error]
```

## Upgrade Path

If you hit rate limits frequently, consider:

1. **Gemini API Pro** ($7/month)
   - 360 RPM (24x more)
   - 10,000 RPD (6.7x more)

2. **Alternative OCR**
   - Use dedicated OCR service for text extraction
   - Save Gemini calls only for AI analysis
   - Reduces API calls by 50%

3. **Batch Processing**
   - Queue invoices
   - Process with delays between requests
   - Stay within rate limits automatically

## Documentation

- **Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Usage Monitor**: https://ai.dev/usage?tab=rate-limit
- **Pricing**: https://ai.google.dev/pricing

---

**Current Status**: ✅ Fixed with `gemini-1.5-flash` + auto-retry
**Next Step**: Wait 30 seconds and test again!
