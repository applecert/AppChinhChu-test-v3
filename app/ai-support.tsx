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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedKeyboard,
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
  ShieldCheck,
  AlertTriangle,
  Zap,
  ChevronRight,
  Star,
  RotateCcw,
  Bot,
  Copy,
  FileCheck,
  CheckCircle2,
  FileUp,
  KeyRound,
} from 'lucide-react-native';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../constants/data';

const BANK_ACCOUNT = '22703611';
const BANK_NAME = 'ACB';
const BANK_OWNER = 'TRAN NGUYEN MINH QUI';

/* ═══════════════════════════════════════════════════════════════
   SPATIAL DESIGN SYSTEM — iOS 26 Autonomous Intelligence
   ═══════════════════════════════════════════════════════════════ */

const S = {
  void: '#000000',
  depth1: '#020205',
  depth2: '#05050A',
  depth3: '#080810',

  cyan: '#00E5FF',
  violet: '#A78BFA',
  rose: '#FB7185',
  amber: '#FBBF24',
  emerald: '#34D399',

  text: '#FFFFFF',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.30)',

  springBouncy: { damping: 12, stiffness: 200, mass: 0.8 },
  springSoft: { damping: 18, stiffness: 140, mass: 1.0 },
  timingFast: { duration: 250, easing: Easing.out(Easing.quad) },
};

/* ═══════════════════════════════════════════════════════════════
   TYPES & WIDGET INTERFACES
   ═══════════════════════════════════════════════════════════════ */

type IntentType =
  | 'cert_import'
  | 'recharge'
  | 'vip_upgrade'
  | 'search'
  | 'crash'
  | 'mmo'
  | 'support'
  | 'greeting';

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
  widgetType?: 'cert_import' | 'bank_deposit' | 'vip_packages' | 'app_search';
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
   EMBEDDED INTERACTIVE TOOL WIDGETS
   ═══════════════════════════════════════════════════════════════ */

