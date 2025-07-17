import Image from "next/image";
import { Container, Flex, Box, Text, Button, Link, Code } from "@radix-ui/themes";

export default function Home() {
  return (
    <Container size="4">
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="8"
        style={{ minHeight: "100vh", padding: "80px 0" }}
      >
        <Box>
          <Text size="2">
            <ol style={{ listStylePosition: "inside", padding: 0, margin: 0 }}>
              <li style={{ marginBottom: "8px" }}>
                Get started by editing <Code>src/app/page.tsx</Code>.
              </li>
              <li>Save and see your changes instantly.</li>
            </ol>
          </Text>
        </Box>

        <Flex gap="4" align="center">
          <Button asChild size="3">
            <Link
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/vercel.svg"
                alt="Vercel logomark"
                width={20}
                height={20}
              />
              Deploy now
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="3"
          >
            <Link
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read our docs
            </Link>
          </Button>
        </Flex>

        <Flex gap="6" align="center" style={{ marginTop: "auto" }}>
          <Link
            href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Flex align="center" gap="2">
              <Image
                aria-hidden
                src="/file.svg"
                alt="File icon"
                width={16}
                height={16}
              />
              Learn
            </Flex>
          </Link>
          <Link
            href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Flex align="center" gap="2">
              <Image
                aria-hidden
                src="/window.svg"
                alt="Window icon"
                width={16}
                height={16}
              />
              Examples
            </Flex>
          </Link>
          <Link
            href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Flex align="center" gap="2">
              <Image
                aria-hidden
                src="/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
              />
              Go to nextjs.org →
            </Flex>
          </Link>
        </Flex>
      </Flex>
    </Container>
  );
}
