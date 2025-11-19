// Test the analyze-invoice API endpoint
const testInvoiceId = process.argv[2] || 'test-invoice-id'

async function testAnalyzeAPI() {
  console.log('🧪 Testing /api/analyze-invoice endpoint...')
  console.log('Invoice ID:', testInvoiceId)
  
  try {
    const response = await fetch('http://localhost:3001/api/analyze-invoice', {
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
    
    const data = await response.json()
    console.log('\n📄 Response Data:', JSON.stringify(data, null, 2))
    
    if (!response.ok) {
      console.error('\n❌ API Error!')
    } else {
      console.log('\n✅ Success!')
    }
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testAnalyzeAPI()
