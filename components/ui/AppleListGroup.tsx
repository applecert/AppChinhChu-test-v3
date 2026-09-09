import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { IconSymbol } from './icon-symbol';
import { SymbolViewProps } from 'expo-symbols';

interface AppleListGroupProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  isLight?: boolean;
}

export function AppleListGroup({
  title,
  footer,
  children,
  style,
  isLight = false,
}: AppleListGroupProps) {
  const cardBg = isLight ? '#FFFFFF' : '#1C1C1E';
  const headerColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.6)';
  const footerColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.6)';

  return (
    <View style={[styles.groupContainer, style]}>
      {title && (
        <Text style={[styles.groupTitle, { color: headerColor }]}>
          {title}
        </Text>
      )}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        {children}
      </View>
      {footer && (
        <Text style={[styles.groupFooter, { color: footerColor }]}>
          {footer}
        </Text>
      )}
    </View>
  );
}

interface AppleListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: SymbolViewProps['name'];
  iconBgColor?: string;
  iconColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
  isLast?: boolean;
  isLight?: boolean;
}

export function AppleListRow({
  title,
  subtitle,
  value,
  icon,
  iconBgColor = '#007AFF',
  iconColor = '#FFFFFF',
  onPress,
  showChevron = !!onPress,
  rightElement,
  isDestructive = false,
  isLast = false,
  isLight = false,
}: AppleListRowProps) {
  const separatorColor = isLight ? 'rgba(60, 60, 67, 0.12)' : 'rgba(255, 255, 255, 0.1)';
  const titleColor = isDestructive
    ? '#FF3B30'
    : isLight
    ? '#000000'
    : '#FFFFFF';
  const subtitleColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.6)';
  const valueColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.6)';
  const chevronColor = isLight ? 'rgba(60, 60, 67, 0.3)' : 'rgba(235, 235, 245, 0.3)';

  const content = (
    <View style={styles.row}>
      {icon && (
        <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
          <IconSymbol name={icon} size={17} color={iconColor} />
        </View>
      )}
      <View style={styles.rowContent}>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightWrap}>
          {value && (
            <Text style={[styles.valueText, { color: valueColor }]}>
              {value}
            </Text>
          )}
          {rightElement}
          {showChevron && (
            <IconSymbol
              name="chevron.right"
              size={14}
              color={chevronColor}
              style={styles.chevron}
            />
          )}
        </View>
      </View>
      {!isLast && (
        <View
          style={[
            styles.separator,
            {
              backgroundColor: separatorColor,
              left: icon ? 52 : 16,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.65} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  groupContainer: {
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.08,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 16,
  },
  groupFooter: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
    marginTop: 6,
    marginHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    position: 'relative',
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  textWrap: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.32,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.08,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    fontSize: 15,
    letterSpacing: -0.24,
  },
  chevron: {
    marginLeft: 4,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
