require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testNewGeminiAPI() {
  console.log('🚀 Testing New Gemini API with gemini-2.5-flash...');
  console.log('API Key:', process.env.GEMINI_API_KEY ? 'Present ✅' : 'Missing ❌');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ No Gemini API key found!');
    return;
  }

  try {
    console.log('\n🤖 Initializing Gemini AI with new SDK...');
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('📤 Sending test request to gemini-2.5-flash...');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Explain why alt text is important for web accessibility in 2 sentences."
    });

    console.log('✅ Gemini AI API WORKS!');
    console.log('📥 Response:');
    console.log(response.text);
    console.log('\n🎉 Ready to use Gemini 2.5 Flash for accessibility suggestions!');
    
  } catch (error) {
    console.log('❌ Gemini AI API FAILED');
    console.error('Error details:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n🔑 Your API key is invalid.');
    } else if (error.message.includes('not found')) {
      console.log('\n⚠️ Model gemini-2.5-flash not found. Trying gemini-1.5-flash...');
      
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: "Test message"
        });
        console.log('✅ Fallback model works:', fallbackResponse.text);
      } catch (fallbackError) {
        console.log('❌ Fallback also failed:', fallbackError.message);
      }
    }
  }
}

testNewGeminiAPI();