// Overview: Renders a curvy, softly shaded hourglass timer with proportional sand and a gentle falling-grain animation.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { formatDuration } from '../domain/time';
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
const HEIGHT = 72;
const GLASS_WIDTH = 42;
const GLASS_LEFT = (WIDTH - GLASS_WIDTH) / 2;
const GLASS_RIGHT = GLASS_LEFT + GLASS_WIDTH;
const GLASS_CENTER = WIDTH / 2;
const GLASS_TOP = 5;
const GLASS_NECK = 29;
const GLASS_BOTTOM = 50;
const FRAME_STROKE_WIDTH = 3;
const NECK_WIDTH = 4;
const LABEL_HEIGHT = 20;

// Defines the curved silhouette used for the glass body and its 3D-like shading.
function getGlassShellPath(): string {
  return [
    `M ${GLASS_LEFT} ${GLASS_TOP}`,
    `L ${GLASS_RIGHT} ${GLASS_TOP}`,
    `C ${GLASS_RIGHT - 4} ${GLASS_TOP + 8}, ${GLASS_CENTER + 9} ${GLASS_NECK - 7}, ${GLASS_CENTER} ${GLASS_NECK}`,
    `C ${GLASS_CENTER + 9} ${GLASS_NECK + 7}, ${GLASS_RIGHT - 4} ${GLASS_BOTTOM - 8}, ${GLASS_RIGHT} ${GLASS_BOTTOM}`,
    `L ${GLASS_LEFT} ${GLASS_BOTTOM}`,
    `C ${GLASS_LEFT + 4} ${GLASS_BOTTOM - 8}, ${GLASS_CENTER - 9} ${GLASS_NECK + 7}, ${GLASS_CENTER} ${GLASS_NECK}`,
    `C ${GLASS_CENTER - 9} ${GLASS_NECK - 7}, ${GLASS_LEFT + 4} ${GLASS_TOP + 8}, ${GLASS_LEFT} ${GLASS_TOP}`,
    'Z',
  ].join(' ');
}

// Adds a narrow curved reflection so the glass reads as dimensional instead of flat.
function getGlassHighlightPath(): string {
  return [
    `M ${GLASS_LEFT + 6} ${GLASS_TOP + 5}`,
    `C ${GLASS_LEFT + 10} ${GLASS_TOP + 12}, ${GLASS_CENTER - 10} ${GLASS_NECK - 7}, ${GLASS_CENTER - 4} ${GLASS_NECK}`,
    `C ${GLASS_CENTER - 10} ${GLASS_NECK + 7}, ${GLASS_LEFT + 10} ${GLASS_BOTTOM - 12}, ${GLASS_LEFT + 6} ${GLASS_BOTTOM - 5}`,
  ].join(' ');
}

// Restricts the timer progress to the visible hourglass range.
function getProgress(elapsedMs: number, targetDurationMinutes: number): number {
  const targetMs = Math.max(targetDurationMinutes, 1) * 60_000;
  return Math.min(Math.max(elapsedMs / targetMs, 0), 1);
}

// Builds the upper sand chamber, which empties toward the hourglass neck.
function getTopSandPath(progress: number): string {
  const chamberHeight = GLASS_NECK - GLASS_TOP;
  const surfaceY = GLASS_TOP + progress * (chamberHeight - 4);
  const surfaceWidth = Math.max(
    NECK_WIDTH,
    GLASS_WIDTH - ((surfaceY - GLASS_TOP) / chamberHeight) * (GLASS_WIDTH - NECK_WIDTH),
  );

  return [
    `M ${GLASS_CENTER - NECK_WIDTH / 2} ${GLASS_NECK}`,
    `L ${GLASS_CENTER + NECK_WIDTH / 2} ${GLASS_NECK}`,
    `L ${GLASS_CENTER + surfaceWidth / 2} ${surfaceY}`,
    `L ${GLASS_CENTER - surfaceWidth / 2} ${surfaceY}`,
    'Z',
  ].join(' ');
}

