/**
 * scripts/testBackend.js
 * Standalone verification script for the Somi backend.
 */
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000';

async function runTests() {
  console.log('--- Starting Backend Verification ---');

  // Test 1: Health Check
  console.log('\n[1/3] Testing /health endpoint...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert(healthRes.ok, '/health should return 200 OK');
  const healthData = await healthRes.json();
  assert(healthData.status === 'ok', '/health should have status: "ok"');
  console.log('✅ Health check passed.');

  // Test 2: Analyze Meal
  console.log('\n[2/3] Testing /api/analyze-meal endpoint...');
  const analyzeRes = await fetch(`${BASE_URL}/api/analyze-meal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meal_text: '1 apple',
      user_profile: {}
    })
  });
  
  if (!analyzeRes.ok) {
    const errorBody = await analyzeRes.text();
    console.error(`Status: ${analyzeRes.status}`);
    console.error(`Body: ${errorBody}`);
  }
  assert(analyzeRes.ok, '/api/analyze-meal should return 200 OK');
  const analyzeData = await analyzeRes.json();
  
  // Verify strict JSON schema properties
  assert(analyzeData.parsed_items, 'Response missing "parsed_items"');
  assert(analyzeData.meal_totals, 'Response missing "meal_totals"');
  assert(analyzeData.catalog_additions, 'Response missing "catalog_additions"');
  assert(analyzeData.medical_flags, 'Response missing "medical_flags"');
  
  // Verify catalog additions is populated correctly
  assert(Array.isArray(analyzeData.catalog_additions), '"catalog_additions" must be an array');
  assert(analyzeData.catalog_additions.length > 0, '"catalog_additions" should have at least 1 item for "apple"');
  console.log('✅ Analyze meal JSON schema and caching catalog_additions verified.');

  // Test 3: Audio Transcription
  console.log('\n[3/3] Testing /api/transcribe endpoint (Realistic WAV check)...');
  
  // Programmatically generate a 1-second 8kHz mono PCM WAV file (pure silence)
  function createSilentWavBuffer() {
    const sampleRate = 8000;
    const dataSize = sampleRate * 1 * 2 * 1; // rate * channels * bytes/sample * seconds
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    return buffer;
  }

  const formData = new FormData();
  const validBlob = new Blob([createSilentWavBuffer()], { type: 'audio/wav' });
  formData.append('audio', validBlob, 'silence.wav');

  const transcribeRes = await fetch(`${BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData
  });

  if (!transcribeRes.ok) {
    const errorBody = await transcribeRes.text();
    console.log(`Transcribe status: ${transcribeRes.status}`);
    console.log(`Transcribe body: ${errorBody}`);
    assert(transcribeRes.ok, 'Server should process valid WAV without errors.');
  } else {
    const transcribeData = await transcribeRes.json();
    assert(transcribeData.success === true, 'Response should have success: true');
    console.log(`✅ Transcription endpoint correctly processed audio buffer (Status 200). Result: "${transcribeData.transcript}"`);
  }

  console.log('\n🎉 All standalone verification tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
