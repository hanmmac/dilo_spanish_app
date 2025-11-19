import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  
  // The email confirmation will be handled client-side via the auth state listener
  // Just redirect to home page - the client will detect the session
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}

