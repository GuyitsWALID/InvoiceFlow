// Test Hugging Face API endpoint directly
// Run with: HUGGINGFACE_API_KEY=your_key node test-huggingface.js
// Or set it directly below

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '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'

async function testHuggingFace() {
  console.log('🧪 Testing Hugging Face API...')
  console.log('API Key present:', !!HUGGINGFACE_API_KEY)
  console.log('API Key (first 10 chars):', HUGGINGFACE_API_KEY?.substring(0, 10))
  
  const testPrompt = 'Extract invoice data from this text: Invoice #12345, Date: 2024-01-15, Total: $100.00'
  
  try {
    console.log('\n📤 Making request to Hugging Face...')
    console.log('Endpoint: https://router.huggingface.co/v1/chat/completions')
    console.log('Model: meta-llama/Llama-3.1-8B-Instruct')
    
    const response = await fetch(
      'https://router.huggingface.co/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          messages: [
            {
              role: 'user',
              content: testPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.1,
          stream: false
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
      
      // Try to parse error JSON
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
    
    if (data.choices && data.choices[0]?.message?.content) {
      console.log('\n📝 AI Response Content:')
      console.log(data.choices[0].message.content)
    }
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testHuggingFace()
