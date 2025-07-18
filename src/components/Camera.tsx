'use client';

import { Box, Button, Text, Flex } from '@radix-ui/themes';
import { useCamera } from '../hooks/useCamera';

export function Camera() {
  const { 
    stream, 
    isLoading, 
    error, 
    hasPermission, 
    videoRef, 
    startCamera, 
    stopCamera 
  } = useCamera();

  return (
    <Box>
      <Flex direction="column" align="center" gap="4">
        {!hasPermission && !isLoading && (
          <Button 
            onClick={startCamera} 
            size="3"
            disabled={isLoading}
          >
            Start Camera
          </Button>
        )}

        {isLoading && (
          <Text>Requesting camera permission...</Text>
        )}

        {error && (
          <Text color="red" size="2">
            {error}
          </Text>
        )}

        {stream && (
          <Box>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              webkit-playsinline="true"
              style={{
                width: '100%',
                maxWidth: '640px',
                height: 'auto',
                borderRadius: '8px',
                backgroundColor: '#000',
                filter: 'grayscale(100%)',
              }}
            />
            <Flex justify="center" mt="3">
              <Button 
                onClick={stopCamera}
                variant="outline"
                size="2"
              >
                Stop Camera
              </Button>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
}