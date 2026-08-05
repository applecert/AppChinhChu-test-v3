import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar as RNStatusBar,
  Alert,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  Crown,
  Wallet,
  Wrench,
  HelpCircle,
  MessageSquare,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Download,
  ExternalLink,
  Flame,
  Zap,
} from 'lucide-react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { COLORS, useThemeUpdate, TXT } from '../constants/theme';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../constants/data';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BANK_ID = 'ACB';
const ACCOUNT_NO = '22703611';
const ACCOUNT_NAME = 'TRAN NGUYEN MINH QUI';

interface ActionItem {
  label: string;
  route?: string;
  actionType?: string;
  payload?: any;
  styleType?: 'primary' | 'yellow' | 'danger';
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  actions?: ActionItem[];
  appCards?: AppItem[];
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
function removeAccents(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

// ── Animated Typing Indicator (3 bouncing dots) ──
const TypingIndicator = memo(({ isLight }: { isLight: boolean }) => {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  const dotColor = isLight ? '#0052FF' : '#00F0FF';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: dotColor,
            opacity: Animated.add(0.4, Animated.multiply(dot, 0.6)),
            transform: [
              {
                translateY: Animated.multiply(dot, -6),
              },
            ],
          }}
        />
      ))}
    </View>
  );
});

// ── Markdown-like Text Renderer ──
const MarkdownText = memo(({ text, color, isLight }: { text: string; color: string; isLight: boolean }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <Text style={{ color, fontSize: 14, lineHeight: 22, fontWeight: '500' }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontWeight: '900', color }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.includes('•')) {
          const bulletParts = part.split(/(•[^\n]*)/g);
          return (
            <Text key={i}>
              {bulletParts.map((bp, j) => {
                if (bp.startsWith('•')) {
                  return (
                    <Text key={j}>
                      <Text style={{ color: isLight ? '#0052FF' : '#00F0FF', fontWeight: '900' }}>• </Text>
                      <Text style={{ color, fontWeight: '500' }}>{bp.slice(1).trim()}</Text>
                    </Text>
                  );
                }
                return <Text key={j} style={{ color }}>{bp}</Text>;
              })}
            </Text>
          );
        }
        return <Text key={i} style={{ color }}>{part}</Text>;
      })}
    </Text>
  );
});

// ── Animated Message Bubble ──
const MessageBubble = memo(({ msg, isLight, styles, onActionPress, onAppPress }: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
    ]).start();
  }, []);

  const isUser = msg.sender === 'user';
  const textColor = isUser ? (isLight ? '#FFFFFF' : '#03040A') : (isLight ? '#1a1a2e' : '#E2E8F0');
  const timeColor = isUser
    ? (isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)')
    : (isLight ? '#94A3B8' : '#64748B');

  return (
    <Animated.View
      style={[
        styles.msgRow,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      {!isUser && (
        <View style={styles.msgAvatarBox}>
          <Bot size={14} color="#00F0FF" />
        </View>
      )}

      <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.botBubble]}>
        <MarkdownText text={msg.text} color={textColor} isLight={isLight} />

        {/* App Cards */}
        {msg.appCards && msg.appCards.length > 0 && (
          <View style={{ marginTop: 12, gap: 10 }}>
            {msg.appCards.map((appItem: AppItem) => (
              <TouchableOpacity
                key={appItem.id}
                style={styles.aiAppCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                  onAppPress(appItem.id);
                }}
                activeOpacity={0.85}
              >
                <Image source={{ uri: appItem.iconUrl }} style={styles.aiAppIcon} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.aiAppName} numberOfLines={1}>
                    {appItem.name}
                  </Text>
                  <Text style={styles.aiAppCat} numberOfLines={1}>
                    {appItem.category || 'IPA App'}
                  </Text>
                </View>
                <LinearGradient
                  colors={isLight ? ['#0052FF', '#3B82F6'] : ['#00F0FF', '#0EA5E9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.aiAppBtn, { borderRadius: 18 }]}
                >
                  <Download size={12} color={isLight ? '#FFF' : '#03040A'} />
                  <Text style={{ color: isLight ? '#FFF' : '#03040A', fontSize: 11, fontWeight: '900' }}>TẢI VỀ</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Chips */}
        {msg.actions && msg.actions.length > 0 && (
          <View style={styles.actionChipRow}>
            {msg.actions.map((act: ActionItem, i: number) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.actionChip,
                  act.styleType === 'primary' && styles.actionChipPrimary,
                  act.styleType === 'yellow' && styles.actionChipYellow,
                  act.styleType === 'danger' && styles.actionChipDanger,
                ]}
                onPress={() => onActionPress(act)}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionChipText, { color: act.styleType === 'primary' ? (isLight ? '#FFFFFF' : '#03040A') : '#FFFFFF' }]}>
                  {act.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.msgTime, { color: timeColor }]}>{msg.timestamp}</Text>
      </View>
    </Animated.View>
  );
});

// ── Suggestion Pill with Stagger ──
const SuggestionPill = memo(({ item, index, onPress, styles }: any) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: index * 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ scale: Animated.add(0.8, Animated.multiply(anim, 0.2)) }, { translateY: Animated.multiply(Animated.subtract(1, anim), 20) }],
      }}
    >
      <TouchableOpacity
        style={styles.suggestionPill}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
          onPress(item.query);
        }}
        activeOpacity={0.8}
      >
        {item.icon}
        <Text style={styles.suggestionPillText}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════ */
