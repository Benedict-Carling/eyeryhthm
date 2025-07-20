'use client';

import React from 'react';
import { Box, Heading, Text, Flex, Button, Badge, Callout } from '@radix-ui/themes';
import { useSession } from '../contexts/SessionContext';
import { SessionCard } from './SessionCard';
import { VideoCanvas } from './VideoCanvas';
import { FaceIcon, EyeOpenIcon } from '@radix-ui/react-icons';

export function SessionsView() {
  const {
    sessions,
    activeSession,
    isTracking,
    isFaceDetected,
    toggleTracking,
    videoRef,
    canvasRef,
  } = useSession();

  return (
    <Box>
      {/* Header */}
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="6" mb="2">Screen Session Tracking</Heading>
          <Text size="3" color="gray">
            Monitor your screen time and eye fatigue patterns
          </Text>
        </Box>
        
        {/* Controls */}
        <Flex gap="3" align="center">
          {/* Face detection status */}
          <Badge 
            size="2" 
            color={isFaceDetected ? 'green' : 'gray'}
            variant="soft"
          >
            <FaceIcon />
            {isFaceDetected ? 'Face Detected' : 'No Face Detected'}
          </Badge>
          
          {/* Tracking toggle */}
          <Button
            size="3"
            variant={isTracking ? 'solid' : 'soft'}
            color={isTracking ? 'green' : 'gray'}
            onClick={toggleTracking}
          >
            <EyeOpenIcon />
            {isTracking ? 'Tracking Enabled' : 'Tracking Disabled'}
          </Button>
        </Flex>
      </Flex>

      {/* Video Display - Shows camera feed when tracking is enabled */}
      {isTracking && (
        <Box mb="6" style={{ display: 'flex', justifyContent: 'center' }}>
          <VideoCanvas 
            videoRef={videoRef}
            canvasRef={canvasRef}
            showCanvas={false} // No canvas overlay needed for sessions
            maxWidth="480px"
          />
        </Box>
      )}

      {/* Active Session */}
      {activeSession && (
        <Box mb="6">
          <Text size="3" weight="medium" mb="3">Current Session</Text>
          <SessionCard session={activeSession} />
        </Box>
      )}

      {/* Recent Sessions */}
      <Box>
        <Text size="3" weight="medium" mb="3">Recent Screen Sessions</Text>
        <Flex direction="column" gap="3">
          {sessions
            .filter(session => !session.isActive)
            .map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
        </Flex>
      </Box>

      {/* Info callout */}
      <Box mt="6">
        <Callout.Root>
          <Callout.Icon>
            <EyeOpenIcon />
          </Callout.Icon>
          <Callout.Text>
            <strong>Session Requirements:</strong>
            <br />
            • Minimum session length: 2 minutes
            <br />
            • Sessions continue through interruptions up to 10 seconds
            <br />
            • Blink rate targets: Good (12+), Fair (8-11), Poor (&lt;8)
            <br />
            • No camera footage is displayed or stored
          </Callout.Text>
        </Callout.Root>
      </Box>
    </Box>
  );
}