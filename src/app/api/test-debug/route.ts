import { NextRequest, NextResponse } from 'next/server';
import { serverGetDoc } from '@/lib/firestore-server';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const results: any = {
    timestamp: new Date().toISOString(),
    firebaseExperiences: { status: 'pending', durationMs: 0, error: null },
    firebaseConfig: { status: 'pending', durationMs: 0, error: null },
    gemini: { status: 'pending', durationMs: 0, error: null }
  };

  // 1. Test Firebase Configuration
  const firebaseConf = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 8)}...` : 'undefined',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'undefined',
  };
  results.firebaseConfigRead = firebaseConf;

  // 2. Try serverGetDoc for experiences/TOUR-001
  const startExp = Date.now();
  try {
    const docSnap = await serverGetDoc('experiences', 'TOUR-001');
    results.firebaseExperiences.status = docSnap.exists ? 'success' : 'not_found';
    results.firebaseExperiences.durationMs = Date.now() - startExp;
    results.firebaseExperiences.data = docSnap.exists ? docSnap.data() : null;
  } catch (err: any) {
    results.firebaseExperiences.status = 'failed';
    results.firebaseExperiences.error = err.message || err.toString();
    results.firebaseExperiences.durationMs = Date.now() - startExp;
  }

  // 3. Try serverGetDoc for travisConfig/main
  const startConfig = Date.now();
  try {
    const docSnap = await serverGetDoc('travisConfig', 'main');
    results.firebaseConfig.status = docSnap.exists ? 'success' : 'not_found';
    results.firebaseConfig.durationMs = Date.now() - startConfig;
    results.firebaseConfig.data = docSnap.exists ? docSnap.data() : null;
  } catch (err: any) {
    results.firebaseConfig.status = 'failed';
    results.firebaseConfig.error = err.message || err.toString();
    results.firebaseConfig.durationMs = Date.now() - startConfig;
  }



  // 2. Test Gemini API
  const startGemini = Date.now();
  try {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Ping' }] }]
      }),
      signal: AbortSignal.timeout(5000) // Timeout after 5s to avoid complete hang
    });

    results.gemini.status = `http_${res.status}`;
    const data = await res.json();
    results.gemini.response = data;
    results.gemini.durationMs = Date.now() - startGemini;
  } catch (err: any) {
    results.gemini.status = 'failed';
    results.gemini.error = err.message || err.toString();
    results.gemini.durationMs = Date.now() - startGemini;
  }

  return NextResponse.json(results);
}