export default function AiSupportScreen() {
  useThemeUpdate();
  const router = useRouter();
  const isLight = COLORS.background === '#F4F4F6';
  const styles = getStyles(COLORS, isLight);

  const [user, setUser] = useState<any>(null);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [vipExpire, setVipExpire] = useState<string>('Đang kiểm tra...');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [appsData, setAppsData] = useState<AppItem[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const avatarPulse = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const inputGlow = useRef(new Animated.Value(0)).current;

  // Pulse + Glow animation for AI Avatar
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, { toValue: 1.08, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(avatarPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => {
      pulse.stop();
      glow.stop();
    };
  }, []);

  // Input focus glow
  useEffect(() => {
    Animated.timing(inputGlow, {
      toValue: isInputFocused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isInputFocused]);

  // Fetch apps data
  useEffect(() => {
    Promise.all([fetchRegularApps(), fetchVIPApps()]).then(([reg, vip]) => {
      setAppsData([...reg, ...vip]);
    });
  }, []);

  // Auth & real-time listener
  useEffect(() => {
    let unsubUserDoc: any;
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubUserDoc = onSnapshot(
          doc(db, 'users', currentUser.uid),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUserCoins(data.coins || 0);
              const exp = data.vipExpire;
              if (exp) {
                const ms = exp.toMillis ? exp.toMillis() : exp.seconds ? exp.seconds * 1000 : Number(exp) || 0;
                if (ms > Date.now()) {
                  setVipExpire(new Date(ms).toLocaleDateString('vi-VN'));
                } else {
                  setVipExpire('Hết hạn');
                }
              } else {
                setVipExpire('Chưa đăng ký');
              }
            }
          },
          (err) => console.warn('[AI Support] User doc error:', err)
        );
      } else {
        setUserCoins(0);
        setVipExpire('Chưa đăng nhập');
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const resetChat = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    setMessages([]);
  }, []);

  // Process Bot Response Logic
  const processQuery = useCallback(
    async (rawText: string) => {
      const text = removeAccents(rawText.trim());
      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const userMsg: Message = {
        id: Date.now().toString(),
        sender: 'user',
        text: rawText,
        timestamp: nowTime,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsThinking(true);
      scrollToBottom();

      await new Promise((r) => setTimeout(r, 800));

      let botText = '';
      let actions: Message['actions'] = [];
      let matchedApps: AppItem[] = [];

      if (text.includes('vip') || text.includes('gia han') || text.includes('mua goi') || text.includes('nang cap')) {
        botText = `👑 **Đặc Quyền VIP IPAVIET OS**\n\nKhi nâng cấp gói VIP, sếp sẽ nhận được các đặc quyền cao cấp:\n• Tải & cài đặt ứng dụng VIP tốc độ cao không giới hạn.\n• Ký App ngoại tuyến không bị dính thu hồi chứng chỉ.\n• Hỗ trợ ưu tiên 24/7 từ đội ngũ kỹ thuật.\n\nSếp chọn gói phù hợp bên dưới nhé!`;
        actions = [
          { label: '👑 NÂNG CẤP VIP NGAY', route: '/buy-vip', styleType: 'primary' },
          { label: '💳 NẠP TIỀN VÀO TÀI KHOẢN', route: '/account', styleType: 'yellow' },
        ];
      } else if (text.includes('ky app') || text.includes('vsign') || text.includes('cert') || text.includes('p12') || text.includes('provision') || text.includes('dylib') || text.includes('zip')) {
        botText = `🛠️ **Hướng Dẫn Ký IPA Ngoại Tuyến (VSign Pro)**\n\n1. **Chuẩn bị**: Nạp file chứng chỉ dạng tệp ZIP (chứa file P12 và MobileProvision) vào ứng dụng.\n2. **Chọn App**: Chọn tệp IPA sếp muốn ký từ bộ nhớ máy.\n3. **Chèn Dylib/Deb**: Sếp có thể bấm chèn thêm các tệp Hack/Tweak Dylib tùy chỉnh.\n4. **Bấm Ký App**: Quá trình ký diễn ra 100% ngoại tuyến trên thiết bị di động của sếp.`;
        actions = [
          { label: '🛠️ MỞ MÀN HÌNH KÝ APP', route: '/sign', styleType: 'primary' },
          { label: '📂 NẠP CHỨNG CHỈ ZIP', route: '/sign?importCert=true', styleType: 'yellow' },
        ];
      } else if (text.includes('nap') || text.includes('tien') || text.includes('xu') || text.includes('ngan hang') || text.includes('bank') || text.includes('chuyen khoan')) {
        const userEmail = auth.currentUser?.email || 'TaiKhoanCuaSep';
        botText = `💳 **Hướng Dẫn Nạp Xu Tự Động (ACB Bank)**\n\nSếp vui lòng chuyển khoản theo thông tin bên dưới, hệ thống sẽ cộng xu tự động sau 10 - 30 giây:\n\n• **Ngân hàng**: ACB (Á Châu)\n• **Số tài khoản**: \`${ACCOUNT_NO}\`\n• **Chủ tài khoản**: ${ACCOUNT_NAME}\n• **Nội dung chuyển khoản**: \`NAP ${userEmail}\`\n\n*(Lưu ý điền đúng cú pháp Email để xu tự động nạp nhé sếp!)*`;
        actions = [
          { label: '💳 ĐẾN TRANG NẠP TIỀN', route: '/account', styleType: 'primary' },
          { label: '💬 LIÊN HỆ ADMIN HỖ TRỢ', route: '/account', styleType: 'yellow' },
        ];
      } else if (text.includes('crash') || text.includes('loi') || text.includes('thu hoi') || text.includes('văng') || text.includes('vang') || text.includes('khong mo duoc')) {
        botText = `⚠️ **Khắc Phục Lỗi App Bị Crash / Thu Hồi Chứng Chỉ**\n\n• **Nguyên nhân**: Apple đã thu hồi chứng chỉ doanh nghiệp dùng chung.\n• **Cách xử lý**: \n  1. Sếp gỡ bản app bị văng ra khỏi máy.\n  2. Vào mục **Ký App** trên ứng dụng để ký lại bằng chứng chỉ cá nhân của sếp.\n  3. Hoặc nâng cấp **VIP IPAVIET** để dùng chứng chỉ riêng độc quyền chống thu hồi!`;
        actions = [
          { label: '👑 MUA CHỨNG CHỈ VIP', route: '/buy-vip', styleType: 'primary' },
          { label: '🛠️ TỰ KÝ LẠI APP', route: '/sign', styleType: 'yellow' },
        ];
      } else if (text.includes('ipa') || text.includes('game') || text.includes('hack') || text.includes('cheat') || text.includes('tim') || text.includes('app') || text.includes('youtube') || text.includes('facebook') || text.includes('tiktok')) {
        const queryClean = text.replace(/(tim|app|ipa|hack|cheat|can|muon|cho|xem)/g, '').trim();
        if (queryClean.length >= 2) {
          matchedApps = appsData.filter((a) =>
            removeAccents(a.name).includes(queryClean) || removeAccents(a.category || '').includes(queryClean)
          ).slice(0, 4);
        }

        if (matchedApps.length > 0) {
          botText = `🔍 **Tìm Thấy ${matchedApps.length} Ứng Dụng Phù Hợp Cho Sếp:**`;
        } else {
          botText = `📱 **Kho IPA Cao Cấp IPAVIET OS**\n\nHệ thống sở hữu hàng trăm ứng dụng iOS đã Mod/Cheat/Tweak sẵn. Sếp có thể tìm kiếm tên app tại Kho IPA hoặc yêu cầu Admin hỗ trợ nạp app mới!`;
        }
        actions = [
          { label: '📦 MỞ KHO IPA', route: '/apps', styleType: 'primary' },
          { label: '👑 MỞ KHO APP VIP', route: '/vip', styleType: 'yellow' },
        ];
      } else if (text.includes('mmo') || text.includes('spotify') || text.includes('netflix') || text.includes('chatgpt') || text.includes('tai khoan') || text.includes('cho mmo')) {
        botText = `🛒 **Tạp Hóa MMO — Tài Khoản Bán Tự Động**\n\nSếp có thể mua các gói tài khoản Premium chính chủ với giá siêu rẻ:\n• Spotify Premium 1 Năm (Chính chủ)\n• Netflix Premium 4K\n• ChatGPT Plus / Claude Pro\n• Key Windows & Office Bản Quyền`;
        actions = [
          { label: '🛒 MỞ CHỢ MMO', route: '/mmo', styleType: 'primary' },
        ];
      } else if (text.includes('admin') || text.includes('lien he') || text.includes('zalo') || text.includes('telegram') || text.includes('ho tro')) {
        botText = `💬 **Kênh Hỗ Trợ Kỹ Thuật IPAVIET OS**\n\nNếu sếp cần hỗ trợ trực tiếp từ Admin:\n• **Zalo / Hotline**: 0987.xxx.xxx\n• **Telegram**: @ipaviet_support\n• **Thời gian làm việc**: 08:00 - 23:00 hàng ngày`;
        actions = [
          { label: '💬 LIÊN HỆ ZALO ADMIN', actionType: 'zalo', styleType: 'primary' },
        ];
      } else {
        botText = `🤖 **Dạ em là Trợ Lý IPAVIET AI đây ạ!**\n\nEm có thể hỗ trợ sếp tất cả các công việc trên hệ thống:\n• Hướng dẫn ký tệp IPA & nạp chứng chỉ P12 / MobileProvision.\n• Kiểm tra số dư xu, hướng dẫn nạp tiền tự động qua ACB Bank.\n• Tư vấn các gói VIP & xử lý lỗi app văng / thu hồi.\n• Tìm kiếm ứng dụng Mod / Tweak IPA trong kho.\n\nSếp chọn tác vụ nhanh bên dưới hoặc gõ câu hỏi để em trợ giúp nhé!`;
        actions = [
          { label: '👑 GIA HẠN VIP', route: '/buy-vip', styleType: 'primary' },
          { label: '🛠️ KÝ APP IPA', route: '/sign', styleType: 'yellow' },
          { label: '💳 NẠP TIỀN', route: '/account', styleType: 'primary' },
          { label: '📦 KHO IPA', route: '/apps', styleType: 'yellow' },
        ];
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botText,
        timestamp: nowTime,
        actions,
        appCards: matchedApps.length > 0 ? matchedApps : undefined,
      };

      setIsThinking(false);
      setMessages((prev) => [...prev, botMsg]);
      scrollToBottom();
    },
    [appsData, scrollToBottom]
  );

  const handleActionPress = useCallback(
    (act: ActionItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
      if (act.route) {
        router.push(act.route as any);
      } else if (act.actionType === 'zalo') {
        Alert.alert('Liên hệ Admin', 'Zalo Kỹ Thuật IPAVIET: 0987.xxx.xxx (Sếp copy số điện thoại nhé!)');
      }
    },
    [router]
  );

  const handleAppPress = useCallback((id: string) => {
    router.push(`/details/${id}` as any);
  }, [router]);

  const suggestions = [
    { label: 'Gia hạn VIP', query: 'gia han vip', icon: <Crown size={16} color="#F59E0B" /> },
    { label: 'Ký App IPA', query: 'ky app vsign', icon: <Wrench size={16} color="#8B5CF6" /> },
    { label: 'Lỗi chứng chỉ', query: 'loi chung chi app crash', icon: <AlertTriangle size={16} color="#F43F5E" /> },
    { label: 'Nạp xu ACB', query: 'nap tien ngan hang', icon: <Wallet size={16} color="#10B981" /> },
    { label: 'Tìm IPA YouTube', query: 'tim ipa youtube', icon: <Sparkles size={16} color="#00F0FF" /> },
    { label: 'Admin hỗ trợ', query: 'lien he zalo admin', icon: <MessageSquare size={16} color="#3B82F6" /> },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <RNStatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />

      {/* Gradient Background Layer */}
      <LinearGradient
        colors={isLight ? ['#F0F4FF', '#F4F4F6', '#FFF0F5'] : ['#03040A', '#0a0e27', '#0f172a']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Orbs Background */}
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: isLight ? 'rgba(0,82,255,0.08)' : 'rgba(0,240,255,0.06)',
            top: '10%',
            left: '-10%',
            transform: [{ scale: avatarPulse }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: isLight ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.05)',
            bottom: '15%',
            right: '-15%',
            width: 280,
            height: 280,
            transform: [{ scale: Animated.add(0.8, Animated.multiply(glowAnim, 0.2)) }],
          },
        ]}
      />

      {/* Glass Top Navigation Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerBlurWrap}>
          <BlurView intensity={40} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                router.back();
              }}
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color={COLORS.text} strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Animated.View
                style={[
                  styles.aiAvatarBox,
                  {
                    transform: [{ scale: avatarPulse }],
                    shadowColor: '#00F0FF',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: Animated.multiply(glowAnim, 0.6),
                    shadowRadius: 12,
                  },
                ]}
              >
                <Bot size={18} color="#00F0FF" strokeWidth={2.5} />
              </Animated.View>
              <View>
                <Text style={styles.headerTitle}>Trợ Lý IPAVIET AI</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                  <Text style={styles.headerSub}>Tư vấn & Hỗ trợ kỹ thuật 24/7</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetChat}
              activeOpacity={0.8}
            >
              <RotateCcw size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* User Member Info Profile Bar */}
      <View style={styles.profileBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <UserCheck size={14} color={COLORS.textMuted} />
          <Text style={styles.profileUserText} numberOfLines={1}>
            {user ? user.email || 'Hội viên' : 'Khách'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Wallet size={13} color="#10B981" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>
              {userCoins.toLocaleString('vi-VN')}đ
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Crown size={13} color="#F59E0B" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#F59E0B' }}>
              {vipExpire}
            </Text>
          </View>
        </View>
      </View>

      {/* Chat Messages Container */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <Animated.ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        >
          {/* Default Hero State */}
          {messages.length === 0 && (
            <View style={styles.heroBox}>
              <Animated.View
                style={[
                  styles.heroAvatar,
                  { transform: [{ scale: avatarPulse }] },
                ]}
              >
                <LinearGradient
                  colors={isLight ? ['#0052FF', '#3B82F6'] : ['#00F0FF', '#0EA5E9']}
                  style={[StyleSheet.absoluteFill, { borderRadius: 40 }]}
                />
                <Bot size={36} color="#FFFFFF" strokeWidth={2.2} />
              </Animated.View>

              <Text style={styles.heroTitle}>
                Xin chào <Text style={{ color: isLight ? '#0052FF' : '#00F0FF' }}>{user?.displayName || 'sếp'}</Text>!
              </Text>
              <Text style={styles.heroSub}>
                Em là Trợ Lý AI Thông Minh. Hôm nay em có thể giúp gì cho sếp ạ?
              </Text>

              {/* Suggestions Grid */}
              <View style={styles.suggestionGrid}>
                {suggestions.map((item, index) => (
                  <SuggestionPill
                    key={index}
                    item={item}
                    index={index}
                    onPress={processQuery}
                    styles={styles}
                  />
                ))}
              </View>

              {/* Quick Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ShieldCheck size={18} color={isLight ? '#0052FF' : '#00F0FF'} />
                  <Text style={styles.statText}>Bảo mật 100%</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Zap size={18} color={isLight ? '#0052FF' : '#00F0FF'} />
                  <Text style={styles.statText}>Phản hồi tức thì</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Flame size={18} color={isLight ? '#0052FF' : '#00F0FF'} />
                  <Text style={styles.statText}>500+ App Mod</Text>
                </View>
              </View>
            </View>
          )}

          {/* Render Messages */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isLight={isLight}
              styles={styles}
              onActionPress={handleActionPress}
              onAppPress={handleAppPress}
            />
          ))}

          {/* AI Thinking Indicator */}
          {isThinking && (
            <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}>
              <View style={styles.msgAvatarBox}>
                <Bot size={14} color="#00F0FF" />
              </View>
              <View style={[styles.msgBubble, styles.botBubble, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <TypingIndicator isLight={isLight} />
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600' }}>
                  IPAVIET AI đang suy nghĩ...
                </Text>
              </View>
            </View>
          )}
        </Animated.ScrollView>

        {/* Input Bar */}
        <Animated.View
          style={[
            styles.inputBarArea,
            {
              borderColor: inputGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', isLight ? 'rgba(0,82,255,0.3)' : 'rgba(0,240,255,0.4)'],
              }),
              shadowColor: isLight ? '#0052FF' : '#00F0FF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: inputGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }),
              shadowRadius: 12,
            },
          ]}
        >
          <View style={[styles.inputPill, isInputFocused && { borderColor: isLight ? 'rgba(0,82,255,0.4)' : 'rgba(0,240,255,0.5)' }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Hỏi AI bất cứ điều gì (Ký app, nạp xu, VIP...)..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onSubmitEditing={() => inputText.trim() && processQuery(inputText)}
              returnKeyType="send"
              selectionColor={isLight ? '#0052FF' : '#00F0FF'}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim()
                    ? (isLight ? '#0052FF' : '#00F0FF')
                    : isLight
                      ? 'rgba(0,0,0,0.06)'
                      : 'rgba(255,255,255,0.08)',
                  transform: [{ scale: inputText.trim() ? 1 : 0.9 }],
                },
              ]}
              disabled={!inputText.trim()}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                inputText.trim() && processQuery(inputText);
              }}
              activeOpacity={0.8}
            >
              <Send size={16} color={inputText.trim() ? (isLight ? '#FFFFFF' : '#03040A') : COLORS.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — Premium Glassmorphism Engine
   ═══════════════════════════════════════════════════════════════ */
const getStyles = (theme: typeof COLORS, isLight: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    orb: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 150,
    },

    // Header
    topHeader: {
      paddingTop: Platform.OS === 'ios' ? 48 : 34,
      zIndex: 100,
    },
    headerBlurWrap: {
      overflow: 'hidden',
      borderBottomWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
      backgroundColor: isLight ? 'rgba(255,255,255,0.75)' : 'rgba(18,20,32,0.75)',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    aiAvatarBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: isLight ? 'rgba(0,82,255,0.12)' : 'rgba(0,240,255,0.15)',
      borderWidth: 1.5,
      borderColor: isLight ? 'rgba(0,82,255,0.3)' : 'rgba(0,240,255,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: theme.text,
      letterSpacing: -0.3,
    },
    headerSub: {
      fontSize: 11,
      color: isLight ? '#0052FF' : '#00F0FF',
      fontWeight: '700',
      marginTop: 1,
    },
    resetBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Profile Bar
    profileBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(15,18,32,0.6)',
      borderBottomWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
    },
    profileUserText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
      maxWidth: 140,
    },

    // Hero Box
    heroBox: {
      alignItems: 'center',
      paddingVertical: 36,
      paddingHorizontal: 16,
    },
    heroAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: isLight ? '#0052FF' : '#00F0FF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: theme.text,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    heroSub: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 22,
      maxWidth: 300,
      fontWeight: '500',
    },
    suggestionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 28,
      justifyContent: 'center',
    },
    suggestionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 22,
      backgroundColor: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(15,18,32,0.8)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
      shadowColor: isLight ? '#000' : '#00F0FF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isLight ? 0.04 : 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    suggestionPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 32,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 16,
      backgroundColor: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.03)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
      gap: 16,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statText: {
      fontSize: 11,
      fontWeight: '700',
      color: isLight ? '#475569' : '#94A3B8',
    },
    statDivider: {
      width: 1,
      height: 16,
      backgroundColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    },

    // Chat Message Rows
    msgRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 18,
      gap: 8,
    },
    msgAvatarBox: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isLight ? 'rgba(0,82,255,0.1)' : 'rgba(0,240,255,0.12)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,82,255,0.2)' : 'rgba(0,240,255,0.25)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 2,
    },
    msgBubble: {
      maxWidth: '82%',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 22,
    },
    userBubble: {
      backgroundColor: isLight ? '#0052FF' : '#00F0FF',
      borderBottomRightRadius: 6,
      shadowColor: isLight ? '#0052FF' : '#00F0FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 5,
    },
    botBubble: {
      backgroundColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,18,32,0.9)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
      borderBottomLeftRadius: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isLight ? 0.05 : 0.15,
      shadowRadius: 12,
      elevation: 3,
    },
    msgText: {
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '500',
    },
    msgTime: {
      fontSize: 10,
      fontWeight: '700',
      marginTop: 8,
      alignSelf: 'flex-end',
      letterSpacing: 0.2,
    },

    // AI App Cards
    aiAppCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 16,
      backgroundColor: isLight ? 'rgba(244,244,246,0.8)' : 'rgba(22,25,40,0.8)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
    },
    aiAppIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
    },
    aiAppName: {
      fontSize: 13,
      fontWeight: '900',
      color: theme.text,
      letterSpacing: -0.2,
    },
    aiAppCat: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 3,
      fontWeight: '600',
    },
    aiAppBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },

    // Action Chips
    actionChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },
    actionChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    actionChipPrimary: {
      backgroundColor: isLight ? '#0052FF' : '#00F0FF',
    },
    actionChipYellow: {
      backgroundColor: '#F59E0B',
    },
    actionChipDanger: {
      backgroundColor: '#F43F5E',
    },
    actionChipText: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: -0.2,
    },

    // Input Bar
    inputBarArea: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isLight ? 'rgba(244,244,246,0.9)' : 'rgba(3,4,10,0.9)',
      borderTopWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
    },
    inputPill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      borderRadius: 26,
      backgroundColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,18,32,0.9)',
      borderWidth: 1.5,
      borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
      paddingLeft: 18,
      paddingRight: 6,
    },
    textInput: {
      flex: 1,
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
      height: '100%',
      padding: 0,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });