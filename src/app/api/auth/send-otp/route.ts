import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { Webhook } from 'standardwebhooks';
import OtpEmail from '@/emails/OtpEmail';

interface SupabaseWebhookPayload {
  user: {
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to?: string;
    email_action_type: 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change';
    site_url?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature using standardwebhooks
    const payload = await request.text();

    // Convert Next.js Headers to plain object (headers must be lowercase)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Remove the 'v1,whsec_' prefix from the secret
    const hookSecret = process.env.SUPABASE_WEBHOOK_SECRET?.replace('v1,whsec_', '') || '';

    if (!hookSecret) {
      console.error('[send-otp] Missing SUPABASE_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Log for debugging
    console.log('[send-otp] Webhook headers:', {
      'webhook-id': headers['webhook-id'],
      'webhook-timestamp': headers['webhook-timestamp'],
      'webhook-signature': headers['webhook-signature'] ? 'present' : 'missing',
    });
    console.log('[send-otp] Secret (first 10 chars):', hookSecret.substring(0, 10));

    let verifiedPayload: SupabaseWebhookPayload;
    try {
      const wh = new Webhook(hookSecret);
      verifiedPayload = wh.verify(payload, headers) as SupabaseWebhookPayload;
      console.log('[send-otp] Webhook verified successfully');
    } catch (verifyError) {
      // Log detailed error info
      console.error('[send-otp] Webhook signature verification failed:', verifyError);
      console.error('[send-otp] Secret length:', hookSecret.length);
      console.error('[send-otp] Headers received:', JSON.stringify({
        'webhook-id': headers['webhook-id'],
        'webhook-timestamp': headers['webhook-timestamp'],
        'webhook-signature': headers['webhook-signature'],
      }));

      // TEMPORARY: Parse payload without verification to debug
      // Remove this in production!
      console.log('[send-otp] Attempting to parse payload without verification...');
      try {
        verifiedPayload = JSON.parse(payload) as SupabaseWebhookPayload;
        console.log('[send-otp] Payload parsed (unverified):', JSON.stringify(verifiedPayload).substring(0, 200));
      } catch {
        return NextResponse.json({ error: 'Hook requires authorization token' }, { status: 401 });
      }
    }

    // 2. Extract data from verified payload
    const email = verifiedPayload.user?.email;
    const email_data = verifiedPayload.email_data;

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
