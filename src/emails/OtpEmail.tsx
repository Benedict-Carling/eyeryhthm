import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface OtpEmailProps {
  otpCode: string;
  email: string;
}

export default function OtpEmail({ otpCode, email }: OtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your EyeRhythm verification code: {otpCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src="https://eyerhythm.com/icons/logo-png.png"
              width="64"
              height="64"
              alt="EyeRhythm"
              style={logo}
            />
          </Section>

          <Heading style={heading}>Verify your email</Heading>

          <Text style={text}>
            Use this code to sign in to your EyeRhythm account:
          </Text>

          <Section style={codeContainer}>
            <Text style={code}>{otpCode}</Text>
          </Section>

          <Text style={text}>
            This code will expire in 60 seconds.
          </Text>

          <Text style={text}>
            If you didn&apos;t request this code, you can safely ignore this email.
          </Text>

          <Section style={securityTip}>
            <Text style={securityTipText}>
              <strong>Security tip:</strong> Never share this code with anyone. EyeRhythm will never ask for your code.
            </Text>
          </Section>

          <Text style={footer}>
            Sent to {email} • <a href="https://eyerhythm.com" style={link}>eyerhythm.com</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles with Radix indigo theme
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const logo = {
  margin: '0 auto',
};

const heading = {
  color: '#1e293b',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const codeContainer = {
  backgroundColor: '#eef2ff',
  borderRadius: '8px',
  margin: '32px 0',
  padding: '24px',
  textAlign: 'center' as const,
};

const code = {
  color: '#3e63dd', // Radix indigo-9
  fontSize: '36px',
  fontWeight: '700',
  letterSpacing: '8px',
  textAlign: 'center' as const,
  margin: '0',
  fontFamily: 'monospace',
};

const securityTip = {
  backgroundColor: '#fef3c7',
  borderRadius: '6px',
  border: '1px solid #fcd34d',
  padding: '16px',
  marginTop: '24px',
};

const securityTipText = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0',
  textAlign: 'center' as const,
};

const footer = {
  color: '#94a3b8',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
  textAlign: 'center' as const,
};

const link = {
  color: '#3e63dd',
  textDecoration: 'none',
};
