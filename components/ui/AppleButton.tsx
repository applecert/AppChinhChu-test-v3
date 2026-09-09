import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from './icon-symbol';
import { SymbolViewProps } from 'expo-symbols';

export type AppleButtonVariant = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive' | 'pill';
export type AppleButtonSize = 'small' | 'medium' | 'large';

interface AppleButtonProps {
  title: string;
  onPress: () => void;
  variant?: AppleButtonVariant;
  size?: AppleButtonSize;
  icon?: SymbolViewProps['name'];
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  isLight?: boolean;
}

export function AppleButton({
  title,
  onPress,
  variant = 'filled',
  size = 'medium',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  isLight = false,
}: AppleButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const primaryBlue = isLight ? '#007AFF' : '#0A84FF';

  let bgColor = primaryBlue;
  let textColor = '#FFFFFF';

  switch (variant) {
    case 'filled':
      bgColor = primaryBlue;
      textColor = '#FFFFFF';
      break;
    case 'tinted':
      bgColor = isLight ? 'rgba(0, 122, 255, 0.12)' : 'rgba(10, 132, 255, 0.18)';
      textColor = primaryBlue;
      break;
    case 'gray':
      bgColor = isLight ? 'rgba(118, 118, 128, 0.12)' : 'rgba(118, 118, 128, 0.24)';
      textColor = isLight ? '#000000' : '#FFFFFF';
      break;
    case 'plain':
      bgColor = 'transparent';
      textColor = primaryBlue;
      break;
    case 'destructive':
      bgColor = isLight ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 69, 58, 0.18)';
      textColor = isLight ? '#FF3B30' : '#FF453A';
      break;
    case 'pill': // App Store GET style capsule button
      bgColor = isLight ? 'rgba(0, 122, 255, 0.12)' : 'rgba(255, 255, 255, 0.18)';
      textColor = isLight ? '#007AFF' : '#FFFFFF';
      break;
  }

  const sizeStyle = size === 'small' ? styles.sizeSmall : size === 'large' ? styles.sizeLarge : styles.sizeMedium;
  const textSizeStyle = size === 'small' ? styles.textSmall : size === 'large' ? styles.textLarge : styles.textMedium;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        sizeStyle,
        variant === 'pill' ? styles.pillShape : styles.roundedShape,
        { backgroundColor: bgColor, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && (
            <IconSymbol
              name={icon}
              size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
              color={textColor}
              style={styles.icon}
            />
          )}
          <Text style={[styles.textBase, textSizeStyle, { color: textColor }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundedShape: {
    borderRadius: 12,
  },
  pillShape: {
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  sizeSmall: {
    height: 30,
    paddingHorizontal: 12,
  },
  sizeMedium: {
    height: 44,
    paddingHorizontal: 16,
  },
  sizeLarge: {
    height: 52,
    paddingHorizontal: 20,
  },
  icon: {
    marginRight: 6,
  },
  textBase: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  textSmall: {
    fontSize: 13,
    fontWeight: '700',
  },
  textMedium: {
    fontSize: 15,
  },
  textLarge: {
    fontSize: 17,
  },
});
