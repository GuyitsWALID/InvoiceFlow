# Quick script to add environment variables to Vercel
# Run: vercel env add HUGGINGFACE_API_KEY

Write-Host "🚀 Vercel Environment Variable Setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these commands to add your environment variables to Vercel:" -ForegroundColor Yellow
Write-Host ""

$envVars = @{
    "NEXT_PUBLIC_SUPABASE_URL" = "https://cihcwbrjrdhqttopkeur.supabase.co"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaGN3YnJqcmRocXR0b3BrZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzE5NDcsImV4cCI6MjA3Nzk0Nzk0N30.Hrj0xhpPwEDQoMw2Kv1gKm1tmOrcqWxa01kE4U2jed4"
    "SUPABASE_SERVICE_ROLE_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaGN3YnJqcmRocXR0b3BrZXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3MTk0NywiZXhwIjoyMDc3OTQ3OTQ3fQ.8QM4BES6D0axQuPX4rWBVHHgAx5sqRQZMyNIgYY7s-g"
    "HUGGINGFACE_API_KEY" = "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"
    "GOOGLE_GEMINI_API_KEY" = "AIzaSyDXyKwzY3tyIKQ6DksTrC7uThxyFsCsZFU"
    "NEXT_PUBLIC_APP_URL" = "https://invoice-flow-ai.vercel.app"
    "ENCRYPTION_KEY" = "61d743f589de443900102128afebd16c"
}

foreach ($key in $envVars.Keys) {
    Write-Host "vercel env add $key production" -ForegroundColor Green
    Write-Host "  Value: $($envVars[$key])" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "OR use the Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Go to Settings → Environment Variables" -ForegroundColor White
Write-Host "4. Add each variable above" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  CRITICAL: HUGGINGFACE_API_KEY is required for AI invoice analysis!" -ForegroundColor Red
