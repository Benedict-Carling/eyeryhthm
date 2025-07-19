'use client';

import React from 'react';
import { Box, Heading, Text, Flex, Button, Badge, Callout } from '@radix-ui/themes';
import { useSession } from '../contexts/SessionContext';
import { SessionCard } from './SessionCard';
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

      {/* Hidden Video Elements - Required for face detection but not displayed */}
      <Box 
        style={{ 
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '640px',
          height: '480px',
          pointerEvents: 'none',
          visibility: 'hidden'
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '640px',
            height: '480px',
          }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{
            width: '640px',
            height: '480px',
          }}
        />
      </Box>

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