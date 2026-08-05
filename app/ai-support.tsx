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
} from 'react-native-reanimated';
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
  RotateCcw,
  Bot,
} from 'lucide-react-native';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
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

  springBouncy: { damping: 12, stiffness: 200, mass: 0.8 },
  springSoft: { damping: 20, stiffness: 120, mass: 1.2 },
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
    } catch {}
  }, []);
  return trigger;
};

/* ═══════════════════════════════════════════════════════════════
   LIVING BACKGROUND — Spatial Ambient
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

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: S.void }]} />

      <LinearGradient
        colors={[S.depth1, S.depth2, S.depth3]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          aurora1Style,
          { justifyContent: 'flex-start', alignItems: 'flex-start' },
        ]}
      >
        <View style={{
          width: 500,
          height: 500,
          borderRadius: 250,
          backgroundColor: 'rgba(139,92,246,0.09)',
          top: -100,
          left: -150,
        }} />
      </Animated.View>

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          aurora2Style,
          { justifyContent: 'flex-end', alignItems: 'flex-end' },
        ]}
      >
        <View style={{
          width: 450,
          height: 450,
          borderRadius: 225,
          backgroundColor: 'rgba(0,229,255,0.07)',
          bottom: -80,
          right: -80,
        }} />
      </Animated.View>
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   ENERGY ORB — Living AI Entity
   ═══════════════════════════════════════════════════════════════ */

const ORB_SIZE = 120;

interface EnergyOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

