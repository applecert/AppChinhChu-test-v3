// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house': 'home',
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'square.grid.2x2': 'dashboard',
  'square.grid.2x2.fill': 'dashboard',
  'magnifyingglass': 'search',
  'wrench': 'build',
  'wrench.fill': 'build',
  'wrench.and.screwdriver': 'build',
  'wrench.and.screwdriver.fill': 'build',
  'folder': 'folder',
  'folder.fill': 'folder',
  'person': 'person',
  'person.fill': 'person',
  'cart': 'shopping-cart',
  'cart.fill': 'shopping-cart',
  'xmark.circle.fill': 'cancel',
  'plus': 'add',
  'checkmark': 'check',
  'gearshape': 'settings',
  'gearshape.fill': 'settings',
  'shield': 'security',
  'shield.fill': 'security',
  'trash': 'delete',
  'trash.fill': 'delete',
  'arrow.down.circle': 'arrow-downward',
  'arrow.down.circle.fill': 'arrow-downward',
  'doc': 'description',
  'doc.fill': 'description',
  'sparkles': 'auto-awesome',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
