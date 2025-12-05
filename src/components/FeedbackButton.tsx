"use client";

import { Button } from "@radix-ui/themes";
import { ChatBubbleIcon } from "@radix-ui/react-icons";
import styles from "./FeedbackButton.module.css";

const FEEDBACK_URL = "https://eyerhythm.userjot.com";

export function FeedbackButton() {
  const handleClick = () => {
    window.open(FEEDBACK_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={styles.container}>
      <Button
        size="2"
        variant="solid"
        className={styles.button}
        onClick={handleClick}
      >
        <ChatBubbleIcon width="16" height="16" />
        Feedback
      </Button>
    </div>
  );
}
