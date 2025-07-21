"use client";

import { Container } from "@radix-ui/themes";
import { CalibrationManager } from "../../components/CalibrationManager";

export default function CalibrationPage() {
  return (
    <Container size="3">
      <CalibrationManager />
    </Container>
  );
}