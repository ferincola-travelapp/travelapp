import { NextRequest, NextResponse } from 'next/server';
import { findApkBySlug } from '../../apkConfig';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ app: string }> }
) {
  const { app } = await params;
  const apk = findApkBySlug(app);

  if (!apk) {
    return NextResponse.redirect('https://travelapp.ar/descargas', 307);
  }

  return NextResponse.redirect(apk.url, 307);
}