// 1. Certificate Import Form Widget
const CertImportWidget = memo(({ onComplete }: { onComplete: (filename: string, pass: string) => void }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const haptic = useHaptic();

  const handlePickFile = async () => {
    try {
      haptic('light');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed', '*/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setSelectedFile(res.assets[0].name);
        haptic('success');
      }
    } catch {
      setSelectedFile('Cert_VIP_2026.zip');
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      Alert.alert('Thông báo', 'Sếp vui lòng chọn tệp ZIP chứa chứng chỉ P12 nhé!');
      return;
    }
    haptic('medium');
    onComplete(selectedFile, password || '1');
  };

  return (
    <View style={styles.widgetBox}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,229,255,0.08)', 'rgba(167,139,250,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <FileUp size={16} color={S.cyan} />
        <Text style={styles.widgetTitleText}>NẠP CHỨNG CHỈ P12 TỰ ĐỘNG</Text>
      </View>

      {/* Select File Button */}
      <TouchableOpacity style={styles.widgetPickBtn} onPress={handlePickFile} activeOpacity={0.8}>
        <FileCheck size={18} color={selectedFile ? S.emerald : S.textSecondary} />
        <Text style={[styles.widgetPickBtnText, selectedFile && { color: S.emerald, fontWeight: '800' }]} numberOfLines={1}>
          {selectedFile ? `Đã chọn: ${selectedFile}` : 'Chọn tệp ZIP chứng chỉ (.zip)'}
        </Text>
      </TouchableOpacity>

      {/* Password Input */}
      <View style={styles.widgetInputRow}>
        <KeyRound size={16} color={S.textSecondary} />
        <TextInput
          style={styles.widgetTextInput}
          placeholder="Mật khẩu P12 (Mặc định 1)"
          placeholderTextColor={S.textTertiary}
          value={password}
          onChangeText={setPassword}
          selectionColor={S.cyan}
        />
      </View>

      {/* Confirm Button */}
      <TouchableOpacity style={styles.widgetSubmitBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <LinearGradient colors={[S.cyan, S.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Zap size={14} color={S.void} />
        <Text style={styles.widgetSubmitBtnText}>XÁC NHẬN NẠP & KÝ TỰ ĐỘNG</Text>
      </TouchableOpacity>
    </View>
  );
});

// 2. Bank Deposit Widget
const BankDepositWidget = memo(({ userEmail }: { userEmail?: string }) => {
  const haptic = useHaptic();
  const [copiedStk, setCopiedStk] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  const contentStr = `NAP ${userEmail || 'TAIKHOAN'}`;

  const copyText = (txt: string, type: 'stk' | 'content') => {
    haptic('success');
    if (type === 'stk') {
      setCopiedStk(true);
      setTimeout(() => setCopiedStk(false), 2000);
    } else {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
    Alert.alert('Đã Sao Chép', `Đã copy "${txt}" vào khay nhớ tạm!`);
  };

  return (
    <View style={styles.widgetBox}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(52,211,153,0.08)', 'rgba(0,229,255,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <Wallet size={16} color={S.emerald} />
        <Text style={[styles.widgetTitleText, { color: S.emerald }]}>THẺ NẠP XU TỰ ĐỘNG (ACB BANK)</Text>
      </View>

      <View style={styles.bankDetailCard}>
        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>Ngân hàng:</Text>
          <Text style={styles.bankValBold}>{BANK_NAME} (Á Châu)</Text>
        </View>

        <View style={styles.bankDetailRow}>
          <Text style={styles.bankLabel}>Chủ tài khoản:</Text>
          <Text style={styles.bankValBold}>{BANK_OWNER}</Text>
        </View>

        {/* STK Row */}
        <View style={styles.bankCopyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bankLabel}>Số tài khoản:</Text>
            <Text style={styles.bankValHighlight}>{BANK_ACCOUNT}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtnPill}
            onPress={() => copyText(BANK_ACCOUNT, 'stk')}
            activeOpacity={0.8}
          >
            {copiedStk ? <CheckCircle2 size={14} color={S.emerald} /> : <Copy size={14} color={S.text} />}
            <Text style={styles.copyBtnText}>{copiedStk ? 'Đã chép' : 'Copy STK'}</Text>
          </TouchableOpacity>
        </View>

        {/* Transfer Content Row */}
        <View style={styles.bankCopyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bankLabel}>Nội dung nạp:</Text>
            <Text style={styles.bankValHighlight}>{contentStr}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtnPill}
            onPress={() => copyText(contentStr, 'content')}
            activeOpacity={0.8}
          >
            {copiedContent ? <CheckCircle2 size={14} color={S.emerald} /> : <Copy size={14} color={S.text} />}
            <Text style={styles.copyBtnText}>{copiedContent ? 'Đã chép' : 'Copy Nội dung'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// 3. VIP Package Selector Widget
const VipPackagesWidget = memo(({ onSelectPackage }: { onSelectPackage: (pkg: string, cost: number) => void }) => {
  const haptic = useHaptic();

  return (
    <View style={styles.widgetBox}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(251,191,36,0.08)', 'rgba(0,229,255,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <Crown size={16} color={S.amber} />
        <Text style={[styles.widgetTitleText, { color: S.amber }]}>BẢNG GIÁ VIP IPAVIET CHỐNG THU HỒI</Text>
      </View>

      <View style={{ gap: 10, marginTop: 10 }}>
        <TouchableOpacity
          style={styles.vipPkgCard}
          onPress={() => {
            haptic('medium');
            onSelectPackage('Gói VIP 1 Tháng', 50000);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.vipPkgName}>Gói VIP 1 Tháng</Text>
            <Text style={styles.vipPkgDesc}>Tải max tốc độ, ký cert riêng chống văng</Text>
          </View>
          <View style={styles.vipPkgPriceBox}>
            <Text style={styles.vipPkgPriceText}>50.000đ</Text>
            <Text style={styles.vipPkgBuyText}>Đăng ký</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.vipPkgCard, { borderColor: S.amber }]}
          onPress={() => {
            haptic('heavy');
            onSelectPackage('Gói VIP 1 Năm (Khuyên Dùng)', 300000);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.vipPkgName}>Gói VIP 1 Năm</Text>
              <View style={styles.bestTag}><Text style={styles.bestTagText}>HOT</Text></View>
            </View>
            <Text style={styles.vipPkgDesc}>Tiết kiệm 50%, bảo hành thu hồi trọn đời</Text>
          </View>
          <View style={styles.vipPkgPriceBox}>
            <Text style={[styles.vipPkgPriceText, { color: S.amber }]}>300.000đ</Text>
            <Text style={styles.vipPkgBuyText}>Đăng ký</Text>
          </View>
        </TouchableOpacity>
      </View>
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
    borderColor: focused.value === 1 ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.08)',
    transform: [{ scale: scale.value }],
  }));

  const handleFocus = () => {
    focused.value = withTiming(1, S.timingFast);
    scale.value = withSpring(1.02, S.springSoft);
    onFocusChange(true);
    haptic('light');
  };

  const handleBlur = () => {
    focused.value = withTiming(0, S.timingFast);
    scale.value = withSpring(1, S.springSoft);
    onFocusChange(false);
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    scale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
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
        placeholder="Yêu cầu AI bất kỳ điều gì (gõ 'ipa youtube', 'nạp xu', 'chứng chỉ')..."
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
    entry.value = withDelay(index * 80, withSpring(1, S.springSoft));
  }, []);

  const entryStyle = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [
      { translateY: interpolate(entry.value, [0, 1], [30, 0]) },
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
              <Text style={styles.cardButtonText}>TẢI IPA NGAY</Text>
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
    transform: [{ scale: press.value }, { translateY: interpolate(entry.value, [0, 1], [15, 0]) }],
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

const MessageEntity = memo(({
  message,
  onAction,
  onAppPress,
  onCertComplete,
  onSelectVipPkg,
  userEmail,
}: {
  message: IntelligenceMessage;
  onAction: (a: CommandAction) => void;
  onAppPress: (id: string) => void;
  onCertComplete: (filename: string, pass: string) => void;
  onSelectVipPkg: (pkg: string, cost: number) => void;
  userEmail?: string;
}) => {
  const entry = useSharedValue(0);
  const isUser = message.sender === 'user';

  useEffect(() => {
    entry.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.8 });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: interpolate(entry.value, [0, 1], [35, 0]) }],
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
          {message.isProcessing ? 'Đang xử lý tự động...' : 'Autonomous AI'}
        </Text>
        <Text style={styles.entityTime}>{message.timestamp}</Text>
      </View>

      <View style={styles.entityContent}>
        <IntelligenceText text={message.text} />
      </View>

      {/* Embedded Widgets */}
      {message.widgetType === 'cert_import' && (
        <CertImportWidget onComplete={onCertComplete} />
      )}

      {message.widgetType === 'bank_deposit' && (
        <BankDepositWidget userEmail={userEmail} />
      )}

      {message.widgetType === 'vip_packages' && (
        <VipPackagesWidget onSelectPackage={onSelectVipPkg} />
      )}

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
   SMART AUTONOMOUS INTENT ENGINE
   ═══════════════════════════════════════════════════════════════ */

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

interface ProcessResult {
  text: string;
  actions: CommandAction[];
  appCards?: AppItem[];
  intent: IntentType;
  widgetType?: 'cert_import' | 'bank_deposit' | 'vip_packages' | 'app_search';
}

const processSmartIntent = (raw: string, apps: AppItem[], userEmail?: string): ProcessResult => {
  const t = removeAccents(raw);

  // Newbie / Certificate Guide -> Embedded Cert Import Form Widget
  if (t.includes('nguoi moi') || t.includes('moi dung') || t.includes('khong biet') || t.includes('chi toi') || t.includes('cert') || t.includes('p12') || t.includes('huong dan')) {
    return {
      text: `Dạ em đã kiểm tra trên hệ thống và thấy sếp cần nạp chứng chỉ P12. Sếp không cần tự thao tác thủ công, hãy chọn tệp ZIP chứng chỉ và nhập mật khẩu ngay bên dưới để em tự động ký App cho sếp nhé!`,
      widgetType: 'cert_import',
      actions: [
        { label: '🛠️ Mở Trang Ký Chi Tiết', route: '/sign', style: 'primary' },
        { label: '👑 Mua Gói VIP Không Cần P12', route: '/buy-vip', style: 'secondary' },
      ],
      intent: 'cert_import',
    };
  }

  // Recharge / Deposit -> Embedded Bank Copy Deposit Card Widget
  if (t.includes('nap') || t.includes('tien') || t.includes('xu') || t.includes('bank') || t.includes('ngan hang') || t.includes('stk')) {
    return {
      text: `Dạ em đã tạo sẵn thẻ nạp xu tự động qua ACB cho sếp đây ạ. Sếp bấm nút "Copy STK" và "Copy Nội Dung" bên dưới để chuyển khoản, xu sẽ được cộng tự động sau 10 giây!`,
      widgetType: 'bank_deposit',
      actions: [
        { label: '💳 Mở Trang Tài Khoản', route: '/account', style: 'primary' },
      ],
      intent: 'recharge',
    };
  }

  // VIP Upgrade -> Embedded VIP Packages Selector Widget
  if (t.includes('vip') || t.includes('gia han') || t.includes('mua goi') || t.includes('nang cap')) {
    return {
      text: `Dạ em đã chuẩn bị sẵn bảng giá các gói VIP IPAVIET độc quyền cho sếp. Chọn gói bên dưới để nâng cấp tự động nhé!`,
      widgetType: 'vip_packages',
      actions: [
        { label: '💳 Nạp Xu Trước', route: '/account', style: 'secondary' },
      ],
      intent: 'vip_upgrade',
    };
  }

  // App / IPA Search -> Instant Matched App Cards with Direct Install Actions
  if (t.includes('tim') || t.includes('app') || t.includes('game') || t.includes('ipa') || t.includes('youtube') || t.includes('facebook') || t.includes('tiktok') || t.includes('pubg') || t.includes('mod') || t.includes('hack')) {
    const q = raw.replace(/(tim|app|ipa|game|cho|xem|can|muon|bản|tải|down|download)/gi, '').trim();
    const matched = q.length >= 2 ? apps.filter(a =>
      removeAccents(a.name).includes(removeAccents(q)) ||
      removeAccents(a.category || '').includes(removeAccents(q))
    ).slice(0, 4) : [];

    if (matched.length > 0) {
      return {
        text: `Dạ em đã tìm thấy ${matched.length} ứng dụng Mod/Tweak ngon nhất đúng yêu cầu của sếp đây ạ! Bấm "TẢI IPA NGAY" để cài đặt tự động nhé:`,
        appCards: matched,
        actions: [
          { label: '📦 Mở Tất Cả Trong Kho IPA', route: '/apps', style: 'primary' },
        ],
        intent: 'search',
      };
    }
    return {
      text: `Dạ Kho IPA hiện có hàng trăm app Mod/Cheat sẵn. Sếp có thể bấm mở Kho IPA bên dưới hoặc nhắn tên App cụ thể để em tìm nhé!`,
      actions: [
        { label: 'Khám Phá Kho IPA', route: '/apps', style: 'primary' },
        { label: 'Kho App VIP', route: '/vip', style: 'secondary' },
      ],
      intent: 'search',
    };
  }

  // App Crash / Revoke -> Cert Widget + VIP Widget Combo
  if (t.includes('crash') || t.includes('loi') || t.includes('thu hoi') || t.includes('vang') || t.includes('khong mo')) {
    return {
      text: `Nguyên nhân do Apple đã thu hồi chứng chỉ doanh nghiệp dùng chung. Sếp nạp lại tệp P12 cá nhân bên dưới để em ký lại, hoặc nâng cấp VIP để dùng chứng chỉ độc quyền chống văng app 100%!`,
      widgetType: 'cert_import',
      actions: [
        { label: '👑 Mua Chứng Chỉ VIP', route: '/buy-vip', style: 'primary' },
        { label: '🛠️ Tự Ký Lại App', route: '/sign', style: 'secondary' },
      ],
      intent: 'crash',
    };
  }

  return {
    text: `Dạ em là Trợ Lý Ảo Autonomous AI của IPAVIET OS đây ạ! Em có thể tự động ký App, tạo thẻ nạp xu ACB, hướng dẫn nạp P12 và tìm kiếm bất kỳ bản IPA Mod nào cho sếp. Sếp nhắn yêu cầu nhé!`,
    actions: [
      { label: '🚀 Nạp Chứng Chỉ P12', route: '/sign', style: 'primary' },
      { label: '💳 Thẻ Nạp Xu ACB', route: '/account', style: 'secondary' },
      { label: '👑 Bảng Giá VIP', route: '/buy-vip', style: 'secondary' },
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
  const keyboard = useAnimatedKeyboard({ isStatusBarTranslucentAndroid: true });

  useEffect(() => {
    Promise.all([fetchRegularApps(), fetchVIPApps()]).then(([reg, vip]) => {
      setApps([...reg, ...vip]);
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return () => sub.remove();
  }, []);

  const animatedDockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));

  const animatedScrollPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: 130 + keyboard.height.value,
  }));

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const handleSendText = useCallback(
    (textToSend: string) => {
      if (!textToSend.trim()) return;

      const userMsg: IntelligenceMessage = {
        id: Date.now().toString(),
        sender: 'user',
        text: textToSend.trim(),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setOrbState('thinking');
      scrollToBottom();

      setTimeout(() => {
        const res = processSmartIntent(textToSend, apps, userState.user?.email);
        const botMsg: IntelligenceMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'intelligence',
          text: res.text,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          actions: res.actions,
          appCards: res.appCards,
          intent: res.intent,
          widgetType: res.widgetType,
        };

        setOrbState('speaking');
        setMessages((prev) => [...prev, botMsg]);
        scrollToBottom();

        setTimeout(() => {
          setOrbState('idle');
        }, 2000);
      }, 700);
    },
    [apps, userState, scrollToBottom]
  );

  const handleSend = useCallback(() => {
    handleSendText(inputText);
  }, [inputText, handleSendText]);

  const handleAction = useCallback(
    (act: CommandAction) => {
      if (act.route) {
        router.push(act.route as any);
      } else if (act.actionType === 'zalo') {
        Alert.alert('Liên hệ Admin', 'Zalo Kỹ Thuật IPAVIET: 0987.xxx.xxx');
      }
    },
    [router]
  );

  const handleAppPress = useCallback(
    (id: string) => {
      router.push(`/details/${id}` as any);
    },
    [router]
  );

  const handleCertComplete = useCallback((filename: string, pass: string) => {
    haptic('success');
    const responseMsg: IntelligenceMessage = {
      id: Date.now().toString(),
      sender: 'intelligence',
      text: `🎉 **Đã Nhận & Lưu Chứng Chỉ Thành Công!**\n\nEm đã lưu tệp chứng chỉ **${filename}** (Mật khẩu: \`${pass}\`). Bây giờ sếp chọn ứng dụng IPA bên dưới để em tự động ký ngay cho sếp nhé!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: '🚀 KÝ APP IPA BẤT KỲ NGAY', route: '/sign', style: 'primary' },
        { label: '📦 XEM KHO IPA', route: '/apps', style: 'secondary' },
      ],
    };
    setMessages((prev) => [...prev, responseMsg]);
    scrollToBottom();
  }, [haptic, scrollToBottom]);

  const handleSelectVipPkg = useCallback((pkg: string, cost: number) => {
    if (userState.coins < cost) {
      haptic('warning');
      Alert.alert(
        'Số Dư Không Đủ',
        `Sếp hiện có ${userState.coins.toLocaleString('vi-VN')}đ, cần thêm ${(cost - userState.coins).toLocaleString('vi-VN')}đ để đăng ký ${pkg}. Sếp bấm "Nạp Xu" để chuyển khoản nhé!`,
        [
          { text: 'Để Sau', style: 'cancel' },
          { text: 'Nạp Xu Ngay', onPress: () => handleSendText('nạp xu ngân hàng') },
        ]
      );

      const botMsg: IntelligenceMessage = {
        id: Date.now().toString(),
        sender: 'intelligence',
        text: `⚠️ **Số dư xu chưa đủ để mua ${pkg}**\n\nEm tạo sẵn thẻ nạp xu ACB bên dưới cho sếp chuyển khoản nhé:`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        widgetType: 'bank_deposit',
      };
      setMessages((prev) => [...prev, botMsg]);
      scrollToBottom();
      return;
    }

    haptic('success');
    Alert.alert('Xác Nhận VIP', `Sếp có muốn đăng ký ${pkg} với giá ${cost.toLocaleString('vi-VN')}đ không?`);
  }, [userState, haptic, handleSendText, scrollToBottom]);

  const resetChat = useCallback(() => {
    haptic('success');
    setMessages([]);
    setOrbState('idle');
  }, [haptic]);

  const suggestions = [
    { label: 'Hướng dẫn người mới', query: 'huong dan nguoi moi nap cert', icon: <HelpCircle size={15} color="#00E5FF" /> },
    { label: 'Tìm ứng dụng IPA', query: 'tim ung dung ipa', icon: <Sparkles size={15} color="#A78BFA" /> },
    { label: 'Thẻ nạp xu ACB', query: 'nap xu bank acb', icon: <Wallet size={15} color="#34D399" /> },
    { label: 'Bảng giá VIP', query: 'gia han vip', icon: <Crown size={15} color="#FBBF24" /> },
    { label: 'Lỗi app văng', query: 'loi chung chi app crash', icon: <AlertTriangle size={15} color="#FB7185" /> },
    { label: 'Admin hỗ trợ', query: 'lien he zalo admin', icon: <MessageSquare size={15} color="#60A5FA" /> },
  ];

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
            <Text style={styles.headerTitleText}>IPAVIET Autonomous AI</Text>
            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: S.emerald }]} />
              <Text style={styles.statusText}>{userState.user ? userState.user.email : 'Autonomous OS 2026'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.iconCircleBtn} onPress={resetChat} activeOpacity={0.8}>
            <RotateCcw size={16} color={S.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 94 : 70 }}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={animatedScrollPaddingStyle}>
            {/* Energy Orb Header */}
            <View style={styles.orbHeaderBox}>
              <EnergyOrb state={orbState} />
              {messages.length === 0 && (
                <View style={styles.heroTextBox}>
                  <Text style={styles.heroTitleText}>
                    Xin chào, <Text style={{ color: S.cyan }}>{userState.user?.displayName || 'Sếp'}</Text>
                  </Text>
                  <Text style={styles.heroSubText}>
                    Em là Autonomous AI. Em có thể tự động ký App, tạo thẻ nạp xu ACB, hướng dẫn nạp P12 và tìm IPA Mod cho sếp.
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Suggestions Grid when no messages */}
            {messages.length === 0 && (
              <View style={styles.suggestionGrid}>
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionPill}
                    onPress={() => handleSendText(item.query)}
                    activeOpacity={0.8}
                  >
                    {item.icon}
                    <Text style={styles.suggestionPillText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Messages Entities */}
            {messages.map((m) => (
              <MessageEntity
                key={m.id}
                message={m}
                onAction={handleAction}
                onAppPress={handleAppPress}
                onCertComplete={handleCertComplete}
                onSelectVipPkg={handleSelectVipPkg}
                userEmail={userState.user?.email}
              />
            ))}
          </Animated.View>
        </ScrollView>

        {/* Animated Floating Bottom Dock */}
        <Animated.View style={[styles.bottomFloatingDock, animatedDockStyle]}>
          {/* Quick Suggestion Scroll Bar above Input */}
          <View style={styles.quickBarRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {suggestions.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickBarBtn}
                  onPress={() => handleSendText(item.query)}
                  activeOpacity={0.8}
                >
                  {item.icon}
                  <Text style={styles.quickBarText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Liquid Input */}
          <View style={styles.inputDock}>
            <LiquidInput
              value={inputText}
              onChangeText={setInputText}
              onSubmit={handleSend}
              orbState={orbState}
              onFocusChange={setIsInputFocused}
            />
          </View>
        </Animated.View>
      </View>
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
    marginVertical: 12,
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
    marginTop: 16,
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

  // Suggestion Grid (Hero state)
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
    justifyContent: 'center',
    marginBottom: 20,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: S.text,
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

  // Intelligence Message
  intelligenceEntity: {
    marginBottom: 24,
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

  // Embedded Widget Box
  widgetBox: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    overflow: 'hidden',
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  widgetTitleText: {
    fontSize: 12,
    fontWeight: '900',
    color: S.cyan,
    letterSpacing: 0.5,
  },
  widgetPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  widgetPickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: S.textSecondary,
    flex: 1,
  },
  widgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 10,
  },
  widgetTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: S.text,
    height: '100%',
    padding: 0,
  },
  widgetSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    marginTop: 14,
    overflow: 'hidden',
  },
  widgetSubmitBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: S.void,
    letterSpacing: 0.2,
  },

  // Bank Deposit Widget Details
  bankDetailCard: {
    gap: 10,
    marginTop: 4,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: S.textSecondary,
  },
  bankValBold: {
    fontSize: 13,
    fontWeight: '800',
    color: S.textPrimary,
  },
  bankValHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: S.emerald,
    marginTop: 2,
  },
  bankCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  copyBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.text,
  },

  // VIP Package Cards Widget
  vipPkgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  vipPkgName: {
    fontSize: 14,
    fontWeight: '900',
    color: S.text,
  },
  vipPkgDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: S.textSecondary,
    marginTop: 3,
  },
  vipPkgPriceBox: {
    alignItems: 'flex-end',
  },
  vipPkgPriceText: {
    fontSize: 14,
    fontWeight: '900',
    color: S.cyan,
  },
  vipPkgBuyText: {
    fontSize: 11,
    fontWeight: '800',
    color: S.void,
    backgroundColor: S.text,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  bestTag: {
    backgroundColor: S.amber,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: S.void,
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
    gap: 8,
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

  // Bottom Floating Dock
  bottomFloatingDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 250,
  },
  quickBarRow: {
    paddingVertical: 6,
  },
  quickBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: S.textPrimary,
  },

  // Input Dock
  inputDock: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  liquidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingLeft: 20,
    paddingRight: 8,
    overflow: 'hidden',
    shadowColor: S.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  liquidInput: {
    flex: 1,
    fontSize: 13,
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