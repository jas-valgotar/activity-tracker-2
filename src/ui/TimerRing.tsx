// Overview: Renders the compact elapsed-time label inside a spiky rectangular progress frame.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { formatDuration, getHighlightedSpikeCount } from '../domain/time';
import { colors } from './theme';

type TimerRingProps = {
  accentColor?: string;
  labelBackgroundColor?: string;
  elapsedMs: number;
  targetDurationMinutes?: number;
  frozen?: boolean;
  blinkNextSpike?: boolean;
};

const WIDTH = 92;
const HEIGHT = 54;
const LABEL_WIDTH = 76;
const LABEL_HEIGHT = 38;
const LABEL_LEFT = 8;
const LABEL_TOP = 8;
const TOP_BOTTOM_SPIKES = 10;
const SIDE_SPIKES = 5;
const SPIKES = 2 * (TOP_BOTTOM_SPIKES + SIDE_SPIKES);
const STROKE_WIDTH = 8;
const AnimatedLine = Animated.createAnimatedComponent(Line);

type SpikeLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

// Places each spike as one short segment of the rectangular label border.
function getSpikeLine(index: number): SpikeLine {
  if (index < TOP_BOTTOM_SPIKES) {
    const slotWidth = LABEL_WIDTH / TOP_BOTTOM_SPIKES;
    const x1 = LABEL_LEFT + index * slotWidth + STROKE_WIDTH / 2;
    const x2 = LABEL_LEFT + (index + 1) * slotWidth - STROKE_WIDTH / 2;
    return { x1, y1: LABEL_TOP, x2, y2: LABEL_TOP };
  }

  const rightIndex = index - TOP_BOTTOM_SPIKES;

  if (rightIndex < SIDE_SPIKES) {
    const slotHeight = LABEL_HEIGHT / SIDE_SPIKES;
    const y1 = LABEL_TOP + rightIndex * slotHeight + STROKE_WIDTH / 2;
    const y2 = LABEL_TOP + (rightIndex + 1) * slotHeight - STROKE_WIDTH / 2;
    return { x1: LABEL_LEFT + LABEL_WIDTH, y1, x2: LABEL_LEFT + LABEL_WIDTH, y2 };
  }

  const bottomIndex = rightIndex - SIDE_SPIKES;

  if (bottomIndex < TOP_BOTTOM_SPIKES) {
    const slotWidth = LABEL_WIDTH / TOP_BOTTOM_SPIKES;
    const x1 = LABEL_LEFT + LABEL_WIDTH - bottomIndex * slotWidth - STROKE_WIDTH / 2;
    const x2 = LABEL_LEFT + LABEL_WIDTH - (bottomIndex + 1) * slotWidth + STROKE_WIDTH / 2;
    return { x1, y1: LABEL_TOP + LABEL_HEIGHT, x2, y2: LABEL_TOP + LABEL_HEIGHT };
  }

  const leftIndex = bottomIndex - TOP_BOTTOM_SPIKES;
  const slotHeight = LABEL_HEIGHT / SIDE_SPIKES;
  const y1 = LABEL_TOP + LABEL_HEIGHT - leftIndex * slotHeight - STROKE_WIDTH / 2;
  const y2 = LABEL_TOP + LABEL_HEIGHT - (leftIndex + 1) * slotHeight + STROKE_WIDTH / 2;
  return { x1: LABEL_LEFT, y1, x2: LABEL_LEFT, y2 };
}

// Draws a fixed-size 30-segment spiky rectangle that fills against the activity target.
export function TimerRing({
  accentColor = colors.primary,
  labelBackgroundColor = colors.surface,
  elapsedMs,
  targetDurationMinutes = 60,
  frozen = false,
  blinkNextSpike = false,
}: TimerRingProps) {
  const elapsedLabel = formatDuration(elapsedMs);
  const highlightedSpikes = getHighlightedSpikeCount({
    elapsedMs,
    targetDurationMinutes,
    showFullRingAtBoundary: frozen,
  });
  const nextSpikeIndex = blinkNextSpike && !frozen ? highlightedSpikes : null;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (nextSpikeIndex === null) {
      pulseOpacity.stopAnimation();
      pulseOpacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );

    pulseOpacity.setValue(1);
    animation.start();

    return () => animation.stop();
  }, [nextSpikeIndex, pulseOpacity]);

  return (
    <View style={styles.container} accessibilityLabel={`${elapsedLabel} elapsed`}>
      <Svg width={WIDTH} height={HEIGHT} style={styles.spikes}>
        {Array.from({ length: SPIKES }).map((_, index) => {
          const line = getSpikeLine(index);
          let stroke = colors.border;
          let opacity = 1;

          if (index < highlightedSpikes) {
            stroke = frozen ? colors.complete : accentColor;
          } else if (index === nextSpikeIndex) {
            stroke = accentColor;
          }

          return index === nextSpikeIndex ? <AnimatedLine
              key={index}
              opacity={pulseOpacity}
              stroke={stroke}
              strokeLinecap="round"
              strokeWidth={STROKE_WIDTH}
              x1={line.x1}
              x2={line.x2}
              y1={line.y1}
              y2={line.y2}
            /> : <Line
              key={index}
              opacity={opacity}
              stroke={stroke}
              strokeLinecap="round"
              strokeWidth={STROKE_WIDTH}
              x1={line.x1}
              x2={line.x2}
              y1={line.y1}
              y2={line.y2}
            />;
        })}
      </Svg>
      <View
        style={[
          styles.labelContainer,
          frozen ? styles.completedContainer : styles.activeContainer,
          { backgroundColor: labelBackgroundColor },
        ]}
      >
        <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.label}>
          {elapsedLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: HEIGHT,
    justifyContent: 'center',
    width: WIDTH,
  },
  labelContainer: {
    alignItems: 'center',
    borderRadius: 8,
    height: LABEL_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 8,
    position: 'absolute',
    width: LABEL_WIDTH,
  },
  activeContainer: {
    backgroundColor: colors.surface,
  },
  completedContainer: {
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
  },
  spikes: {
    position: 'absolute',
  },
});
