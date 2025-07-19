'use client';

import React, { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Heading,
  Tabs,
  Card,
  Callout,
} from '@radix-ui/themes';
import { PlusIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { useCalibration } from '../contexts/CalibrationContext';
import { CalibrationList } from './CalibrationList';
import { CalibrationFlow } from './CalibrationFlow';

export function CalibrationManager() {
  const { calibrations, hasActiveCalibration, isCalibrating } = useCalibration();
  const [showCalibrationFlow, setShowCalibrationFlow] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  const handleStartNewCalibration = () => {
    setShowCalibrationFlow(true);
    setActiveTab('calibrate');
  };

  const handleCalibrationComplete = () => {
    setShowCalibrationFlow(false);
    setActiveTab('list');
  };

  const handleCalibrationCancel = () => {
    setShowCalibrationFlow(false);
    setActiveTab('list');
  };

  if (showCalibrationFlow || isCalibrating) {
    return (
      <CalibrationFlow
        onComplete={handleCalibrationComplete}
        onCancel={handleCalibrationCancel}
      />
    );
  }

  return (
    <Box>
      <Flex direction="column" gap="6">
        {/* Header */}
        <Flex justify="between" align="center">
          <Box>
            <Heading size="6">Calibration Management</Heading>
            <Text size="3" color="gray">
              Manage your blink detection calibrations
            </Text>
          </Box>
          <Button size="3" onClick={handleStartNewCalibration}>
            <PlusIcon />
            New Calibration
          </Button>
        </Flex>

        {/* Status indicator */}
        {hasActiveCalibration() ? (
          <Callout.Root color="green">
            <Callout.Icon>
              <EyeOpenIcon />
            </Callout.Icon>
            <Callout.Text>
              Blink detection is calibrated and ready to use.
            </Callout.Text>
          </Callout.Root>
        ) : (
          <Callout.Root color="orange">
            <Callout.Icon>
              ⚠️
            </Callout.Icon>
            <Callout.Text>
              No active calibration. Create a calibration to start using blink detection.
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="list">
              Calibrations ({calibrations.length})
            </Tabs.Trigger>
            <Tabs.Trigger value="info">
              About Calibration
            </Tabs.Trigger>
          </Tabs.List>

          <Box pt="4">
            <Tabs.Content value="list">
              <CalibrationList />
            </Tabs.Content>

            <Tabs.Content value="info">
              <Card style={{ padding: '20px' }}>
                <Flex direction="column" gap="4">
                  <Heading size="4">How Calibration Works</Heading>
                  
                  <Box>
                    <Text size="3" weight="medium">What is EAR?</Text>
                    <Text size="2" color="gray">
                      Eye Aspect Ratio (EAR) measures the ratio between the height and width of your eye. 
                      When you blink, this ratio drops significantly, allowing us to detect blinks reliably.
                    </Text>
                  </Box>

                  <Box>
                    <Text size="3" weight="medium">Calibration Process</Text>
                    <Text size="2" color="gray">
                      During calibration, you&apos;ll blink 10 times at 2-second intervals. 
                      The system analyzes your blink patterns to determine the optimal EAR threshold 
                      for your eyes, lighting conditions, and camera setup.
                    </Text>
                  </Box>

                  <Box>
                    <Text size="3" weight="medium">Why Calibrate?</Text>
                    <Text size="2" color="gray">
                      Everyone&apos;s eyes are different, and lighting conditions vary. 
                      Calibration ensures the blink detection works accurately for your specific setup, 
                      reducing false positives and missed blinks.
                    </Text>
                  </Box>

                  <Box>
                    <Text size="3" weight="medium">Best Practices</Text>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      <li><Text size="2" color="gray">Use good, consistent lighting</Text></li>
                      <li><Text size="2" color="gray">Look directly at the camera</Text></li>
                      <li><Text size="2" color="gray">Blink naturally when prompted</Text></li>
                      <li><Text size="2" color="gray">Recalibrate if you change your setup</Text></li>
                    </ul>
                  </Box>
                </Flex>
              </Card>
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>
    </Box>
  );
}