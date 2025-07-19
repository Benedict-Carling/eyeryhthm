'use client';

import React from 'react';
import { Box, Card, Flex, Text, Badge } from '@radix-ui/themes';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { SessionData, formatSessionDuration } from '../lib/sessions/types';
import { ClockIcon, ActivityLogIcon } from '@radix-ui/react-icons';

interface SessionCardProps {
  session: SessionData;
}

export function SessionCard({ session }: SessionCardProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getQualityColor = (quality: 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'good':
        return 'green';
      case 'fair':
        return 'amber';
      case 'poor':
        return 'red';
    }
  };

  const getBlinkRateColor = (rate: number) => {
    if (rate >= 12) return '#10b981'; // green
    if (rate >= 8) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  // Prepare chart data
  const chartData = session.blinkRateHistory.map(point => ({
    rate: point.rate,
  }));

  return (
    <Card
      style={{
        padding: '20px',
        border: session.isActive ? '2px solid #10b981' : 'none',
        position: 'relative',
      }}
    >
      <Flex direction="column" gap="3">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="3">
            <Text size="5" weight="medium">
              {formatTime(session.startTime)}
            </Text>
            {session.isActive && (
              <Badge color="green" size="2">
                • Active
              </Badge>
            )}
          </Flex>
          
          {/* Quality badges */}
          <Flex gap="2" align="center">
            <Badge color={getQualityColor(session.quality)} variant="soft">
              {session.quality.charAt(0).toUpperCase() + session.quality.slice(1)} quality
            </Badge>
            {session.fatigueAlertCount > 0 ? (
              <Badge color="orange" variant="soft">
                <ActivityLogIcon /> {session.fatigueAlertCount} fatigue alert{session.fatigueAlertCount > 1 ? 's' : ''}
              </Badge>
            ) : (
              <Badge color="green" variant="soft">
                <ActivityLogIcon /> No fatigue alerts
              </Badge>
            )}
          </Flex>
        </Flex>

        {/* Duration */}
        {!session.isActive && session.duration && (
          <Flex align="center" gap="2">
            <ClockIcon />
            <Text size="2" color="gray">
              {formatSessionDuration(session.duration)}
            </Text>
          </Flex>
        )}

        {/* Main content area */}
        <Flex justify="between" align="center" gap="4">
          {/* Mini chart */}
          <Box style={{ width: '200px', height: '60px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <YAxis hide domain={[0, 20]} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Flex align="center" justify="center" style={{ height: '100%' }}>
                <Text size="2" color="gray">
                  {session.isActive ? 'Collecting data...' : 'No data'}
                </Text>
              </Flex>
            )}
          </Box>

          {/* Average blink rate */}
          <Text
            size="6"
            weight="bold"
            style={{ 
              color: getBlinkRateColor(session.averageBlinkRate),
              minWidth: '120px',
              textAlign: 'right',
            }}
          >
            {Math.round(session.averageBlinkRate)} blinks/min
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}