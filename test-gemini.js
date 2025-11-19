// Test Google Gemini API endpoint directly
const GOOGLE_GEMINI_API_KEY = 'AIzaSyDXyKwzY3tyIKQ6DksTrC7uThxyFsCsZFU'

async function testGemini() {
  console.log('🧪 Testing Google Gemini API...')
  console.log('API Key present:', !!GOOGLE_GEMINI_API_KEY)
  console.log('API Key (first 10 chars):', GOOGLE_GEMINI_API_KEY?.substring(0, 10))
  
  const testPrompt = 'Extract invoice data from this text: Invoice #12345, Date: 2024-01-15, Total: $100.00. Return ONLY valid JSON with fields: invoice_number, date, total.'
  
  try {
    console.log('\n📤 Making request to Google Gemini...')
    console.log('Endpoint: https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent')
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: testPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500
          }
        })
      }
    )
    
    console.log('\n📥 Response Status:', response.status)
    console.log('Response Status Text:', response.statusText)
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('\n📄 Raw Response:', responseText)
    
    if (!response.ok) {
      console.error('\n❌ API Error!')
      console.error('Status:', response.status)
      console.error('Response:', responseText)
      
      try {
        const errorJson = JSON.parse(responseText)
        console.error('Error Details:', JSON.stringify(errorJson, null, 2))
      } catch (e) {
        console.error('Could not parse error as JSON')
      }
      
      return
    }
    
    const data = JSON.parse(responseText)
    console.log('\n✅ Success! API Response:', JSON.stringify(data, null, 2))
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      console.log('\n📝 AI Response Content:')
      console.log(data.candidates[0].content.parts[0].text)
    }
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testGemini()
