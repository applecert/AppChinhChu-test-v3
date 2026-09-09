import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform, DeviceEventEmitter } from 'react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useThemeUpdate, COLORS as THEME_COLORS } from '../../constants/theme';

export default function TabLayout() {
  useThemeUpdate();
  const isLight = THEME_COLORS.background === '#F4F4F6';
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  // Lắng nghe sự kiện ẩn/hiện tab bar nếu màn hình con yêu cầu
  useEffect(() => {
    const hideSub = DeviceEventEmitter.addListener('hideTabBar', () => setIsTabBarVisible(false));
    const showSub = DeviceEventEmitter.addListener('showTabBar', () => setIsTabBarVisible(true));
    return () => {
      hideSub.remove();
      showSub.remove();
    };
  }, []);

  const activeColor = isLight ? '#007AFF' : (THEME_COLORS.primary || '#0A84FF');
  const inactiveColor = isLight ? '#8E8E93' : 'rgba(235, 235, 245, 0.45)';

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.12)',
            backgroundColor: Platform.select({
              ios: 'transparent',
              default: isLight ? '#FFFFFF' : '#0B0B0D',
            }),
            height: Platform.select({ ios: 88, default: 64 }),
            paddingTop: 6,
            display: isTabBarVisible ? 'flex' : 'none',
          },
          tabBarBackground: () => (
            Platform.OS === 'ios' ? (
              <BlurView
                tint={isLight ? 'systemChromeMaterialLight' : 'systemChromeMaterialDark'}
                intensity={95}
                style={StyleSheet.absoluteFill}
              />
            ) : null
          ),
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: -0.2,
            marginTop: 2,
          },
          tabBarItemStyle: {
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Khám phá',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol
                name={focused ? 'house.fill' : 'house'}
                color={color}
                size={23}
              />
            ),
          }}
          listeners={{
            tabPress: () => {
              Haptics.selectionAsync().catch(() => {});
            },
          }}
        />

        <Tabs.Screen
          name="sign"
          options={{
            title: 'Ký App',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol
                name={focused ? 'wrench.and.screwdriver.fill' : 'wrench.and.screwdriver'}
                color={color}
                size={23}
              />
            ),
          }}
          listeners={{
            tabPress: () => {
              Haptics.selectionAsync().catch(() => {});
            },
          }}
        />

        <Tabs.Screen
          name="apps"
          options={{
            title: 'Kho IPA',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol
                name={focused ? 'square.grid.2x2.fill' : 'square.grid.2x2'}
                color={color}
                size={23}
              />
            ),
          }}
          listeners={{
            tabPress: () => {
              Haptics.selectionAsync().catch(() => {});
            },
          }}
        />

        <Tabs.Screen
          name="mmo"
          options={{
            title: 'Quản lý App',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol
                name={focused ? 'folder.fill' : 'folder'}
                color={color}
                size={23}
              />
            ),
          }}
          listeners={{
            tabPress: () => {
              Haptics.selectionAsync().catch(() => {});
            },
          }}
        />
      </Tabs>
    </>
  );
}