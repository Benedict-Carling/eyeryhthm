import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import OtpEmail from '@/emails/OtpEmail';

interface SupabaseWebhookPayload {
  event: string;
  email: string;
  token_hash?: string;
  // Supabase sends OTP in email_data for custom SMTP
  email_data?: {
    token: string;
    token_hash: string;
    redirect_to?: string;
    email_action_type: 'signup' | 'magiclink' | 'recovery' | 'invite';
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature (basic auth with shared secret)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.error('[send-otp] Unauthorized webhook attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const payload: SupabaseWebhookPayload = await request.json();
    const { email, email_data } = payload;

    if (!email || !email_data?.token) {
      console.error('[send-otp] Missing required fields', { email, hasEmailData: !!email_data });
      return NextResponse.json({ error: 'Missing email or OTP code' }, { status: 400 });
    }

    // 3. Only handle OTP emails (filter out other auth emails)
    if (email_data.email_action_type !== 'magiclink' && email_data.email_action_type !== 'signup') {
      console.log('[send-otp] Skipping non-OTP email', { actionType: email_data.email_action_type });
      return NextResponse.json({ message: 'Not an OTP email, skipped' }, { status: 200 });
    }

    // 4. Render email template
    console.log('[send-otp] Rendering email template for', email);
    let emailHtml: string;
    try {
      emailHtml = await render(OtpEmail({
        otpCode: email_data.token,
        email
      }));
      console.log('[send-otp] Email template rendered, length:', emailHtml.length);
    } catch (renderError) {
      console.error('[send-otp] Error rendering email template:', renderError);
      throw renderError;
    }

    // 5. Send via Resend
    console.log('[send-otp] Sending email via Resend API');
    console.log('[send-otp] API Key present:', !!process.env.RESEND_API_KEY);
    console.log('[send-otp] API Key starts with:', process.env.RESEND_API_KEY?.substring(0, 10));

    // Create Resend instance inside the function for better error handling
    const resend = new Resend(process.env.RESEND_API_KEY);

    let data, error;
    try {
      const result = await resend.emails.send({
        from: 'EyeRhythm <verify@auth.eyerhythm.com>',
        to: email,
        subject: `Your EyeRhythm verification code: ${email_data.token}`,
        html: emailHtml,
      });
      data = result.data;
      error = result.error;
      console.log('[send-otp] Resend API response received');
    } catch (sendError: any) {
      console.error('[send-otp] Exception during Resend send:', sendError);
      console.error('[send-otp] Error details:', {
        message: sendError?.message,
        stack: sendError?.stack,
        name: sendError?.name,
      });
      throw sendError;
    }

    if (error) {
      console.error('[send-otp] Resend API error', error);
      return NextResponse.json({ error: 'Failed to send email', details: error }, { status: 500 });
    }

    console.log('[send-otp] Email sent successfully', {
      email,
      messageId: data?.id,
      actionType: email_data.email_action_type
    });

    return NextResponse.json({
      success: true,
      messageId: data?.id
    });

  } catch (error) {
    console.error('[send-otp] Unexpected error', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
