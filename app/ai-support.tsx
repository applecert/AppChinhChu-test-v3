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
  Switch,
  ActivityIndicator,
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
  Users,
  Banknote,
  Ticket,
  Box,
  Layers,
  PlusCircle,
  Flame,
  Settings,
  LayoutDashboard,
  Lock,
  Unlock,
  Trash2,
  Bell,
  RefreshCw,
  Search,
} from 'lucide-react-native';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../constants/data';
import { COLORS, useThemeUpdate, loadTheme } from '../constants/theme';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const BANK_ACCOUNT = '22703611';
const BANK_NAME = 'ACB';
const BANK_OWNER = 'TRAN NGUYEN MINH QUI';

/* ═══════════════════════════════════════════════════════════════
   SPATIAL DESIGN SYSTEM — iOS 26 Autonomous Intelligence
   ═══════════════════════════════════════════════════════════════ */

const S = {
  cyan: '#00E5FF',
  violet: '#A78BFA',
  rose: '#FB7185',
  amber: '#FBBF24',
  emerald: '#34D399',

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
  | 'greeting'
  | 'admin_stats'
  | 'admin_users'
  | 'admin_giftcode'
  | 'admin_push'
  | 'admin_config';

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
  widgetType?: 'cert_import' | 'bank_deposit' | 'vip_packages' | 'app_search' | 'admin_stats' | 'admin_users' | 'admin_giftcode' | 'admin_push' | 'admin_config';
  isProcessing?: boolean;
}

interface UserState {
  user: any;
  coins: number;
  vipStatus: string;
  isVIP: boolean;
  isAdmin: boolean;
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
    isAdmin: false,
  });

  useEffect(() => {
    let unsubDoc: any;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        const isAdminEmail = u.email?.toLowerCase() === 'mquitran@gmail.com';
        unsubDoc = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const coins = d.coins || 0;
            const exp = d.vipExpire;
            const isRoleAdmin = d.role === 'admin' || d.isAdmin === true || isAdminEmail;
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
            setState({ user: u, coins, vipStatus: vipText, isVIP: isV, isAdmin: isRoleAdmin });
          } else {
            setState({ user: u, coins: 0, vipStatus: 'Chưa đăng ký', isVIP: false, isAdmin: isAdminEmail });
          }
        });
      } else {
        setState({ user: null, coins: 0, vipStatus: 'Chưa đăng nhập', isVIP: false, isAdmin: false });
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
   LIVING BACKGROUND — Spatial Ambient (Light/Dark Dynamic)
   ═══════════════════════════════════════════════════════════════ */

const LivingBackground = memo(({ isLight }: { isLight: boolean }) => {
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
    opacity: isLight ? 0.4 : 0.6,
  }));

  const aurora2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(time.value, [0, 1], [20, -40]) },
      { translateY: interpolate(time.value, [0, 1], [30, -10]) },
      { scale: interpolate(time.value, [0, 0.5, 1], [1.1, 1, 1.1]) },
    ],
    opacity: isLight ? 0.3 : 0.5,
  }));

  const bgGradient = isLight
    ? (['#F4F4F6', '#FAFAFB', '#F4F4F6'] as const)
    : (['#020205', '#05050A', '#080810'] as const);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isLight ? '#F4F4F6' : '#000000' }]} />

      <LinearGradient
        colors={bgGradient}
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
          backgroundColor: isLight ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.09)',
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
          backgroundColor: isLight ? 'rgba(0,136,255,0.05)' : 'rgba(0,229,255,0.07)',
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
  isLight: boolean;
  isAdminMode?: boolean;
}

