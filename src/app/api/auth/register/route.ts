import { NextRequest, NextResponse } from 'next/server';
import { registerUser, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const result = await registerUser(username, password);

    if (!result.success || !result.token) {
      return NextResponse.json(
        { error: result.error || 'Registration failed' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user?.id,
        username: result.user?.username,
        role: result.user?.role,
      },
      message: 'Account created successfully',
    });

    // Set secure HTTP-only cookie so new user is immediately authenticated
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
