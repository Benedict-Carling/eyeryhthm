"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Card, Flex, Heading, Text, TextField, Separator } from "@radix-ui/themes";
import { getSupabaseClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
      <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "github" | "apple") => {
    setError(null);
    setSocialLoading(provider);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setSocialLoading(null);
      }
    } catch {
      setError("An unexpected error occurred");
      setSocialLoading(null);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <Card size="4" style={{ width: "100%", maxWidth: "400px" }}>
        <Flex direction="column" gap="5">
          <Flex direction="column" align="center" gap="2">
            <Heading size="6">Welcome back</Heading>
            <Text color="gray" size="2">
              Sign in to continue to EyeRhythm
            </Text>
          </Flex>

          <form onSubmit={handleLogin}>
            <Flex direction="column" gap="4">
              <Box>
                <Text as="label" size="2" weight="medium" mb="1">
                  Email
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  size="3"
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium" mb="1">
                  Password
                </Text>
                <TextField.Root
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  size="3"
                />
              </Box>

              {error && (
                <Text color="red" size="2">
                  {error}
                </Text>
              )}

              <Button type="submit" size="3" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </Flex>
          </form>

          <Flex justify="center" align="baseline" gap="1">
            <Text size="2" color="gray">
              Don&apos;t have an account?
            </Text>
            <Link href="/signup" style={{ textDecoration: "none" }}>
              <Text size="2" color="indigo" weight="medium">
                Sign up
              </Text>
            </Link>
          </Flex>

          <Flex align="center" gap="3">
            <Separator size="4" />
            <Text size="2" color="gray" style={{ whiteSpace: "nowrap" }}>
              or
            </Text>
            <Separator size="4" />
          </Flex>

          <Button
            variant="outline"
            size="3"
            onClick={() => handleSocialLogin("google")}
            disabled={socialLoading !== null}
            style={{ width: "100%" }}
          >
            <GoogleIcon />
            {socialLoading === "google" ? "Connecting..." : "Continue with Google"}
          </Button>
        </Flex>
      </Card>
    </Box>
  );
}