// Builds the lower sand chamber, which fills upward from the base.
function getBottomSandPath(progress: number): string {
  const chamberHeight = GLASS_BOTTOM - GLASS_NECK;
  const depth = 3 + progress * (chamberHeight - 3);
  const surfaceY = GLASS_BOTTOM - depth;
  const surfaceWidth = Math.max(
    NECK_WIDTH,
    NECK_WIDTH + ((GLASS_BOTTOM - surfaceY) / chamberHeight) * (GLASS_WIDTH - NECK_WIDTH),
  );

  return [
    `M ${GLASS_LEFT} ${GLASS_BOTTOM}`,
    `L ${GLASS_RIGHT} ${GLASS_BOTTOM}`,
    `L ${GLASS_CENTER + surfaceWidth / 2} ${surfaceY}`,
    `L ${GLASS_CENTER - surfaceWidth / 2} ${surfaceY}`,
    'Z',
  ].join(' ');
}

// Draws an hourglass that settles into a full lower chamber at the target boundary while keeping elapsed-time semantics.
export function TimerRing({
  accentColor = colors.primary,
  labelBackgroundColor = colors.surface,
  elapsedMs,
  targetDurationMinutes = 60,
  frozen = false,
  blinkNextSpike = false,
}: TimerRingProps) {
  const elapsedLabel = formatDuration(elapsedMs);
  const progress = getProgress(elapsedMs, targetDurationMinutes);
  const isAtEnd = progress >= 1;
  const sandColor = frozen ? colors.complete : accentColor;
  const frameColor = colors.muted;
  const sandFlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!blinkNextSpike || frozen) {
      sandFlow.stopAnimation();
      sandFlow.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sandFlow, {
          toValue: 1,
          duration: 1_100,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(sandFlow, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [blinkNextSpike, frozen, sandFlow]);

  const fallingGrainOffset = sandFlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });
  const fallingGrainOpacity = sandFlow.interpolate({
    inputRange: [0, 0.15, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View accessibilityLabel={`${elapsedLabel} elapsed`} style={styles.container}>
      <Svg height={HEIGHT - LABEL_HEIGHT} width={WIDTH}>
        <Path
          d={getGlassShellPath()}
          fill={colors.surface}
          fillOpacity={0.22}
          stroke={colors.border}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={FRAME_STROKE_WIDTH + 2}
        />
        <Path
          d={getGlassShellPath()}
          fill="none"
          stroke={frameColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.9}
          strokeWidth={FRAME_STROKE_WIDTH}
        />
        <Path
          d={getGlassHighlightPath()}
          fill="none"
          stroke={colors.surface}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.62}
          strokeWidth={1.3}
        />
        {!isAtEnd ? (
          <Path
            d={getTopSandPath(progress)}
            fill={sandColor}
            fillOpacity={0.92}
            stroke={colors.text}
            strokeOpacity={0.12}
            strokeWidth={0.8}
          />
        ) : null}
        <Path
          d={getBottomSandPath(progress)}
          fill={sandColor}
          fillOpacity={0.92}
          stroke={colors.text}
          strokeOpacity={0.12}
          strokeWidth={0.8}
        />
      </Svg>
      {blinkNextSpike && !frozen && !isAtEnd ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fallingGrain,
            {
              backgroundColor: sandColor,
              opacity: fallingGrainOpacity,
              transform: [{ translateY: fallingGrainOffset }],
            },
          ]}
        />
      ) : null}
      <View style={[styles.labelContainer, { backgroundColor: labelBackgroundColor }]}>
        <Text
          adjustsFontSizeToFit
          allowFontScaling={false}
          ellipsizeMode="clip"
          minimumFontScale={0.6}
          numberOfLines={1}
          style={styles.label}
        >
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
    justifyContent: 'flex-start',
    position: 'relative',
    width: WIDTH,
  },
  fallingGrain: {
    borderRadius: 3,
    height: 4.5,
    left: GLASS_CENTER - 2.25,
    position: 'absolute',
    top: GLASS_NECK - 9,
    width: 4.5,
  },
  labelContainer: {
    alignItems: 'center',
    borderRadius: 7,
    height: LABEL_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: WIDTH,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    includeFontPadding: false,
    maxWidth: WIDTH - 8,
    textAlign: 'center',
  },
});