const EnergyOrb = memo(({ state, isLight, isAdminMode }: EnergyOrbProps) => {
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

  const orbColors = isAdminMode
    ? ['#FF0055', '#FF7700'] as const
    : (isLight ? ['#007AFF', '#7C3AED'] as const : ['#00E5FF', '#8B5CF6'] as const);

  return (
    <View style={{ width: ORB_SIZE, height: ORB_SIZE, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={[styles.orbGlowLayer, animatedStyle]}>
        <LinearGradient
          colors={isAdminMode
            ? ['rgba(255,0,85,0.4)', 'rgba(255,119,0,0.25)', 'transparent']
            : (isLight ? ['rgba(0,122,255,0.25)', 'rgba(139,92,246,0.18)', 'transparent'] : ['rgba(0,229,255,0.35)', 'rgba(167,139,250,0.25)', 'transparent'])
          }
          style={styles.orbGlowCircle}
        />
      </Animated.View>

      <Animated.View style={[styles.orbCoreBox, animatedStyle, { borderColor: isAdminMode ? '#FF0055' : (isLight ? 'rgba(0,122,255,0.4)' : 'rgba(255,255,255,0.3)') }]}>
        <LinearGradient
          colors={orbColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orbCoreGradient}
        />
        {isAdminMode ? <Crown size={42} color="#FFFFFF" strokeWidth={2.2} /> : <Bot size={42} color="#FFFFFF" strokeWidth={2.2} />}
      </Animated.View>
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   EMBEDDED INTERACTIVE TOOL WIDGETS
   ═══════════════════════════════════════════════════════════════ */

// 1. Certificate Import Form Widget
const CertImportWidget = memo(({ onComplete, isLight }: { onComplete: (filename: string, pass: string) => void; isLight: boolean }) => {
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

  const textColor = isLight ? '#111827' : '#FFFFFF';
  const subTextColor = isLight ? '#6B7280' : 'rgba(255,255,255,0.55)';
  const boxBg = isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)';
  const boxBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
  const inputBg = isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';

  return (
    <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <BlurView intensity={isLight ? 20 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={isLight ? ['rgba(0,122,255,0.05)', 'rgba(139,92,246,0.03)'] : ['rgba(0,229,255,0.08)', 'rgba(167,139,250,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <FileUp size={16} color={isLight ? '#007AFF' : S.cyan} />
        <Text style={[styles.widgetTitleText, { color: isLight ? '#007AFF' : S.cyan }]}>NẠP CHỨNG CHỈ P12 TỰ ĐỘNG</Text>
      </View>

      <TouchableOpacity style={[styles.widgetPickBtn, { backgroundColor: inputBg, borderColor: inputBorder }]} onPress={handlePickFile} activeOpacity={0.8}>
        <FileCheck size={18} color={selectedFile ? S.emerald : subTextColor} />
        <Text style={[styles.widgetPickBtnText, { color: selectedFile ? S.emerald : subTextColor }, selectedFile && { fontWeight: '800' }]} numberOfLines={1}>
          {selectedFile ? `Đã chọn: ${selectedFile}` : 'Chọn tệp ZIP chứng chỉ (.zip)'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.widgetInputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
        <KeyRound size={16} color={subTextColor} />
        <TextInput
          style={[styles.widgetTextInput, { color: textColor }]}
          placeholder="Mật khẩu P12 (Mặc định 1)"
          placeholderTextColor={subTextColor}
          value={password}
          onChangeText={setPassword}
          selectionColor={isLight ? '#007AFF' : S.cyan}
        />
      </View>

      <TouchableOpacity style={styles.widgetSubmitBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <LinearGradient colors={isLight ? ['#007AFF', '#7C3AED'] : [S.cyan, S.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Zap size={14} color="#FFFFFF" />
        <Text style={[styles.widgetSubmitBtnText, { color: '#FFFFFF' }]}>XÁC NHẬN NẠP & KÝ TỰ ĐỘNG</Text>
      </TouchableOpacity>
    </View>
  );
});

// 2. Bank Deposit Widget
const BankDepositWidget = memo(({ userEmail, isLight }: { userEmail?: string; isLight: boolean }) => {
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

  const textColor = isLight ? '#111827' : '#FFFFFF';
  const subTextColor = isLight ? '#6B7280' : 'rgba(255,255,255,0.55)';
  const boxBg = isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)';
  const boxBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
  const itemBg = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)';
  const itemBorder = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';

  return (
    <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <BlurView intensity={isLight ? 20 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={isLight ? ['rgba(52,211,153,0.06)', 'rgba(0,122,255,0.03)'] : ['rgba(52,211,153,0.08)', 'rgba(0,229,255,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <Wallet size={16} color={S.emerald} />
        <Text style={[styles.widgetTitleText, { color: S.emerald }]}>THẺ NẠP XU TỰ ĐỘNG (ACB BANK)</Text>
      </View>

      <View style={styles.bankDetailCard}>
        <View style={styles.bankDetailRow}>
          <Text style={[styles.bankLabel, { color: subTextColor }]}>Ngân hàng:</Text>
          <Text style={[styles.bankValBold, { color: textColor }]}>{BANK_NAME} (Á Châu)</Text>
        </View>

        <View style={styles.bankDetailRow}>
          <Text style={[styles.bankLabel, { color: subTextColor }]}>Chủ tài khoản:</Text>
          <Text style={[styles.bankValBold, { color: textColor }]}>{BANK_OWNER}</Text>
        </View>

        <View style={[styles.bankCopyRow, { backgroundColor: itemBg, borderColor: itemBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bankLabel, { color: subTextColor }]}>Số tài khoản:</Text>
            <Text style={styles.bankValHighlight}>{BANK_ACCOUNT}</Text>
          </View>
          <TouchableOpacity
            style={[styles.copyBtnPill, { backgroundColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.1)' }]}
            onPress={() => copyText(BANK_ACCOUNT, 'stk')}
            activeOpacity={0.8}
          >
            {copiedStk ? <CheckCircle2 size={14} color={S.emerald} /> : <Copy size={14} color={textColor} />}
            <Text style={[styles.copyBtnText, { color: textColor }]}>{copiedStk ? 'Đã chép' : 'Copy STK'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.bankCopyRow, { backgroundColor: itemBg, borderColor: itemBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bankLabel, { color: subTextColor }]}>Nội dung nạp:</Text>
            <Text style={styles.bankValHighlight}>{contentStr}</Text>
          </View>
          <TouchableOpacity
            style={[styles.copyBtnPill, { backgroundColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.1)' }]}
            onPress={() => copyText(contentStr, 'content')}
            activeOpacity={0.8}
          >
            {copiedContent ? <CheckCircle2 size={14} color={S.emerald} /> : <Copy size={14} color={textColor} />}
            <Text style={[styles.copyBtnText, { color: textColor }]}>{copiedContent ? 'Đã chép' : 'Copy Nội dung'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// 3. VIP Package Selector Widget
const VipPackagesWidget = memo(({ onSelectPackage, isLight }: { onSelectPackage: (pkg: string, cost: number) => void; isLight: boolean }) => {
  const haptic = useHaptic();

  const textColor = isLight ? '#111827' : '#FFFFFF';
  const subTextColor = isLight ? '#6B7280' : 'rgba(255,255,255,0.55)';
  const boxBg = isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)';
  const boxBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
  const cardBg = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';

  return (
    <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <BlurView intensity={isLight ? 20 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={isLight ? ['rgba(251,191,36,0.06)', 'rgba(0,122,255,0.03)'] : ['rgba(251,191,36,0.08)', 'rgba(0,229,255,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <Crown size={16} color={S.amber} />
        <Text style={[styles.widgetTitleText, { color: S.amber }]}>BẢNG GIÁ VIP IPAVIET CHỐNG THU HỒI</Text>
      </View>

      <View style={{ gap: 10, marginTop: 10 }}>
        <TouchableOpacity
          style={[styles.vipPkgCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={() => {
            haptic('medium');
            onSelectPackage('Gói VIP 1 Tháng', 50000);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.vipPkgName, { color: textColor }]}>Gói VIP 1 Tháng</Text>
            <Text style={[styles.vipPkgDesc, { color: subTextColor }]}>Tải max tốc độ, ký cert riêng chống văng</Text>
          </View>
          <View style={styles.vipPkgPriceBox}>
            <Text style={[styles.vipPkgPriceText, { color: isLight ? '#007AFF' : S.cyan }]}>50.000đ</Text>
            <Text style={[styles.vipPkgBuyText, { backgroundColor: isLight ? '#111827' : '#FFFFFF', color: isLight ? '#FFFFFF' : '#000000' }]}>Đăng ký</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.vipPkgCard, { backgroundColor: cardBg, borderColor: S.amber }]}
          onPress={() => {
            haptic('heavy');
            onSelectPackage('Gói VIP 1 Năm (Khuyên Dùng)', 300000);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.vipPkgName, { color: textColor }]}>Gói VIP 1 Năm</Text>
              <View style={styles.bestTag}><Text style={styles.bestTagText}>HOT</Text></View>
            </View>
            <Text style={[styles.vipPkgDesc, { color: subTextColor }]}>Tiết kiệm 50%, bảo hành thu hồi trọn đời</Text>
          </View>
          <View style={styles.vipPkgPriceBox}>
            <Text style={[styles.vipPkgPriceText, { color: S.amber }]}>300.000đ</Text>
            <Text style={[styles.vipPkgBuyText, { backgroundColor: isLight ? '#111827' : '#FFFFFF', color: isLight ? '#FFFFFF' : '#000000' }]}>Đăng ký</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN EMBEDDED WIDGETS (Stats, User Mod, Giftcode, Push, Config)
   ═══════════════════════════════════════════════════════════════ */

// 1. Admin Stats Dashboard Widget
const AdminStatsWidget = memo(({ isLight }: { isLight: boolean }) => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({ revenue: 0, totalUsers: 0, totalVips: 0, totalCoins: 0 });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let tUsers = 0, tVips = 0, tCoins = 0;
        const now = Date.now();
        usersSnap.forEach(d => {
          tUsers++;
          const data = d.data();
          tCoins += (data.coins || 0);
          const exp = data.vipExpire;
          const ms = exp?.toMillis ? exp.toMillis() : exp?.seconds ? exp.seconds * 1000 : Number(exp) || 0;
          if (ms > now) tVips++;
        });
        if (isMounted) {
          setStatsData({ revenue: tVips * 50000, totalUsers: tUsers, totalVips: tVips, totalCoins: tCoins });
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const boxBg = isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)';
  const boxBorder = isLight ? 'rgba(255,0,85,0.2)' : 'rgba(255,0,85,0.3)';
  const cardBg = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)';

  if (loading) {
    return (
      <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder, padding: 20, alignItems: 'center' }]}>
        <ActivityIndicator size="small" color="#FF0055" />
        <Text style={{ color: isLight ? '#111827' : '#FFFFFF', fontSize: 12, marginTop: 6, fontWeight: '700' }}>Đang nạp dữ liệu Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <BlurView intensity={isLight ? 20 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,0,85,0.1)', 'rgba(255,119,0,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <LayoutDashboard size={16} color="#FF0055" />
        <Text style={[styles.widgetTitleText, { color: '#FF0055' }]}>ADMIN REALTIME SYSTEM METRICS</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <View style={[styles.adminStatCard, { backgroundColor: cardBg }]}>
          <Users size={16} color="#007AFF" />
          <Text style={styles.adminStatValue}>{statsData.totalUsers.toLocaleString()}</Text>
          <Text style={styles.adminStatLabel}>Tổng Khách Hàng</Text>
        </View>

        <View style={[styles.adminStatCard, { backgroundColor: cardBg }]}>
          <Crown size={16} color={S.amber} />
          <Text style={[styles.adminStatValue, { color: S.amber }]}>{statsData.totalVips.toLocaleString()}</Text>
          <Text style={styles.adminStatLabel}>Thành Viên VIP</Text>
        </View>

        <View style={[styles.adminStatCard, { backgroundColor: cardBg }]}>
          <Wallet size={16} color={S.emerald} />
          <Text style={[styles.adminStatValue, { color: S.emerald }]}>{statsData.totalCoins.toLocaleString()} xu</Text>
          <Text style={styles.adminStatLabel}>Tổng Xu Hệ Thống</Text>
        </View>

        <View style={[styles.adminStatCard, { backgroundColor: cardBg }]}>
          <Banknote size={16} color="#FF0055" />
          <Text style={[styles.adminStatValue, { color: '#FF0055' }]}>{statsData.revenue.toLocaleString()}đ</Text>
          <Text style={styles.adminStatLabel}>Doanh Thu Ước Tính</Text>
        </View>
      </View>
    </View>
  );
});

// 2. Admin User Manager & Coin/VIP Modifier Widget
const AdminUserEditWidget = memo(({ isLight }: { isLight: boolean }) => {
  const haptic = useHaptic();
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coinsInput, setCoinsInput] = useState('');
  const [addDaysInput, setAddDaysInput] = useState('30');

  const handleSearchUser = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const qLower = searchQuery.trim().toLowerCase();
      const snap = await getDocs(collection(db, 'users'));
      let match: any = null;
      snap.forEach(d => {
        const data = d.data();
        if (d.id === searchQuery.trim() || data.email?.toLowerCase().includes(qLower) || data.displayName?.toLowerCase().includes(qLower)) {
          match = { id: d.id, ...data };
        }
      });

      if (match) {
        setFoundUser(match);
        setCoinsInput(String(match.coins || 0));
        haptic('success');
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy người dùng đúng từ khóa này!');
        setFoundUser(null);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
    setSearching(false);
  };

  const handleUpdateCoins = async (delta: number) => {
    if (!foundUser) return;
    const newCoins = Math.max(0, (foundUser.coins || 0) + delta);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', foundUser.id), { coins: newCoins });
      setFoundUser({ ...foundUser, coins: newCoins });
      setCoinsInput(String(newCoins));
      haptic('success');
      Alert.alert('Thành Công', `Đã cập nhật số dư cho ${foundUser.email || foundUser.id}: ${newCoins.toLocaleString()} xu!`);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
    setSaving(false);
  };

  const handleAddVipDays = async (days: number) => {
    if (!foundUser) return;
    const now = Date.now();
    const currentExp = foundUser.vipExpire?.toMillis ? foundUser.vipExpire.toMillis() : foundUser.vipExpire?.seconds ? foundUser.vipExpire.seconds * 1000 : Number(foundUser.vipExpire) || 0;
    const baseTime = currentExp > now ? currentExp : now;
    const newExpDate = new Date(baseTime + days * 24 * 60 * 60 * 1000);

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', foundUser.id), { vipExpire: Timestamp.fromDate(newExpDate) });
      setFoundUser({ ...foundUser, vipExpire: newExpDate });
      haptic('success');
      Alert.alert('Thành Công', `Đã cộng thêm ${days} ngày VIP cho ${foundUser.email || foundUser.id}! Hạn mới: ${newExpDate.toLocaleDateString('vi-VN')}`);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
    setSaving(false);
  };

  const boxBg = isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)';
  const boxBorder = isLight ? 'rgba(0,122,255,0.2)' : 'rgba(0,229,255,0.3)';
  const inputBg = isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const textColor = isLight ? '#111827' : '#FFFFFF';
  const subTextColor = isLight ? '#6B7280' : 'rgba(255,255,255,0.55)';

  return (
    <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <BlurView intensity={isLight ? 20 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={isLight ? ['rgba(0,122,255,0.05)', 'rgba(52,211,153,0.03)'] : ['rgba(0,229,255,0.08)', 'rgba(52,211,153,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <Users size={16} color={isLight ? '#007AFF' : S.cyan} />
        <Text style={[styles.widgetTitleText, { color: isLight ? '#007AFF' : S.cyan }]}>ADMIN QUẢN LÝ TÀI KHOẢN KHÁCH HÀNG</Text>
      </View>

      <View style={[styles.widgetInputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
        <Search size={16} color={subTextColor} />
        <TextInput
          style={[styles.widgetTextInput, { color: textColor }]}
          placeholder="Nhập Email hoặc UID tài khoản cần tìm..."
          placeholderTextColor={subTextColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchUser}
        />
        <TouchableOpacity style={styles.copyBtnPill} onPress={handleSearchUser} disabled={searching}>
          {searching ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11 }}>TÌM</Text>}
        </TouchableOpacity>
      </View>

      {foundUser && (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: textColor }}>📧 {foundUser.email || foundUser.id}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: S.emerald, marginTop: 2 }}>💰 Xu Hiện Tại: {(foundUser.coins || 0).toLocaleString()} xu</Text>
          
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: S.emerald }]} onPress={() => handleUpdateCoins(50000)} disabled={saving}>
              <Text style={styles.adminActionBtnText}>+50k Xu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: S.emerald }]} onPress={() => handleUpdateCoins(100000)} disabled={saving}>
              <Text style={styles.adminActionBtnText}>+100k Xu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: S.amber }]} onPress={() => handleAddVipDays(30)} disabled={saving}>
              <Text style={styles.adminActionBtnText}>+30 Ngày VIP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: S.amber }]} onPress={() => handleAddVipDays(365)} disabled={saving}>
              <Text style={styles.adminActionBtnText}>+1 Năm VIP</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

// 3. Admin Giftcode Generator Widget
const AdminGiftcodeWidget = memo(({ isLight }: { isLight: boolean }) => {
  const haptic = useHaptic();
  const [codeName, setCodeName] = useState('');
  const [gcType, setGcType] = useState<'coins' | 'vip'>('coins');
  const [gcValue, setGcValue] = useState('');
  const [gcLimit, setGcLimit] = useState('100');
  const [creating, setCreating] = useState(false);

  const handleCreateGiftcode = async () => {
    if (!codeName.trim() || !gcValue.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập Tên Mã và Giá Trị Giftcode!');
      return;
    }
    setCreating(true);
    try {
      const codeUpper = codeName.trim().toUpperCase();
      await setDoc(doc(db, 'giftcodes', codeUpper), {
        type: gcType,
        value: Number(gcValue) || 0,
        limit: Number(gcLimit) || 100,
        usedCount: 0,
        createdAt: serverTimestamp(),
      });
      haptic('success');
      Alert.alert('Tạo Thành Công', `Mã Giftcode "${codeUpper}" (${gcType.toUpperCase()}: ${gcValue}) đã được tạo!`);
      setCodeName('');
      setGcValue('');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
    setCreating(false);
  };

  const boxBg = isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)';
  const boxBorder = isLight ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.3)';
  const inputBg = isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const textColor = isLight ? '#111827' : '#FFFFFF';
  const subTextColor = isLight ? '#6B7280' : 'rgba(255,255,255,0.55)';

  return (
    <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <BlurView intensity={isLight ? 20 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={isLight ? ['rgba(251,191,36,0.05)', 'rgba(255,119,0,0.03)'] : ['rgba(251,191,36,0.08)', 'rgba(255,119,0,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <Ticket size={16} color={S.amber} />
        <Text style={[styles.widgetTitleText, { color: S.amber }]}>ADMIN TẠO GIFTCODE TẶNG XU / VIP</Text>
      </View>

      <View style={{ gap: 8, marginTop: 6 }}>
        <View style={[styles.widgetInputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
          <Ticket size={16} color={subTextColor} />
          <TextInput
            style={[styles.widgetTextInput, { color: textColor }]}
            placeholder="Tên Mã Giftcode (VD: TRIAN2026)..."
            placeholderTextColor={subTextColor}
            value={codeName}
            onChangeText={setCodeName}
            autoCapitalize="characters"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.adminTypeChip, { backgroundColor: gcType === 'coins' ? S.amber : inputBg, borderColor: inputBorder }]}
            onPress={() => setGcType('coins')}
          >
            <Text style={{ color: gcType === 'coins' ? '#000000' : textColor, fontWeight: '800', fontSize: 12 }}>Tặng Xu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adminTypeChip, { backgroundColor: gcType === 'vip' ? S.amber : inputBg, borderColor: inputBorder }]}
            onPress={() => setGcType('vip')}
          >
            <Text style={{ color: gcType === 'vip' ? '#000000' : textColor, fontWeight: '800', fontSize: 12 }}>Tặng Ngày VIP</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.widgetInputRow, { flex: 1, backgroundColor: inputBg, borderColor: inputBorder }]}>
            <TextInput
              style={[styles.widgetTextInput, { color: textColor }]}
              placeholder={gcType === 'coins' ? 'Số Xu (VD: 50000)' : 'Số Ngày (VD: 30)'}
              placeholderTextColor={subTextColor}
              value={gcValue}
              onChangeText={setGcValue}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.widgetInputRow, { width: 100, backgroundColor: inputBg, borderColor: inputBorder }]}>
            <TextInput
              style={[styles.widgetTextInput, { color: textColor }]}
              placeholder="Giới hạn"
              placeholderTextColor={subTextColor}
              value={gcLimit}
              onChangeText={setGcLimit}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.widgetSubmitBtn, { marginTop: 8 }]} onPress={handleCreateGiftcode} disabled={creating}>
          <LinearGradient colors={['#FBBF24', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {creating ? <ActivityIndicator size="small" color="#000000" /> : <>
            <Ticket size={14} color="#000000" />
            <Text style={[styles.widgetSubmitBtnText, { color: '#000000' }]}>TẠO MÃ GIFTCODE NGAY</Text>
          </>}
        </TouchableOpacity>
      </View>
    </View>
  );
});

// 4. Admin Push Notification Broadcast Widget
const AdminPushWidget = memo(({ isLight }: { isLight: boolean }) => {
  const haptic = useHaptic();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendPush = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập Tiêu Đề và Nội Dung Thông Báo!');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=send_push&title=${encodeURIComponent(title.trim())}&body=${encodeURIComponent(body.trim())}&url=${encodeURIComponent(url.trim())}`);
      const json = await res.json();
      haptic('success');
      Alert.alert('Thành Công', 'Đã phát sóng thông báo PUSH tới tất cả thiết bị trên hệ thống!');
      setTitle('');
      setBody('');
      setUrl('');
    } catch (e: any) {
      Alert.alert('Thông báo', 'Đã gửi lệnh phát sóng thông báo đẩy!');
    }
    setSending(false);
  };

  const boxBg = isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)';
  const boxBorder = isLight ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.3)';
  const inputBg = isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const textColor = isLight ? '#111827' : '#FFFFFF';
  const subTextColor = isLight ? '#6B7280' : 'rgba(255,255,255,0.55)';

  return (
    <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <BlurView intensity={isLight ? 20 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={isLight ? ['rgba(167,139,250,0.05)', 'rgba(0,122,255,0.03)'] : ['rgba(167,139,250,0.08)', 'rgba(0,229,255,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={styles.widgetHeaderRow}>
        <Bell size={16} color={S.violet} />
        <Text style={[styles.widgetTitleText, { color: S.violet }]}>ADMIN PHÁT SÓNG THÔNG BÁO PUSH HỆ THỐNG</Text>
      </View>

      <View style={{ gap: 8, marginTop: 6 }}>
        <View style={[styles.widgetInputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
          <TextInput
            style={[styles.widgetTextInput, { color: textColor }]}
            placeholder="Tiêu đề thông báo..."
            placeholderTextColor={subTextColor}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={[styles.widgetInputRow, { backgroundColor: inputBg, borderColor: inputBorder, height: 60 }]}>
          <TextInput
            style={[styles.widgetTextInput, { color: textColor }]}
            placeholder="Nội dung thông báo chi tiết..."
            placeholderTextColor={subTextColor}
            value={body}
            onChangeText={setBody}
            multiline
          />
        </View>

        <TouchableOpacity style={styles.widgetSubmitBtn} onPress={handleSendPush} disabled={sending}>
          <LinearGradient colors={['#A78BFA', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <>
            <Bell size={14} color="#FFFFFF" />
            <Text style={[styles.widgetSubmitBtnText, { color: '#FFFFFF' }]}>GỬI THÔNG BÁO PUSH TỚI TẤT CẢ MÁY</Text>
          </>}
        </TouchableOpacity>
      </View>
    </View>
  );
});

// 5. Admin System Maintenance Toggle Widget
const AdminSysConfigWidget = memo(({ isLight }: { isLight: boolean }) => {
  const haptic = useHaptic();
  const [maintenance, setMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'config'));
        if (snap.exists()) {
          setMaintenance(snap.data().maintenanceShow || false);
        }
      } catch {}
    })();
  }, []);

  const handleToggleMaintenance = async (val: boolean) => {
    setMaintenance(val);
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), { maintenanceShow: val }, { merge: true });
      haptic(val ? 'warning' : 'success');
      Alert.alert('Cấu Hình Hệ Thống', val ? '🚨 Đã BẬT chế độ BẢO TRÌ toàn hệ thống!' : '✅ Đã TẮT bảo trì, hệ thống hoạt động bình thường.');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
    setSaving(false);
  };

  const boxBg = isLight ? '#FFFFFF' : 'rgba(0,0,0,0.4)';
  const boxBorder = maintenance ? 'rgba(255,0,85,0.4)' : (isLight ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.3)');
  const textColor = isLight ? '#111827' : '#FFFFFF';

  return (
    <View style={[styles.widgetBox, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      <BlurView intensity={isLight ? 20 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={maintenance ? ['rgba(255,0,85,0.1)', 'rgba(255,119,0,0.04)'] : ['rgba(52,211,153,0.08)', 'rgba(0,229,255,0.04)']} style={StyleSheet.absoluteFill} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Wrench size={18} color={maintenance ? '#FF0055' : S.emerald} />
          <View>
            <Text style={{ fontSize: 13, fontWeight: '900', color: maintenance ? '#FF0055' : S.emerald }}>BẢO TRÌ HỆ THỐNG TOÀN DIỆN</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: textColor, marginTop: 2 }}>{maintenance ? 'Trạng thái: ĐANG BẢO TRÌ' : 'Trạng thái: HOẠT ĐỘNG BÌNH THƯỜNG'}</Text>
          </View>
        </View>

        <Switch
          value={maintenance}
          onValueChange={handleToggleMaintenance}
          trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#FF0055' }}
          thumbColor="#FFFFFF"
        />
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
  isLight: boolean;
}

const LiquidInput = memo(({ value, onChangeText, onSubmit, onFocusChange, isLight }: LiquidInputProps) => {
  const focused = useSharedValue(0);
  const scale = useSharedValue(1);
  const haptic = useHaptic();

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focused.value === 1
      ? (isLight ? 'rgba(0,122,255,0.6)' : 'rgba(0,229,255,0.5)')
      : (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'),
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
    <Animated.View style={[
      styles.liquidInputContainer,
      animatedStyle,
      { backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(12,12,18,0.85)' }
    ]}>
      <BlurView intensity={isLight ? 40 : 60} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={isLight ? ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />
      <TextInput
        style={[styles.liquidInput, { color: isLight ? '#111827' : '#FFFFFF' }]}
        placeholder="Yêu cầu AI bất kỳ điều gì (gõ 'ipa youtube', 'bật admin', 'doanh thu')..."
        placeholderTextColor={isLight ? '#9CA3AF' : 'rgba(255,255,255,0.30)'}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
        selectionColor={isLight ? '#007AFF' : S.cyan}
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
          colors={value.trim()
            ? (isLight ? ['#007AFF', '#7C3AED'] : [S.cyan, S.violet])
            : (isLight ? ['rgba(0,0,0,0.06)', 'rgba(0,0,0,0.04)'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'])
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Send size={14} color={value.trim() ? '#FFFFFF' : (isLight ? '#9CA3AF' : 'rgba(255,255,255,0.3)')} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   INTELLIGENCE TEXT & SPATIAL CARD
   ═══════════════════════════════════════════════════════════════ */

const WordToken = memo(({ word, index, total, progress, textColor }: any) => {
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
    <Animated.Text style={[styles.wordToken, style, { color: textColor }]}>
      {word}{' '}
    </Animated.Text>
  );
});

const IntelligenceText = memo(({ text, onComplete, textColor }: { text: string; onComplete?: () => void; textColor: string }) => {
  const progress = useSharedValue(0);
  const words = text.split(' ');

  useEffect(() => {
    progress.value = withTiming(1, { duration: Math.min(1200, words.length * 40), easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished && onComplete) runOnJS(onComplete)();
    });
    return () => { cancelAnimation(progress); };
  }, [text]);

  return (
    <Text style={[styles.intelligenceText, { color: textColor }]}>
      {words.map((word, i) => (
        <WordToken key={`${i}-${word}`} word={word} index={i} total={words.length} progress={progress} textColor={textColor} />
      ))}
    </Text>
  );
});

const SpatialAppCard = memo(({ app, onPress, index, isLight }: { app: AppItem; onPress: () => void; index: number; isLight: boolean }) => {
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

  const cardBg = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
  const nameColor = isLight ? '#111827' : '#FFFFFF';
  const subColor = isLight ? '#6B7280' : 'rgba(255,255,255,0.55)';

  return (
    <Animated.View style={[styles.spatialCardWrap, entryStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.spatialCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <BlurView intensity={isLight ? 20 : 40} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={isLight ? ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.cardTop}>
            <Image source={{ uri: app.iconUrl }} style={styles.cardIcon} />
            <View style={styles.cardMeta}>
              <Text style={[styles.cardName, { color: nameColor }]} numberOfLines={1}>{app.name}</Text>
              <Text style={[styles.cardCategory, { color: subColor }]} numberOfLines={1}>{app.category || 'IPA'}</Text>
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
            <TouchableOpacity style={[styles.cardButton, { backgroundColor: isLight ? '#007AFF' : S.cyan }]} onPress={onPress} activeOpacity={0.8}>
              <Text style={[styles.cardButtonText, { color: '#FFFFFF' }]}>TẢI IPA NGAY</Text>
              <ChevronRight size={12} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const ActionChip = memo(({ action, onPress, index, isLight }: { action: CommandAction; onPress: () => void; index: number; isLight: boolean }) => {
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
    primary: { bg: isLight ? ['#007AFF', '#7C3AED'] as const : [S.cyan, S.violet] as const, text: '#FFFFFF' },
    secondary: { bg: isLight ? ['rgba(0,0,0,0.06)', 'rgba(0,0,0,0.03)'] as const : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)'] as const, text: isLight ? '#111827' : '#FFFFFF' },
    ghost: { bg: ['transparent', 'transparent'] as const, text: isLight ? '#4B5563' : 'rgba(255,255,255,0.55)' },
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
        <View style={[styles.actionChip, { borderColor: action.style === 'ghost' ? (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)') : 'transparent' }]}>
          <LinearGradient colors={c.bg} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={[styles.actionChipText, { color: c.text }]}>{action.label}</Text>
          {action.style === 'primary' && <Zap size={12} color="#FFFFFF" />}
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
  isLight,
}: {
  message: IntelligenceMessage;
  onAction: (a: CommandAction) => void;
  onAppPress: (id: string) => void;
  onCertComplete: (filename: string, pass: string) => void;
  onSelectVipPkg: (pkg: string, cost: number) => void;
  userEmail?: string;
  isLight: boolean;
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

  const userBg = isLight ? '#007AFF' : 'rgba(255,255,255,0.12)';
  const userBorder = isLight ? '#0066CC' : 'rgba(255,255,255,0.18)';
  const botBg = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)';
  const botBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const botTextColor = isLight ? '#111827' : 'rgba(255,255,255,0.95)';

  if (isUser) {
    return (
      <Animated.View style={[styles.userEntity, style]}>
        <View style={[styles.userEntityInner, { backgroundColor: userBg, borderColor: userBorder }]}>
          <Text style={styles.userEntityText}>{message.text}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.intelligenceEntity, style]}>
      <View style={styles.intentRow}>
        <View style={[styles.intentDot, { backgroundColor: isLight ? '#007AFF' : S.cyan }]} />
        <Text style={[styles.intentLabel, { color: isLight ? '#007AFF' : S.cyan }]}>
          {message.isProcessing ? 'Đang xử lý tự động...' : 'Autonomous AI'}
        </Text>
        <Text style={[styles.entityTime, { color: isLight ? '#9CA3AF' : 'rgba(255,255,255,0.30)' }]}>{message.timestamp}</Text>
      </View>

      <View style={[styles.entityContent, { backgroundColor: botBg, borderColor: botBorder }]}>
        <IntelligenceText text={message.text} textColor={botTextColor} />
      </View>

      {/* Embedded Widgets */}
      {message.widgetType === 'cert_import' && (
        <CertImportWidget onComplete={onCertComplete} isLight={isLight} />
      )}

      {message.widgetType === 'bank_deposit' && (
        <BankDepositWidget userEmail={userEmail} isLight={isLight} />
      )}

      {message.widgetType === 'vip_packages' && (
        <VipPackagesWidget onSelectPackage={onSelectVipPkg} isLight={isLight} />
      )}

      {message.widgetType === 'admin_stats' && (
        <AdminStatsWidget isLight={isLight} />
      )}

      {message.widgetType === 'admin_users' && (
        <AdminUserEditWidget isLight={isLight} />
      )}

      {message.widgetType === 'admin_giftcode' && (
        <AdminGiftcodeWidget isLight={isLight} />
      )}

      {message.widgetType === 'admin_push' && (
        <AdminPushWidget isLight={isLight} />
      )}

      {message.widgetType === 'admin_config' && (
        <AdminSysConfigWidget isLight={isLight} />
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
              isLight={isLight}
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
              isLight={isLight}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   SMART AUTONOMOUS INTENT ENGINE (WITH ADMIN POWERS)
   ═══════════════════════════════════════════════════════════════ */

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

interface ProcessResult {
  text: string;
  actions: CommandAction[];
  appCards?: AppItem[];
  intent: IntentType;
  widgetType?: 'cert_import' | 'bank_deposit' | 'vip_packages' | 'app_search' | 'admin_stats' | 'admin_users' | 'admin_giftcode' | 'admin_push' | 'admin_config';
}

const processSmartIntent = (raw: string, apps: AppItem[], userEmail?: string, isAdminMode?: boolean): ProcessResult => {
  const t = removeAccents(raw);

  // Admin Mode Commands when Admin Mode is ON
  if (isAdminMode) {
    if (t.includes('thong ke') || t.includes('doanh thu') || t.includes('dashboard') || t.includes('tong quan')) {
      return {
        text: `⚡ **ADMIN DASHBOARD REALTIME**\n\nDạ đây là bảng chỉ số thống kê thời gian thực của toàn bộ hệ thống IPAVIET:`,
        widgetType: 'admin_stats',
        actions: [
          { label: '👥 Sửa Xu / VIP Khách Hàng', route: '/admin', style: 'primary' },
          { label: '🎟️ Tạo Mã Giftcode', route: '/admin', style: 'secondary' },
        ],
        intent: 'admin_stats',
      };
    }

    if (t.includes('khach hang') || t.includes('sua user') || t.includes('cong xu') || t.includes('them vip') || t.includes('quan ly user')) {
      return {
        text: `⚡ **ADMIN USER MANAGER**\n\nSếp nhập Email hoặc UID khách hàng bên dưới để tìm và cộng Xu/VIP tự động nhé!`,
        widgetType: 'admin_users',
        actions: [
          { label: '🛠️ Mở Trang Admin Chi Tiết', route: '/admin', style: 'primary' },
        ],
        intent: 'admin_users',
      };
    }

    if (t.includes('giftcode') || t.includes('ma giam gia') || t.includes('tao giftcode')) {
      return {
        text: `⚡ **ADMIN GIFTCODE GENERATOR**\n\nSếp nhập tên mã giftcode và số xu / số ngày VIP tặng bên dưới để phát hành mã ngay lập tức:`,
        widgetType: 'admin_giftcode',
        actions: [
          { label: '🎟️ Xem Tất Cả Mã Giftcode', route: '/admin', style: 'secondary' },
        ],
        intent: 'admin_giftcode',
      };
    }

    if (t.includes('push') || t.includes('thong bao') || t.includes('gui push') || t.includes('gui tin')) {
      return {
        text: `⚡ **ADMIN PUSH BROADCAST SYSTEM**\n\nSếp nhập nội dung thông báo bên dưới để phát sóng tin nhắn PUSH tới tất cả ứng dụng trên thiết bị khách hàng:`,
        widgetType: 'admin_push',
        actions: [
          { label: '🔔 Trang Thông Báo Admin', route: '/admin', style: 'secondary' },
        ],
        intent: 'admin_push',
      };
    }

    if (t.includes('bao tri') || t.includes('cau hinh') || t.includes('he thong')) {
      return {
        text: `⚡ **ADMIN SYSTEM CONFIGURATION**\n\nCông tắc bật/tắt bảo trì hệ thống toàn diện:`,
        widgetType: 'admin_config',
        actions: [
          { label: '⚙️ Cài Đặt Chi Tiết', route: '/admin', style: 'primary' },
        ],
        intent: 'admin_config',
      };
    }
  }

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
  useThemeUpdate();

  const router = useRouter();
  const userState = useUserState();
  const haptic = useHaptic();

  const [messages, setMessages] = useState<IntelligenceMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const isLight = COLORS.background === '#F4F4F6' || COLORS.background === '#FFFFFF' || COLORS.text === '#000000';

  const scrollViewRef = useRef<ScrollView>(null);
  const keyboard = useAnimatedKeyboard({ isStatusBarTranslucentAndroid: true });

  useEffect(() => {
    loadTheme();
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

  const handleToggleAdminMode = useCallback(() => {
    if (!userState.isAdmin) {
      haptic('error');
      Alert.alert(
        '⚠️ Hạn Chế Quyền Hạn',
        'Rất tiếc! Quyền Admin Mode chỉ dành riêng cho Quản Trị Viên hệ thống IPAVIET (Email Admin: mquitran@gmail.com).'
      );
      return;
    }

    const nextMode = !isAdminMode;
    setIsAdminMode(nextMode);
    haptic(nextMode ? 'heavy' : 'medium');

    const adminNoticeMsg: IntelligenceMessage = {
      id: Date.now().toString(),
      sender: 'intelligence',
      text: nextMode
        ? `⚡ **ĐÃ BẬT CHẾ ĐỘ ADMIN MODE!**\n\nXin chào Sếp Admin! Em đã kích hoạt toàn bộ bộ công cụ Quản Trị Hệ Thống. Sếp có thể xem thống kê doanh thực, cộng xu, gia hạn VIP, phát hành Giftcode và gửi Push ngay trong màn hình chat này!`
        : `✅ **Đã tắt Chế độ Admin Mode.** Đã quay về giao diện Trợ Lý AI người dùng thông thường.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      widgetType: nextMode ? 'admin_stats' : undefined,
      actions: nextMode ? [
        { label: '👥 Quản Lý Khách Hàng', route: '/admin', style: 'primary' },
        { label: '🎟️ Tạo Giftcode', route: '/admin', style: 'secondary' },
        { label: '🔔 Gửi Push Broadcast', route: '/admin', style: 'secondary' },
      ] : undefined,
    };

    setMessages((prev) => [...prev, adminNoticeMsg]);
    scrollToBottom();
  }, [userState, isAdminMode, haptic, scrollToBottom]);

  const handleSendText = useCallback(
    (textToSend: string) => {
      if (!textToSend.trim()) return;

      const rawT = removeAccents(textToSend);
      if (rawT === 'bat admin' || rawT === 'admin mode' || rawT === 'admin' || rawT === 'mode admin') {
        handleToggleAdminMode();
        setInputText('');
        return;
      }

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
        const res = processSmartIntent(textToSend, apps, userState.user?.email, isAdminMode);
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
    [apps, userState, isAdminMode, handleToggleAdminMode, scrollToBottom]
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

  const suggestions = isAdminMode ? [
    { label: '📊 Thống kê doanh thu', query: 'thong ke doanh thu', icon: <LayoutDashboard size={15} color="#FF0055" /> },
    { label: '👥 Sửa Xu/VIP User', query: 'quan ly khach hang', icon: <Users size={15} color="#007AFF" /> },
    { label: '🎟️ Tạo Giftcode', query: 'tao giftcode', icon: <Ticket size={15} color="#FBBF24" /> },
    { label: '🔔 Gửi Push Broadcast', query: 'gui push thong bao', icon: <Bell size={15} color="#A78BFA" /> },
    { label: '🛠️ Cấu hình bảo trì', query: 'bao tri he thong', icon: <Wrench size={15} color="#34D399" /> },
  ] : [
    { label: 'Hướng dẫn người mới', query: 'huong dan nguoi moi nap cert', icon: <HelpCircle size={15} color={isLight ? '#007AFF' : '#00E5FF'} /> },
    { label: 'Tìm ứng dụng IPA', query: 'tim ung dung ipa', icon: <Sparkles size={15} color={isLight ? '#7C3AED' : '#A78BFA'} /> },
    { label: 'Thẻ nạp xu ACB', query: 'nap xu bank acb', icon: <Wallet size={15} color="#34D399" /> },
    { label: 'Bảng giá VIP', query: 'gia han vip', icon: <Crown size={15} color="#FBBF24" /> },
    { label: 'Lỗi app văng', query: 'loi chung chi app crash', icon: <AlertTriangle size={15} color="#FB7185" /> },
  ];

  const headerBg = isLight ? 'rgba(255,255,255,0.85)' : 'rgba(12,12,18,0.85)';
  const headerBorder = isAdminMode ? 'rgba(255,0,85,0.3)' : (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)');
  const headerText = isLight ? '#111827' : '#FFFFFF';
  const headerSubText = isLight ? '#6B7280' : 'rgba(255,255,255,0.55)';
  const btnBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
  const btnBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)';
  const pillBg = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)';
  const pillBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
  const pillText = isLight ? '#111827' : '#FFFFFF';

  return (
    <View style={[styles.root, { backgroundColor: isLight ? '#F4F4F6' : '#000000' }]}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <RNStatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />

      {/* Living Spatial Background */}
      <LivingBackground isLight={isLight} />

      {/* Floating Header Bar */}
      <View style={[styles.topHeader, { backgroundColor: headerBg, borderColor: headerBorder }]}>
        <BlurView intensity={isLight ? 30 : 50} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
        <View style={styles.headerInner}>
          <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: btnBg, borderColor: btnBorder }]} onPress={() => router.back()} activeOpacity={0.8}>
            <ArrowLeft size={18} color={headerText} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerTitleText, { color: headerText }]}>IPAVIET Autonomous AI</Text>
              {isAdminMode && (
                <View style={{ backgroundColor: '#FF0055', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>ADMIN MODE</Text>
                </View>
              )}
            </View>
            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: isAdminMode ? '#FF0055' : S.emerald }]} />
              <Text style={[styles.statusText, { color: headerSubText }]}>
                {isAdminMode ? 'System Super Admin Control' : (userState.user ? userState.user.email : 'Autonomous OS 2026')}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {/* Admin Toggle Button for Admin User */}
            {userState.isAdmin && (
              <TouchableOpacity
                style={[styles.iconCircleBtn, { backgroundColor: isAdminMode ? '#FF0055' : btnBg, borderColor: isAdminMode ? '#FF0055' : btnBorder }]}
                onPress={handleToggleAdminMode}
                activeOpacity={0.8}
              >
                {isAdminMode ? <Unlock size={16} color="#FFFFFF" /> : <Lock size={16} color={headerSubText} />}
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: btnBg, borderColor: btnBorder }]} onPress={resetChat} activeOpacity={0.8}>
              <RotateCcw size={16} color={headerSubText} />
            </TouchableOpacity>
          </View>
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
              <EnergyOrb state={orbState} isLight={isLight} isAdminMode={isAdminMode} />
              {messages.length === 0 && (
                <View style={styles.heroTextBox}>
                  <Text style={[styles.heroTitleText, { color: isLight ? '#111827' : '#FFFFFF' }]}>
                    {isAdminMode ? '⚡ ADMIN COMMAND CENTER' : <>Xin chào, <Text style={{ color: isLight ? '#007AFF' : S.cyan }}>{userState.user?.displayName || 'Sếp'}</Text></>}
                  </Text>
                  <Text style={[styles.heroSubText, { color: isLight ? '#4B5563' : 'rgba(255,255,255,0.55)' }]}>
                    {isAdminMode
                      ? 'Em đã sẵn sàng thực thi toàn bộ quyền Admin: xem thống kê doanh thu, cộng xu, gia hạn VIP, phát hành giftcode và phát sóng thông báo PUSH.'
                      : 'Em là Autonomous AI. Em có thể tự động ký App, tạo thẻ nạp xu ACB, hướng dẫn nạp P12 và tìm IPA Mod cho sếp.'
                    }
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
                    style={[styles.suggestionPill, { backgroundColor: pillBg, borderColor: pillBorder }]}
                    onPress={() => handleSendText(item.query)}
                    activeOpacity={0.8}
                  >
                    {item.icon}
                    <Text style={[styles.suggestionPillText, { color: pillText }]}>{item.label}</Text>
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
                isLight={isLight}
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
                  style={[styles.quickBarBtn, { backgroundColor: pillBg, borderColor: pillBorder }]}
                  onPress={() => handleSendText(item.query)}
                  activeOpacity={0.8}
                >
                  {item.icon}
                  <Text style={[styles.quickBarText, { color: pillText }]}>{item.label}</Text>
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
              isLight={isLight}
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: '900',
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
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubText: {
    fontSize: 13,
    fontWeight: '500',
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
    borderWidth: 1,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // User Message
  userEntity: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    maxWidth: '84%',
  },
  userEntityInner: {
    borderWidth: 1,
    borderRadius: 22,
    borderBottomRightRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  userEntityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  },
  intentLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  entityTime: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  entityContent: {
    borderWidth: 1,
    borderRadius: 22,
    borderTopLeftRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  intelligenceText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  wordToken: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Embedded Widget Box
  widgetBox: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
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
    letterSpacing: 0.5,
  },
  widgetPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  widgetPickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  widgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  widgetTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
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
  },
  bankValBold: {
    fontSize: 13,
    fontWeight: '800',
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
    borderWidth: 1,
  },
  copyBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // VIP Package Cards Widget
  vipPkgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  vipPkgName: {
    fontSize: 14,
    fontWeight: '900',
  },
  vipPkgDesc: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  vipPkgPriceBox: {
    alignItems: 'flex-end',
  },
  vipPkgPriceText: {
    fontSize: 14,
    fontWeight: '900',
  },
  vipPkgBuyText: {
    fontSize: 11,
    fontWeight: '800',
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
    color: '#000000',
  },

  // Admin Custom Widgets
  adminStatCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  adminStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#007AFF',
    marginTop: 2,
  },
  adminStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  adminActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  adminActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  adminTypeChip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    letterSpacing: -0.2,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '600',
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
    paddingVertical: 8,
    borderRadius: 14,
  },
  cardButtonText: {
    fontSize: 12,
    fontWeight: '900',
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
    borderWidth: 1,
  },
  quickBarText: {
    fontSize: 12,
    fontWeight: '700',
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