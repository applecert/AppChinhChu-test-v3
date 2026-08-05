import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
  cancelAnimation,
  createAnimatedPropAdapter,
  processColor,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, PanGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Crown,
  Wallet,
  Wrench,
  HelpCircle,
  MessageSquare,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Download,
  Flame,
  Zap,
  ChevronRight,
  Star,
  Command,
  Orbit,
  Layers,
  Box,
  Check,
  X,
  Bot,
} from 'lucide-react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../constants/data';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════════
   SPATIAL DESIGN SYSTEM — iOS 26 Living Intelligence
   ═══════════════════════════════════════════════════════════════ */

const S = {
  void: '#000000',
  depth1: '#020205',
  depth2: '#05050A',
  depth3: '#080810',
  depth4: '#0C0C18',

  cyan: '#00E5FF',
  cyanSoft: 'rgba(0,229,255,0.15)',
  cyanGlow: 'rgba(0,229,255,0.4)',
  violet: '#A78BFA',
  violetSoft: 'rgba(167,139,250,0.12)',
  rose: '#FB7185',
  amber: '#FBBF24',
  emerald: '#34D399',

  text: '#FFFFFF',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.30)',
  textQuaternary: 'rgba(255,255,255,0.12)',

  glass: {
    bg: 'rgba(255,255,255,0.04)',
    bgStrong: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',
    highlight: 'rgba(255,255,255,0.12)',
  },

  radius: { xs: 8, sm: 14, md: 20, lg: 28, xl: 36, full: 999 },

  spring: (damping = 15, stiffness = 150) => ({ damping, stiffness, mass: 1 }),
  springBouncy: { damping: 12, stiffness: 200, mass: 0.8 },
  springSoft: { damping: 20, stiffness: 120, mass: 1.2 },

  timing: { duration: 400, easing: Easing.out(Easing.cubic) },
  timingFast: { duration: 250, easing: Easing.out(Easing.quad) },
};

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

type IntentType = 'vip' | 'sign' | 'recharge' | 'search' | 'crash' | 'mmo' | 'support' | 'navigate' | 'greeting';

interface CommandAction {
  label: string;
  route?: string;
  actionType?: string;
  payload?: any;
  style: 'primary' | 'secondary' | 'ghost';
}

interface IntelligenceMessage {
  id: string;
  sender: 'user' | 'intelligence';
  text: string;
  timestamp: string;
  actions?: CommandAction[];
  appCards?: AppItem[];
  intent?: IntentType;
  isProcessing?: boolean;
}

interface UserState {
  user: any;
  coins: number;
  vipStatus: string;
  isVIP: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════ */

const useUserState = () => {
  const [state, setState] = useState<UserState>({
    user: null,
    coins: 0,
    vipStatus: 'Chưa đăng nhập',
    isVIP: false,
  });

  useEffect(() => {
    let unsubDoc: any;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        unsubDoc = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const coins = d.coins || 0;
            const exp = d.vipExpire;
            let vipText = 'Chưa đăng ký';
            let isV = false;
            if (exp) {
              const ms = exp.toMillis ? exp.toMillis() : exp.seconds ? exp.seconds * 1000 : Number(exp) || 0;
              if (ms > Date.now()) {
                vipText = new Date(ms).toLocaleDateString('vi-VN');
                isV = true;
              } else {
                vipText = 'Hết hạn';
              }
            }
            setState({ user: u, coins, vipStatus: vipText, isVIP: isV });
          }
        });
      } else {
        setState({ user: null, coins: 0, vipStatus: 'Chưa đăng nhập', isVIP: false });
      }
    });
    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return state;
};

const useHaptic = () => {
  const trigger = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    try {
      switch (type) {
        case 'light': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
        case 'medium': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
        case 'heavy': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
        case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
        case 'warning': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
        case 'error': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
      }
    } catch { }
  }, []);
  return trigger;
};

/* ═══════════════════════════════════════════════════════════════
   LIVING BACKGROUND — 10 Layer Spatial Ambient
   ═══════════════════════════════════════════════════════════════ */

