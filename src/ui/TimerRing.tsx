// Overview: Renders the 15-minute spike timer ring and elapsed-hour center label.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { formatElapsedHours, getHighlightedSpikeCount } from '../domain/time';
import { colors } from './theme';

type TimerRingProps = {
  elapsedMs: number;
  frozen?: boolean;
};

const SIZE = 74;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 32;
const INNER_RADIUS = 25;
const SPIKES = 15;

// Draws one timer ring with highlighted minute spikes.
export function TimerRing({ elapsedMs, frozen = false }: TimerRingProps) {
  const highlightedSpikes = getHighlightedSpikeCount(elapsedMs);

  return (
    <View style={styles.container} accessibilityLabel={`${formatElapsedHours(elapsedMs)} hours elapsed`}>
      <Svg width={SIZE} height={SIZE}>
        {Array.from({ length: SPIKES }).map((_, index) => {
          const angle = (index / SPIKES) * Math.PI * 2 - Math.PI / 2;
          const isHighlighted = index < highlightedSpikes;
          const stroke = isHighlighted ? (frozen ? colors.complete : colors.primary) : colors.border;

          return (
            <Line
              key={index}
              x1={CENTER + Math.cos(angle) * INNER_RADIUS}
              y1={CENTER + Math.sin(angle) * INNER_RADIUS}
              x2={CENTER + Math.cos(angle) * OUTER_RADIUS}
              y2={CENTER + Math.sin(angle) * OUTER_RADIUS}
              stroke={stroke}
              strokeLinecap="round"
              strokeWidth={4}
            />
          );
        })}
      </Svg>
      <Text style={styles.label}>{formatElapsedHours(elapsedMs)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: SIZE,
    justifyContent: 'center',
    width: SIZE,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    position: 'absolute',
  },
});
