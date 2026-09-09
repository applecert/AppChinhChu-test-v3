import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { SymbolViewProps } from 'expo-symbols';

interface AppleRowIconProps {
  name: SymbolViewProps['name'];
  color?: string;
  size?: number;
  frameSize?: number;
  cornerRadius?: number;
  bgOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Native Apple Row Icon matching 3105's AppRowIcon:
 * 28x28 or 30x30 squircle frame, continuous corner radius 7,
 * 12-16% opacity tinted background, and centered SF Symbol.
 */
export function AppleRowIcon({
  name,
  color = '#0A84FF',
  size = 16,
  frameSize = 28,
  cornerRadius = 7,
  bgOpacity = 0.14,
  style,
}: AppleRowIconProps) {
  return (
    <View
      style={[
        styles.container,
        {
          width: frameSize,
          height: frameSize,
          borderRadius: cornerRadius,
          backgroundColor: hexToRgba(color, bgOpacity),
        },
        style,
      ]}
    >
      <IconSymbol name={name} size={size} color={color} />
    </View>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(10, 132, 255, ${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