const LivingBackground = memo(() => {
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(1, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    return () => { cancelAnimation(time); };
  }, []);

  const aurora1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(time.value, [0, 1], [-30, 30]) },
      { translateY: interpolate(time.value, [0, 1], [-20, 20]) },
      { scale: interpolate(time.value, [0, 0.5, 1], [1, 1.1, 1]) },
    ],
    opacity: 0.6,
  }));

  const aurora2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(time.value, [0, 1], [20, -40]) },
      { translateY: interpolate(time.value, [0, 1], [30, -10]) },
      { scale: interpolate(time.value, [0, 0.5, 1], [1.1, 1, 1.1]) },
    ],
    opacity: 0.5,
  }));

  const meshStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(time.value, [0, 1], [0, 15])}deg` }],
    opacity: 0.4,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Layer 1: Deep Void */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: S.void }]} />

      {/* Layer 2: Depth Gradient */}
      <LinearGradient
        colors={[S.depth1, S.depth2, S.depth3]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 3: Aurora Blob 1 */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          aurora1Style,
          { justifyContent: 'flex-start', alignItems: 'flex-start' },
        ]}
      >
        <View style={{
          width: 600,
          height: 600,
          borderRadius: 300,
          backgroundColor: 'rgba(139,92,246,0.08)',
          top: -100,
          left: -150,
          ...(Platform.OS === 'ios' ? {} : {}),
        }} />
      </Animated.View>

      {/* Layer 4: Aurora Blob 2 */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          aurora2Style,
          { justifyContent: 'flex-end', alignItems: 'flex-end' },
        ]}
      >
        <View style={{
          width: 500,
          height: 500,
          borderRadius: 250,
          backgroundColor: 'rgba(0,229,255,0.06)',
          bottom: -100,
          right: -100,
        }} />
      </Animated.View>

      {/* Layer 5: Mesh Gradient Simulation */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          meshStyle,
          { opacity: 0.3 },
        ]}
      >
        <LinearGradient
          colors={['rgba(0,229,255,0.05)', 'transparent', 'rgba(167,139,250,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 6: Noise Texture (subtle dot pattern) */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.03, backgroundColor: '#000' }]} />

      {/* Layer 7: Bloom Center */}
      <View style={{
        position: 'absolute',
        top: SCREEN_H * 0.25,
        left: SCREEN_W * 0.2,
        width: SCREEN_W * 0.6,
        height: SCREEN_W * 0.6,
        borderRadius: SCREEN_W * 0.3,
        backgroundColor: 'rgba(0,229,255,0.03)',
      }} />

      {/* Layer 8: Floating Light */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        useAnimatedStyle(() => ({
          opacity: interpolate(time.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
        })),
      ]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.02)', 'transparent']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        />
      </Animated.View>

      {/* Layer 9: Soft Shadow Top */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: 'rgba(0,0,0,0.4)',
      }} />

      {/* Layer 10: Dynamic Ambient Bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        locations={[0.5, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
      />
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   ENERGY ORB — Skia Living Entity
   ═══════════════════════════════════════════════════════════════ */

const ORB_SIZE = 140;
const ORB_CENTER = ORB_SIZE / 2;

interface EnergyOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'typing';
  intensity?: number;
}

const EnergyOrb = memo(({ state, intensity = 1 }: EnergyOrbProps) => {
  const breath = useSharedValue(1);
  const energy = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (state === 'idle') {
      breath.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true
      );
      energy.value = withTiming(0.3, { duration: 1000 });
      rotate.value = withTiming(0, { duration: 2000 });
    } else if (state === 'thinking') {
      breath.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
        ),
        -1,
        true
      );
      energy.value = withTiming(1, { duration: 500 });
      rotate.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
    } else if (state === 'speaking') {
      breath.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 400, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 600, easing: Easing.out(Easing.elastic(2)) }),
        ),
        -1,
        true
      );
      energy.value = withTiming(0.8, { duration: 300 });
    } else if (state === 'typing') {
      breath.value = withRepeat(
        withSequence(
          withTiming(0.95, { duration: 200 }),
          withTiming(1.02, { duration: 200 }),
        ),
        -1,
        true
      );
      energy.value = withTiming(0.5, { duration: 300 });
    }

    return () => {
      cancelAnimation(breath);
      cancelAnimation(energy);
    };
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return (
    <View style={{ width: ORB_SIZE, height: ORB_SIZE, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={[
        StyleSheet.absoluteFill,
        animatedStyle,
        {
          borderRadius: ORB_SIZE / 2,
          backgroundColor: 'rgba(0,229,255,0.15)',
          shadowColor: S.cyan,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 30,
        }
      ]} />
      <Animated.View style={[
        {
          width: ORB_SIZE * 0.7,
          height: ORB_SIZE * 0.7,
          borderRadius: (ORB_SIZE * 0.7) / 2,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.4)',
        },
        animatedStyle,
      ]}>
        <LinearGradient
          colors={['#00E5FF', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Bot size={38} color="#FFFFFF" strokeWidth={2.2} />
      </Animated.View>
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   LIQUID INPUT — Floating Glass Bar
   ═══════════════════════════════════════════════════════════════ */

interface LiquidInputProps {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  orbState: string;
  onFocusChange: (focused: boolean) => void;
}

const LiquidInput = memo(({ value, onChangeText, onSubmit, orbState, onFocusChange }: LiquidInputProps) => {
  const focused = useSharedValue(0);
  const scale = useSharedValue(1);
  const haptic = useHaptic();

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], ['rgba(255,255,255,0.08)', 'rgba(0,229,255,0.4)']),
    shadowOpacity: interpolate(focused.value, [0, 1], [0, 0.3]),
    transform: [{ scale: scale.value }],
  }));

  const handleFocus = () => {
    focused.value = withTiming(1, S.timingFast);
    onFocusChange(true);
    haptic('light');
  };

  const handleBlur = () => {
    focused.value = withTiming(0, S.timingFast);
    onFocusChange(false);
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    scale.value = withSequence(
      withTiming(0.98, { duration: 80 }),
      withSpring(1, S.springBouncy),
    );
    haptic('medium');
    onSubmit();
  };

  return (
    <Animated.View style={[styles.liquidInputContainer, animatedStyle]}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <TextInput
        style={styles.liquidInput}
        placeholder="Nói với Intelligence..."
        placeholderTextColor={S.textTertiary}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
        selectionColor={S.cyan}
        multiline={false}
      />
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleSubmit}
        disabled={!value.trim()}
        style={[
          styles.sendCapsule,
          { opacity: value.trim() ? 1 : 0.4 },
        ]}
      >
        <LinearGradient
          colors={value.trim() ? [S.cyan, S.violet] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Send size={14} color={value.trim() ? S.void : S.textTertiary} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   APPLE INTELLIGENCE TEXT — Sequential Build Animation
   ═══════════════════════════════════════════════════════════════ */

const IntelligenceText = memo(({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const progress = useSharedValue(0);
  const words = text.split(' ');

  useEffect(() => {
    progress.value = withTiming(1, { duration: Math.min(1200, words.length * 40), easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished && onComplete) runOnJS(onComplete)();
    });
    return () => { cancelAnimation(progress); };
  }, [text]);

  return (
    <Text style={styles.intelligenceText}>
      {words.map((word, i) => (
        <WordToken key={`${i}-${word}`} word={word} index={i} total={words.length} progress={progress} />
      ))}
    </Text>
  );
});

const WordToken = memo(({ word, index, total, progress }: any) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [index / total, (index + 1) / total],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [{
      translateY: interpolate(
        progress.value,
        [index / total, (index + 1) / total],
        [8, 0],
        Extrapolation.CLAMP
      ),
    }],
  }));

  return (
    <Animated.Text style={[styles.wordToken, style]}>
      {word}{' '}
    </Animated.Text>
  );
});

/* ═══════════════════════════════════════════════════════════════
   SPATIAL APP CARD — App Store Quality
   ═══════════════════════════════════════════════════════════════ */

const SpatialAppCard = memo(({ app, onPress, index }: { app: AppItem; onPress: () => void; index: number }) => {
  const entry = useSharedValue(0);
  const press = useSharedValue(1);
  const haptic = useHaptic();

  useEffect(() => {
    entry.value = withDelay(index * 80, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, []);

  const entryStyle = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [
      { translateY: interpolate(entry.value, [0, 1], [20, 0]) },
      { scale: press.value },
    ],
  }));

  const handlePressIn = () => {
    press.value = withTiming(0.96, { duration: 100 });
    haptic('light');
  };

  const handlePressOut = () => {
    press.value = withSpring(1, S.springBouncy);
  };

  return (
    <Animated.View style={[styles.spatialCardWrap, entryStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.spatialCard}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.cardTop}>
            <Image source={{ uri: app.iconUrl }} style={styles.cardIcon} />
            <View style={styles.cardMeta}>
              <Text style={styles.cardName} numberOfLines={1}>{app.name}</Text>
              <Text style={styles.cardCategory} numberOfLines={1}>{app.category || 'IPA'}</Text>
              <View style={styles.cardRating}>
                <Star size={10} color={S.amber} fill={S.amber} />
                <Text style={styles.cardRatingText}>{app.rating || '4.8'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardBadgeRow}>
            {(app as any).isVIP && (
              <View style={[styles.cardBadge, { backgroundColor: 'rgba(251,113,133,0.15)' }]}>
                <Crown size={10} color={S.rose} />
                <Text style={[styles.cardBadgeText, { color: S.rose }]}>VIP</Text>
              </View>
            )}
            <View style={[styles.cardBadge, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
              <ShieldCheck size={10} color={S.emerald} />
              <Text style={[styles.cardBadgeText, { color: S.emerald }]}>Verified</Text>
            </View>
          </View>

          <View style={styles.cardAction}>
            <TouchableOpacity style={styles.cardButton} onPress={onPress} activeOpacity={0.8}>
              <Text style={styles.cardButtonText}>Mở</Text>
              <ChevronRight size={12} color={S.void} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   ACTION CHIP — Command Center Actions
   ═══════════════════════════════════════════════════════════════ */

const ActionChip = memo(({ action, onPress, index }: { action: CommandAction; onPress: () => void; index: number }) => {
  const entry = useSharedValue(0);
  const press = useSharedValue(1);
  const haptic = useHaptic();

  useEffect(() => {
    entry.value = withDelay(200 + index * 60, withSpring(1, S.springSoft));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ scale: press.value }, { translateY: interpolate(entry.value, [0, 1], [10, 0]) }],
  }));

  const colors: Record<string, { bg: readonly [string, string]; text: string }> = {
    primary: { bg: [S.cyan, S.violet] as const, text: S.void },
    secondary: { bg: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)'] as const, text: S.text },
    ghost: { bg: ['transparent', 'transparent'] as const, text: S.textSecondary },
  };
  const c = colors[action.style] || colors.primary;

  return (
    <Animated.View style={style}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          haptic('medium');
          onPress();
        }}
        onPressIn={() => { press.value = withTiming(0.95, { duration: 80 }); }}
        onPressOut={() => { press.value = withSpring(1, S.springBouncy); }}
      >
        <View style={[styles.actionChip, { borderColor: action.style === 'ghost' ? 'rgba(255,255,255,0.1)' : 'transparent' }]}>
          <LinearGradient colors={c.bg} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={[styles.actionChipText, { color: c.text }]}>{action.label}</Text>
          {action.style === 'primary' && <Zap size={12} color={S.void} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   MESSAGE ENTITY — No Bubble, Pure Intelligence
   ═══════════════════════════════════════════════════════════════ */

const MessageEntity = memo(({ message, onAction, onAppPress }: {
  message: IntelligenceMessage;
  onAction: (a: CommandAction) => void;
  onAppPress: (id: string) => void;
}) => {
  const entry = useSharedValue(0);
  const isUser = message.sender === 'user';

  useEffect(() => {
    entry.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: interpolate(entry.value, [0, 1], [isUser ? -10 : 20, 0]) }],
  }));

  if (isUser) {
    return (
      <Animated.View style={[styles.userEntity, style]}>
        <View style={styles.userEntityInner}>
          <Text style={styles.userEntityText}>{message.text}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.intelligenceEntity, style]}>
      {/* Intent Indicator */}
      <View style={styles.intentRow}>
        <View style={styles.intentDot} />
        <Text style={styles.intentLabel}>
          {message.isProcessing ? 'Đang phân tích...' : 'Intelligence'}
        </Text>
        <Text style={styles.entityTime}>{message.timestamp}</Text>
      </View>

      {/* Content */}
      <View style={styles.entityContent}>
        <IntelligenceText text={message.text} />
      </View>

      {/* App Cards */}
      {message.appCards && message.appCards.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.appCardRow}
          decelerationRate="fast"
        >
          {message.appCards.map((app, i) => (
            <SpatialAppCard
              key={app.id}
              app={app}
              index={i}
              onPress={() => onAppPress(app.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      {message.actions && message.actions.length > 0 && (
        <View style={styles.actionRow}>
          {message.actions.map((act, i) => (
            <ActionChip
              key={i}
              action={act}
              index={i}
              onPress={() => onAction(act)}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   COMMAND CENTER — Intent Processing Engine
   ═══════════════════════════════════════════════════════════════ */

const BANK_ID = 'ACB';
const ACCOUNT_NO = '22703611';
const ACCOUNT_NAME = 'TRAN NGUYEN MINH QUI';

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

interface ProcessResult {
  text: string;
  actions: CommandAction[];
  appCards?: AppItem[];
  intent: IntentType;
}

const processIntent = (raw: string, apps: AppItem[], userEmail?: string): ProcessResult => {
  const t = removeAccents(raw);
  const email = userEmail || 'TaiKhoanCuaSep';

  if (t.includes('vip') || t.includes('gia han') || t.includes('mua goi') || t.includes('nang cap')) {
    return {
      text: 'Tôi đã chuẩn bị sẵn các gói VIP cho bạn. Đặc quyền bao gồm tải không giới hạn, ký app ngoại tuyến và hỗ trợ 24/7.',
      actions: [
        { label: 'Xem gói VIP', route: '/buy-vip', style: 'primary' },
        { label: 'Nạp xu trước', route: '/account', style: 'secondary' },
      ],
      intent: 'vip',
    };
  }

  if (t.includes('ky app') || t.includes('vsign') || t.includes('cert') || t.includes('p12') || t.includes('provision')) {
    return {
      text: 'Bạn có thể ký IPA trực tiếp trên thiết bị. Hãy chuẩn bị file chứng chỉ ZIP chứa P12 và MobileProvision.',
      actions: [
        { label: 'Mở ký app', route: '/sign', style: 'primary' },
        { label: 'Nạp chứng chỉ', route: '/sign?importCert=true', style: 'secondary' },
      ],
      intent: 'sign',
    };
  }

  if (t.includes('nap') || t.includes('tien') || t.includes('xu') || t.includes('bank') || t.includes('chuyen khoan')) {
    return {
      text: `Hệ thống nạp xu tự động qua ACB. Chuyển khoản đến ${ACCOUNT_NO} - ${ACCOUNT_NAME} với nội dung NAP ${email}. Xu sẽ được cộng sau 10-30 giây.`,
      actions: [
        { label: 'Đến trang nạp', route: '/account', style: 'primary' },
        { label: 'Sao chép STK', actionType: 'copy', payload: ACCOUNT_NO, style: 'secondary' },
      ],
      intent: 'recharge',
    };
  }

  if (t.includes('crash') || t.includes('loi') || t.includes('thu hoi') || t.includes('vang') || t.includes('khong mo')) {
    return {
      text: 'Apple đã thu hồi chứng chỉ doanh nghiệp. Giải pháp: gỡ app bị lỗi, sau đó ký lại bằng chứng chỉ cá nhân hoặc nâng cấp VIP để dùng chứng chỉ riêng chống thu hồi.',
      actions: [
        { label: 'Mua VIP ngay', route: '/buy-vip', style: 'primary' },
        { label: 'Tự ký lại', route: '/sign', style: 'secondary' },
      ],
      intent: 'crash',
    };
  }

  if (t.includes('tim') || t.includes('app') || t.includes('game') || t.includes('ipa') || t.includes('youtube') || t.includes('facebook') || t.includes('tiktok')) {
    const q = raw.replace(/(tim|app|ipa|game|cho|xem|can|muon)/gi, '').trim();
    const matched = q.length >= 2 ? apps.filter(a =>
      removeAccents(a.name).includes(removeAccents(q)) ||
      removeAccents(a.category || '').includes(removeAccents(q))
    ).slice(0, 3) : [];

    if (matched.length > 0) {
      return {
        text: `Tìm thấy ${matched.length} ứng dụng phù hợp với yêu cầu của bạn.`,
        appCards: matched,
        actions: [
          { label: 'Mở Kho IPA', route: '/apps', style: 'primary' },
          { label: 'Kho VIP', route: '/vip', style: 'secondary' },
        ],
        intent: 'search',
      };
    }
    return {
      text: 'Kho IPA có hàng trăm app mod/tweak sẵn. Bạn có thể tìm kiếm trực tiếp hoặc yêu cầu admin hỗ trợ nạp app mới.',
      actions: [
        { label: 'Khám phá Kho IPA', route: '/apps', style: 'primary' },
        { label: 'Kho VIP', route: '/vip', style: 'secondary' },
      ],
      intent: 'search',
    };
  }

  if (t.includes('mmo') || t.includes('spotify') || t.includes('netflix') || t.includes('chatgpt') || t.includes('tai khoan')) {
    return {
      text: 'Tạp hóa MMO cung cấp tài khoản Premium chính chủ: Spotify, Netflix 4K, ChatGPT Plus, Windows/Office bản quyền.',
      actions: [
        { label: 'Mở Chợ MMO', route: '/mmo', style: 'primary' },
      ],
      intent: 'mmo',
    };
  }

  if (t.includes('admin') || t.includes('lien he') || t.includes('zalo') || t.includes('telegram') || t.includes('ho tro')) {
    return {
      text: 'Đội ngũ hỗ trợ làm việc từ 08:00 đến 23:00. Liên hệ qua Zalo hoặc Telegram để được hỗ trợ trực tiếp.',
      actions: [
        { label: 'Liên hệ Zalo', actionType: 'zalo', style: 'primary' },
        { label: 'Telegram', actionType: 'telegram', style: 'secondary' },
      ],
      intent: 'support',
    };
  }

  if (t.includes('mo app') || t.includes('vua tai') || t.includes('download')) {
    return {
      text: 'Tôi sẽ đưa bạn đến thư viện ứng dụng đã tải.',
      actions: [
        { label: 'Mở thư viện', route: '/downloads', style: 'primary' },
      ],
      intent: 'navigate',
    };
  }

  if (t.includes('chung chi') || t.includes('cert') || t.includes('han')) {
    return {
      text: 'Kiểm tra trạng thái chứng chỉ và thời hạn sử dụng trong mục Ký App hoặc tài khoản của bạn.',
      actions: [
        { label: 'Kiểm tra ngay', route: '/sign', style: 'primary' },
        { label: 'Tài khoản', route: '/account', style: 'secondary' },
      ],
      intent: 'sign',
    };
  }

  return {
    text: 'Tôi là Intelligence của IPAVIET OS. Tôi có thể giúp bạn gia hạn VIP, ký IPA, nạp xu, tìm app, hoặc xử lý lỗi. Hãy nói rõ bạn cần gì.',
    actions: [
      { label: 'Gia hạn VIP', route: '/buy-vip', style: 'primary' },
      { label: 'Ký IPA', route: '/sign', style: 'secondary' },
      { label: 'Nạp xu', route: '/account', style: 'secondary' },
      { label: 'Tìm app', route: '/apps', style: 'ghost' },
    ],
    intent: 'greeting',
  };
};

/* ═══════════════════════════════════════════════════════════════
   MAIN SCREEN — AI Command Center
   ═══════════════════════════════════════════════════════════════ */

export default function AICommandCenter() {
  const router = useRouter();
  const userState = useUserState();
  const haptic = useHaptic();

  const [messages, setMessages] = useState<IntelligenceMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [appsData, setAppsData] = useState<AppItem[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useSharedValue(0);

  // Header animation
  const headerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 100], [-20, 0], Extrapolation.CLAMP) }],
  }));

  // Load apps
  useEffect(() => {
    Promise.all([fetchRegularApps(), fetchVIPApps()]).then(([r, v]) => {
      setAppsData([...r, ...v]);
    });
  }, []);

  // Scroll handler
  const scrollHandler = useCallback((y: number) => {
    scrollY.value = y;
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Process command
  const handleCommand = useCallback((text: string) => {
    if (!text.trim()) return;

    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const userMsg: IntelligenceMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: now,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setOrbState('thinking');
    scrollToBottom();

    // Simulate processing delay
    setTimeout(() => {
      const result = processIntent(text, appsData, userState.user?.email);

      const botMsg: IntelligenceMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'intelligence',
        text: result.text,
        timestamp: now,
        actions: result.actions,
        appCards: result.appCards,
        intent: result.intent,
      };

      setOrbState('speaking');
      setMessages(prev => [...prev, botMsg]);
      scrollToBottom();

      // Return to idle after speaking
      setTimeout(() => setOrbState('idle'), 2000);
    }, 1200);
  }, [appsData, userState.user, scrollToBottom]);

  const handleAction = useCallback((action: CommandAction) => {
    haptic('medium');
    if (action.route) {
      router.push(action.route as any);
    } else if (action.actionType === 'zalo') {
      Alert.alert('Liên hệ Admin', 'Zalo Kỹ Thuật: 0987.xxx.xxx');
    } else if (action.actionType === 'copy' && action.payload) {
      // In real app, use Clipboard
      Alert.alert('Đã sao chép', action.payload);
    }
  }, [router]);

  const handleAppPress = useCallback((id: string) => {
    haptic('light');
    router.push(`/details/${id}` as any);
  }, [router]);

  // Suggestions
  const suggestions = [
    { icon: <Crown size={14} color={S.amber} />, label: 'Gia hạn VIP', query: 'Gia hạn VIP cho mình' },
    { icon: <Wrench size={14} color={S.violet} />, label: 'Ký IPA', query: 'Ký file IPA này' },
    { icon: <Wallet size={14} color={S.emerald} />, label: 'Nạp 200k', query: 'Nạp 200k' },
    { icon: <Sparkles size={14} color={S.cyan} />, label: 'Tìm YouTube', query: 'Tìm YouTube Premium' },
    { icon: <ShieldCheck size={14} color={S.rose} />, label: 'Lỗi chứng chỉ', query: 'App bị crash' },
  ];

  const suggestionEntry = useSharedValue(0);
  useEffect(() => {
    if (messages.length === 0) {
      suggestionEntry.value = withDelay(400, withSpring(1, S.springSoft));
    } else {
      suggestionEntry.value = 0;
    }
  }, [messages.length]);

  const suggestionStyle = useAnimatedStyle(() => ({
    opacity: suggestionEntry.value,
    transform: [{ translateY: interpolate(suggestionEntry.value, [0, 1], [20, 0]) }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <RNStatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Living Background */}
      <LivingBackground />

      {/* Dynamic Glass Header */}
      <Animated.View style={[styles.floatingHeader, headerOpacity]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.headerInner}>
          <TouchableOpacity
            style={styles.headerBack}
            onPress={() => {
              haptic('light');
              router.back();
            }}
          >
            <ArrowLeft size={18} color={S.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Intelligence</Text>
            <View style={styles.headerStatus}>
              <View style={[styles.statusDot, orbState !== 'idle' && styles.statusDotActive]} />
              <Text style={styles.headerStatusText}>
                {orbState === 'idle' ? 'Sẵn sàng' : orbState === 'thinking' ? 'Đang suy nghĩ...' : 'Đang phản hồi'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => {
              haptic('success');
              setMessages([]);
            }} style={styles.headerIcon}>
              <Layers size={16} color={S.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Main Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => scrollHandler(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          {/* Orb Section */}
          <View style={styles.orbSection}>
            <EnergyOrb state={orbState} />

            {/* Orb State Label */}
            <View style={styles.orbLabel}>
              <Text style={styles.orbLabelText}>
                {messages.length === 0
                  ? `Xin chào ${userState.user?.displayName || 'bạn'}`
                  : orbState === 'thinking' ? 'Đang phân tích...' : 'Intelligence OS'
                }
              </Text>
            </View>
          </View>

          {/* Suggestions (only when empty) */}
          {messages.length === 0 && (
            <Animated.View style={[styles.suggestionSection, suggestionStyle]}>
              <Text style={styles.suggestionTitle}>Bạn có thể yêu cầu</Text>
              <View style={styles.suggestionGrid}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionItem}
                    onPress={() => handleCommand(s.query)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionIcon}>{s.icon}</View>
                    <Text style={styles.suggestionText}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Messages */}
          <View style={styles.messagesArea}>
            {messages.map(msg => (
              <MessageEntity
                key={msg.id}
                message={msg}
                onAction={handleAction}
                onAppPress={handleAppPress}
              />
            ))}
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Liquid Input */}
        <View style={styles.inputArea}>
          <LiquidInput
            value={inputText}
            onChangeText={setInputText}
            onSubmit={() => handleCommand(inputText)}
            orbState={orbState}
            onFocusChange={setIsInputFocused}
          />

          {/* User Micro Bar */}
          <View style={styles.microBar}>
            <View style={styles.microItem}>
              <UserCheck size={12} color={S.textQuaternary} />
              <Text style={styles.microText} numberOfLines={1}>
                {userState.user?.email || 'Khách'}
              </Text>
            </View>
            <View style={styles.microDivider} />
            <View style={styles.microItem}>
              <Wallet size={12} color={S.emerald} />
              <Text style={[styles.microText, { color: S.emerald }]}>
                {userState.coins.toLocaleString('vi-VN')}đ
              </Text>
            </View>
            <View style={styles.microDivider} />
            <View style={styles.microItem}>
              <Crown size={12} color={userState.isVIP ? S.amber : S.textQuaternary} />
              <Text style={[styles.microText, { color: userState.isVIP ? S.amber : S.textQuaternary }]}>
                {userState.vipStatus}
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — Spatial Typography & Geometry
   ═══════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: S.void,
  },

  // Header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: S.text,
    letterSpacing: -0.3,
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: S.textQuaternary,
  },
  statusDotActive: {
    backgroundColor: S.cyan,
    shadowColor: S.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  headerStatusText: {
    fontSize: 11,
    color: S.textTertiary,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },

  // Orb Section
  orbSection: {
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 280,
    justifyContent: 'center',
  },
  orbLabel: {
    marginTop: 24,
    alignItems: 'center',
  },
  orbLabelText: {
    fontSize: 22,
    fontWeight: '800',
    color: S.textPrimary,
    letterSpacing: -0.5,
  },

  // Suggestions
  suggestionSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: S.textTertiary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: S.radius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: S.textSecondary,
  },

  // Messages
  messagesArea: {
    paddingHorizontal: 18,
    gap: 24,
  },

  // User Entity
  userEntity: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  userEntityInner: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: S.radius.lg,
    borderBottomRightRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxWidth: '80%',
  },
  userEntityText: {
    fontSize: 15,
    color: S.text,
    fontWeight: '600',
    lineHeight: 22,
  },

  // Intelligence Entity
  intelligenceEntity: {
    marginBottom: 8,
  },
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  intentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: S.cyan,
    shadowColor: S.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  intentLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: S.cyan,
    letterSpacing: 0.5,
  },
  entityTime: {
    fontSize: 11,
    color: S.textQuaternary,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  entityContent: {
    paddingLeft: 4,
  },
  intelligenceText: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textPrimary,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  wordToken: {
    fontSize: 16,
    lineHeight: 26,
    color: S.textPrimary,
    fontWeight: '500',
  },

  // App Cards
  appCardRow: {
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  spatialCardWrap: {
    width: 260,
  },
  spatialCard: {
    borderRadius: S.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    minHeight: 140,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: S.depth3,
  },
  cardMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '900',
    color: S.text,
    letterSpacing: -0.3,
  },
  cardCategory: {
    fontSize: 12,
    color: S.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardRatingText: {
    fontSize: 12,
    fontWeight: '800',
    color: S.amber,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: S.radius.full,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardAction: {
    marginTop: 'auto',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: S.text,
    paddingVertical: 8,
    borderRadius: S.radius.full,
  },
  cardButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: S.void,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    paddingLeft: 4,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: S.radius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Input
  inputArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  liquidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: S.radius.full,
    borderWidth: 1.5,
    paddingLeft: 20,
    paddingRight: 6,
    overflow: 'hidden',
    shadowColor: S.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
  },
  liquidInput: {
    flex: 1,
    color: S.text,
    fontSize: 15,
    fontWeight: '600',
    height: '100%',
    padding: 0,
  },
  sendCapsule: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginLeft: 8,
  },

  // Micro Bar
  microBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  microItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  microDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  microText: {
    fontSize: 11,
    fontWeight: '700',
    color: S.textQuaternary,
  },
});

// Helper for interpolateColor in reanimated
function interpolateColor(progress: any, inputRange: number[], outputRange: string[]) {
  'worklet';
  // Simplified - in production use interpolateColor from reanimated
  return outputRange[0];
}