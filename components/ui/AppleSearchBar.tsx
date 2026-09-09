import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Keyboard,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { IconSymbol } from './icon-symbol';

interface AppleSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onCancel?: () => void;
  style?: StyleProp<ViewStyle>;
  isLight?: boolean;
}

export function AppleSearchBar({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm',
  onClear,
  onCancel,
  style,
  isLight = false,
}: AppleSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
    if (onClear) onClear();
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    setIsFocused(false);
    onChangeText('');
    if (onCancel) onCancel();
  };

  const trackBg = isLight ? 'rgba(118, 118, 128, 0.12)' : 'rgba(118, 118, 128, 0.24)';
  const textColor = isLight ? '#000000' : '#FFFFFF';
  const placeholderColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.5)';
  const iconColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.5)';
  const cancelColor = isLight ? '#007AFF' : '#0A84FF';

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputBox, { backgroundColor: trackBg }]}>
        <IconSymbol
          name="magnifyingglass"
          size={16}
          color={iconColor}
          style={styles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, { color: textColor }]}
          returnKeyType="search"
          clearButtonMode="never"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleClear}
            style={styles.clearBtn}
          >
            <IconSymbol
              name="xmark.circle.fill"
              size={15}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
      </View>

      {isFocused && (
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={handleCancel}
          style={styles.cancelButton}
        >
          <Text style={[styles.cancelText, { color: cancelColor }]}>
            Hủy
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  inputBox: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    letterSpacing: -0.32,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  cancelButton: {
    marginLeft: 10,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.32,
  },
});
