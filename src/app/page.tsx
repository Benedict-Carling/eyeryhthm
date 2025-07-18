import { Container, Flex, Box, Text, Heading } from "@radix-ui/themes";
import { Camera } from "../components/Camera";

export default function Home() {
  return (
    <Container size="4">
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="8"
        style={{ minHeight: "100vh", padding: "40px 0" }}
      >
        <Box>
          <Heading size="8" align="center" mb="4">
            BlinkTrack
          </Heading>
          <Text size="4" align="center" color="gray">
            Eye movement tracking with camera
          </Text>
        </Box>

        <Camera />
      </Flex>
    </Container>
  );
}