const EnergyOrb = memo(({ state }: EnergyOrbProps) => {
  const breath = useSharedValue(1);

  useEffect(() => {
    if (state === 'idle') {
      breath.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true
      );
    } else if (state === 'thinking') {
      breath.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 600, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.cubic) }),
        ),
        -1,
        true
      );
    }

    return () => { cancelAnimation(breath); };
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return (
    <View style={{ width: ORB_SIZE, height: ORB_SIZE, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={[styles.orbGlowLayer, animatedStyle]}>
        <LinearGradient
          colors={['rgba(0,229,255,0.35)', 'rgba(167,139,250,0.25)', 'transparent']}
          style={styles.orbGlowCircle}
        />
      </Animated.View>

      <Animated.View style={[styles.orbCoreBox, animatedStyle]}>
        <LinearGradient
          colors={['#00E5FF', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orbCoreGradient}
        />
        <Bot size={42} color="#FFFFFF" strokeWidth={2.2} />
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
  orbState?: string;
  onFocusChange: (focused: boolean) => void;
}

const LiquidInput = memo(({ value, onChangeText, onSubmit, onFocusChange }: LiquidInputProps) => {
  const focused = useSharedValue(0);
  const scale = useSharedValue(1);
  const haptic = useHaptic();

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focused.value === 1 ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)',
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
   INTELLIGENCE TEXT & SPATIAL CARD
   ═══════════════════════════════════════════════════════════════ */

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

  const colors = {
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
      <View style={styles.intentRow}>
        <View style={styles.intentDot} />
        <Text style={styles.intentLabel}>
          {message.isProcessing ? 'Đang phân tích...' : 'Intelligence'}
        </Text>
        <Text style={styles.entityTime}>{message.timestamp}</Text>
      </View>

      <View style={styles.entityContent}>
        <IntelligenceText text={message.text} />
      </View>

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
   COMMAND CENTER — Intent Engine
   ═══════════════════════════════════════════════════════════════ */

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
      text: `Hệ thống nạp xu tự động qua ACB (STK 22703611 - TRAN NGUYEN MINH QUI). Nội dung NAP ${userEmail || 'Email'}. Xu cộng tự động sau 10-30 giây.`,
      actions: [
        { label: 'Đến trang nạp', route: '/account', style: 'primary' },
      ],
      intent: 'recharge',
    };
  }

  if (t.includes('crash') || t.includes('loi') || t.includes('thu hoi') || t.includes('vang') || t.includes('khong mo')) {
    return {
      text: 'Apple đã thu hồi chứng chỉ doanh nghiệp. Gỡ app bị lỗi, ký lại bằng chứng chỉ cá nhân hoặc dùng gói VIP độc quyền chống thu hồi.',
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

  return {
    text: 'Tôi là Intelligence của IPAVIET OS. Tôi có thể giúp bạn gia hạn VIP, ký IPA, nạp xu, tìm app, hoặc xử lý lỗi.',
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
   MAIN SCREEN — Spatial Intelligence
   ═══════════════════════════════════════════════════════════════ */

export default function AiSupportScreen() {
  const router = useRouter();
  const userState = useUserState();
  const haptic = useHaptic();

  const [messages, setMessages] = useState<IntelligenceMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [apps, setApps] = useState<AppItem[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Promise.all([fetchRegularApps(), fetchVIPApps()]).then(([reg, vip]) => {
      setApps([...reg, ...vip]);
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;

    const userMsg: IntelligenceMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const inputCopy = inputText.trim();
    setInputText('');
    setOrbState('thinking');
    scrollToBottom();

    setTimeout(() => {
      const res = processIntent(inputCopy, apps, userState.user?.email);
      const botMsg: IntelligenceMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'intelligence',
        text: res.text,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        actions: res.actions,
        appCards: res.appCards,
        intent: res.intent,
      };

      setOrbState('speaking');
      setMessages((prev) => [...prev, botMsg]);
      scrollToBottom();

      setTimeout(() => {
        setOrbState('idle');
      }, 2000);
    }, 800);
  }, [inputText, apps, userState, scrollToBottom]);

  const handleAction = useCallback((act: CommandAction) => {
    if (act.route) {
      router.push(act.route as any);
    } else if (act.actionType === 'zalo') {
      Alert.alert('Liên hệ Admin', 'Zalo Kỹ Thuật IPAVIET: 0987.xxx.xxx');
    }
  }, [router]);

  const handleAppPress = useCallback((id: string) => {
    router.push(`/details/${id}` as any);
  }, [router]);

  const resetChat = useCallback(() => {
    haptic('success');
    setMessages([]);
    setOrbState('idle');
  }, [haptic]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <RNStatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* 10 Layer Spatial Background */}
      <LivingBackground />

      {/* Floating Header Bar */}
      <View style={styles.topHeader}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.iconCircleBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <ArrowLeft size={18} color={S.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitleText}>IPAVIET Intelligence</Text>
            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: S.emerald }]} />
              <Text style={styles.statusText}>{userState.user ? userState.user.email : 'Spatial OS 2026'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.iconCircleBtn} onPress={resetChat} activeOpacity={0.8}>
            <RotateCcw size={16} color={S.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Stream Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 110, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Energy Orb Header */}
          <View style={styles.orbHeaderBox}>
            <EnergyOrb state={orbState} />
            {messages.length === 0 && (
              <View style={styles.heroTextBox}>
                <Text style={styles.heroTitleText}>
                  Xin chào, <Text style={{ color: S.cyan }}>{userState.user?.displayName || 'Sếp'}</Text>
                </Text>
                <Text style={styles.heroSubText}>
                  Hệ thống Trợ lý Ảo Spatial Intelligence đã sẵn sàng hỗ trợ ký App, nạp xu và tra cứu dữ liệu.
                </Text>
              </View>
            )}
          </View>

          {/* Messages Entities */}
          {messages.map((m) => (
            <MessageEntity
              key={m.id}
              message={m}
              onAction={handleAction}
              onAppPress={handleAppPress}
            />
          ))}
        </ScrollView>

        {/* Liquid Input Container */}
        <View style={styles.inputDock}>
          <LiquidInput
            value={inputText}
            onChangeText={setInputText}
            onSubmit={handleSend}
            orbState={orbState}
            onFocusChange={setIsInputFocused}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — Living Spatial Engine
   ═══════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: S.void,
  },

  // Header
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 94 : 70,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    zIndex: 200,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: S.text,
    letterSpacing: -0.3,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: S.textSecondary,
  },

  // Orb Header Box
  orbHeaderBox: {
    alignItems: 'center',
    marginVertical: 20,
  },
  orbGlowLayer: {
    position: 'absolute',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbGlowCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  orbCoreBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: S.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  orbCoreGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTextBox: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  heroTitleText: {
    fontSize: 24,
    fontWeight: '900',
    color: S.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubText: {
    fontSize: 13,
    fontWeight: '500',
    color: S.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 320,
  },

  // User Message
  userEntity: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    maxWidth: '84%',
  },
  userEntityInner: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    borderBottomRightRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  userEntityText: {
    fontSize: 14,
    fontWeight: '600',
    color: S.text,
    lineHeight: 22,
  },

  // Intelligence Entity
  intelligenceEntity: {
    marginBottom: 28,
  },
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  intentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: S.cyan,
  },
  intentLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: S.cyan,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  entityTime: {
    fontSize: 10,
    fontWeight: '600',
    color: S.textTertiary,
    marginLeft: 'auto',
  },
  entityContent: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    borderTopLeftRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  intelligenceText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: S.textPrimary,
  },
  wordToken: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: S.textPrimary,
  },

  // App Cards Row
  appCardRow: {
    gap: 12,
    marginTop: 14,
    paddingRight: 20,
  },
  spatialCardWrap: {
    width: 220,
  },
  spatialCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  cardMeta: {
    flex: 1,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '900',
    color: S.text,
    letterSpacing: -0.2,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: S.textSecondary,
    marginTop: 2,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardRatingText: {
    fontSize: 10,
    fontWeight: '800',
    color: S.amber,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardAction: {
    marginTop: 12,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: S.cyan,
    paddingVertical: 8,
    borderRadius: 14,
  },
  cardButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: S.void,
  },

  // Action Chips
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  // Input Dock
  inputDock: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    zIndex: 200,
  },
  liquidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingLeft: 20,
    paddingRight: 8,
    overflow: 'hidden',
    shadowColor: S.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  liquidInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: S.text,
    height: '100%',
    padding: 0,
  },
  sendCapsule: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});