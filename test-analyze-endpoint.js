// Test the analyze-invoice API with real endpoint
async function testAnalyzeAPI() {
  console.log('🧪 Testing /api/analyze-invoice endpoint...')
  
  // This will fail because we need a real invoice_id, but we'll see the actual error
  const testInvoiceId = 'test-invoice-id-12345'
  
  try {
    console.log('\n📤 Making request to localhost:3000...')
    const response = await fetch('http://localhost:3000/api/analyze-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice_id: testInvoiceId
      })
    })
    
    console.log('\n📥 Response Status:', response.status)
    console.log('Response Status Text:', response.statusText)
    
    const responseText = await response.text()
    console.log('\n📄 Raw Response:', responseText)
    
    if (!response.ok) {
      console.error('\n❌ API Error!')
      try {
        const errorJson = JSON.parse(responseText)
        console.error('Error Details:', JSON.stringify(errorJson, null, 2))
      } catch (e) {
        console.error('Could not parse error as JSON')
      }
    } else {
      const data = JSON.parse(responseText)
      console.log('\n✅ Success! API Response:', JSON.stringify(data, null, 2))
    }
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testAnalyzeAPI()
