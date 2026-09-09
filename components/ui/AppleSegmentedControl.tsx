import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from './icon-symbol';
import { SymbolViewProps } from 'expo-symbols';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: SymbolViewProps['name'];
}

interface AppleSegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  isLight?: boolean;
}

export function AppleSegmentedControl<T extends string = string>({
  options,
  selectedValue,
  onChange,
  isLight = false,
}: AppleSegmentedControlProps<T>) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.id === selectedValue)
  );

  const segmentWidth = containerWidth > 0 ? (containerWidth - 4) / options.length : 0;

  useEffect(() => {
    if (segmentWidth > 0) {
      Animated.spring(slideAnim, {
        toValue: selectedIndex * segmentWidth,
        damping: 24,
        stiffness: 260,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedIndex, segmentWidth]);

  const handlePress = (id: T, index: number) => {
    if (id !== selectedValue) {
      Haptics.selectionAsync().catch(() => {});
      onChange(id);
    }
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const bgTrack = isLight ? 'rgba(118, 118, 128, 0.12)' : 'rgba(118, 118, 128, 0.24)';
  const pillBg = isLight ? '#FFFFFF' : '#636366';
  const textActive = isLight ? '#000000' : '#FFFFFF';
  const textInactive = isLight ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.6)';

  return (
    <View style={[styles.container, { backgroundColor: bgTrack }]} onLayout={handleLayout}>
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.sliderPill,
            {
              width: segmentWidth,
              backgroundColor: pillBg,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}
      <View style={styles.segmentRow}>
        {options.map((option, index) => {
          const isSelected = option.id === selectedValue;
          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.7}
              onPress={() => handlePress(option.id, index)}
              style={styles.segmentItem}
            >
              {option.icon && (
                <IconSymbol
                  name={option.icon}
                  size={15}
                  color={isSelected ? textActive : textInactive}
                  style={styles.icon}
                />
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color: isSelected ? textActive : textInactive,
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    borderRadius: 9,
    padding: 2,
    justifyContent: 'center',
    marginVertical: 6,
  },
  sliderPill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 7,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  segmentItem: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingHorizontal: 6,
  },
  icon: {
    marginRight: 5,
  },
  label: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
});
