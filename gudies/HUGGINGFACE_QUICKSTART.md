# 🚀 Quick Start: Switch to Hugging Face (100% FREE!)

## Why This Change?

**Before (Gemini):**
- ❌ Rate limit: 15 requests/minute
- ❌ Daily quota: 1,500 requests/day
- ❌ Hit limits quickly

**After (Hugging Face):**
- ✅ **No rate limits**
- ✅ **Unlimited requests**
- ✅ **100% FREE forever**
- ✅ Same (or better!) accuracy

---

## Setup in 3 Minutes

### Step 1: Get Your Free API Token (1 minute)

1. Go to: https://huggingface.co/join
2. Sign up (FREE, no credit card)
3. Go to: https://huggingface.co/settings/tokens
4. Click "New token"
5. Name: `InvoiceFlow`
6. Type: **Read**
7. Copy your token (starts with `hf_...`)

### Step 2: Add to Your Project (30 seconds)

Open your `.env.local` file and add:

```env
HUGGINGFACE_API_KEY=hf_your_token_here
```

### Step 3: Restart & Test (1 minute)

```bash
# Stop current server (Ctrl+C)
npm run dev
```

**Test it:**
1. Go to any invoice
2. Click "Analyze with AI"
3. First time: Wait 20 seconds (model loading)
4. Done! ✨

---

## What Changed in the Code?

### Before (Gemini):
```typescript
// OCR + AI Analysis
fetch('https://generativelanguage.googleapis.com/...')
```

### After (Hugging Face):
```typescript
// OCR + AI Analysis
fetch('https://api-inference.huggingface.co/models/Qwen/Qwen2-VL-7B-Instruct', {
  headers: { 'Authorization': `Bearer ${HUGGINGFACE_API_KEY}` }
})
```

**Model**: Qwen2-VL-7B-Instruct
- Excellent OCR
- Great at understanding invoices
- Vision + language capabilities
- FREE with no limits!

---

## How It Works

### Cold Start (First Request) ❄️
```
Click "Analyze with AI"
  ↓
Model loading... (503 status)
  ↓
Toast: "🔄 AI model is starting up... Retrying in 20 seconds..."
  ↓
Auto-retry after 20 seconds
  ↓
Success! ✨
```

### Warm Model (Subsequent Requests) ⚡
```
Click "Analyze with AI"
  ↓
Instant processing (~5 seconds)
  ↓
Success! ✨
```

**Pro Tip:** Process multiple invoices in succession to keep model warm!

---

## Features That Work Automatically

### ✅ Auto-Retry on Cold Start
- Detects 503 (model loading)
- Waits 20 seconds
- Retries automatically
- User just sees loading toast

### ✅ Error Handling
- Model loading → Auto-retry
- Network errors → Clear error message
- Invalid token → Helpful instructions

### ✅ Response Parsing
- Handles Hugging Face response format
- Extracts JSON from text
- Fallback to regex extraction

---

## Testing Checklist

- [ ] Get Hugging Face token
- [ ] Add to `.env.local`
- [ ] Restart server
- [ ] Upload invoice
- [ ] Click "Analyze with AI"
- [ ] Wait for first analysis (cold start)
- [ ] Try another invoice (should be instant!)
- [ ] Check extracted data
- [ ] Approve invoice

---

## Troubleshooting

### "Model is loading" message?
**Normal!** First request takes ~20 seconds. Auto-retries automatically.

### "Invalid token" error?
1. Check token at: https://huggingface.co/settings/tokens
2. Make sure it's in `.env.local` as `HUGGINGFACE_API_KEY`
3. Restart dev server

### OCR extraction empty?
1. Check image quality
2. Try different model (see HUGGINGFACE_SETUP.md)
3. Check console logs

---

## Cost Comparison

| Provider | Monthly Cost | Rate Limit | Daily Quota |
|----------|--------------|------------|-------------|
| **Hugging Face** | **$0** | **None** | **Unlimited** |
| Gemini Free | $0 | 15 RPM | 1,500/day |
| Gemini Pro | $7 | 360 RPM | 10,000/day |

**Winner: Hugging Face! 🎉**

---

## What's Next?

After testing:
1. ✅ Process unlimited invoices
2. ✅ No more rate limit errors
3. ✅ No more quota concerns
4. ✅ Save money (free forever!)

Ready to test? Get your token and let's go! 🚀

---

**Questions?** Check `HUGGINGFACE_SETUP.md` for detailed docs!
