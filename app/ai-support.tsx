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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar as RNStatusBar,
  Alert,
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
  Zap,
  RotateCcw,
  Crown,
  Wallet,
  Wrench,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Download,
  ExternalLink,
  Flame,
} from 'lucide-react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { COLORS, useThemeUpdate, TXT } from '../constants/theme';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../constants/data';

const { width: SCREEN_W } = Dimensions.get('window');
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
   IPAVIET AI KNOWLEDGE BASE & INTENT ENGINE
   ═══════════════════════════════════════════════════════════════ */
function removeAccents(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

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

  const scrollViewRef = useRef<ScrollView>(null);
  const avatarPulse = useRef(new Animated.Value(1)).current;

  // Pulse animation for AI Avatar
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(avatarPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Fetch apps data for AI search
  useEffect(() => {
    Promise.all([fetchRegularApps(), fetchVIPApps()]).then(([reg, vip]) => {
      setAppsData([...reg, ...vip]);
    });
  }, []);

  // Auth & real-time user coins / VIP listener
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
    }, 100);
  }, []);

  const resetChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMessages([]);
  }, []);

  // Process Bot Response Logic
  const processQuery = useCallback(
    async (rawText: string) => {
      const text = removeAccents(rawText.trim());
      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      // Add user message
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

      await new Promise((r) => setTimeout(r, 600));

      let botText = '';
      let actions: Message['actions'] = [];
      let matchedApps: AppItem[] = [];

      // Intent 1: Buy VIP / Renew VIP
      if (text.includes('vip') || text.includes('gia han') || text.includes('mua goi') || text.includes('nang cap')) {
        botText = `👑 **Đặc Quyền VIP IPAVIET OS**\n\nKhi nâng cấp gói VIP, sếp sẽ nhận được các đặc quyền cao cấp:\n• Tải & cài đặt ứng dụng VIP tốc độ cao không giới hạn.\n• Ký App ngoại tuyến không bị dính thu hồi chứng chỉ.\n• Hỗ trợ ưu tiên 24/7 từ đội ngũ kỹ thuật.\n\nSếp chọn gói phù hợp bên dưới nhé!`;
        actions = [
          { label: '👑 NÂNG CẤP VIP NGAY', route: '/buy-vip', styleType: 'primary' },
          { label: '💳 NẠP TIỀN VÀO TÀI KHOẢN', route: '/account', styleType: 'yellow' },
        ];
      }
      // Intent 2: Sign App / VSign / Certificate
      else if (text.includes('ky app') || text.includes('vsign') || text.includes('cert') || text.includes('p12') || text.includes('provision') || text.includes('dylib') || text.includes('zip')) {
        botText = `🛠️ **Hướng Dẫn Ký IPA Ngoại Tuyến (VSign Pro)**\n\n1. **Chuẩn bị**: Nạp file chứng chỉ dạng tệp ZIP (chứa file P12 và MobileProvision) vào ứng dụng.\n2. **Chọn App**: Chọn tệp IPA sếp muốn ký từ bộ nhớ máy.\n3. **Chèn Dylib/Deb**: Sếp có thể bấm chèn thêm các tệp Hack/Tweak Dylib tùy chỉnh.\n4. **Bấm Ký App**: Quá trình ký diễn ra 100% ngoại tuyến trên thiết bị di động của sếp.`;
        actions = [
          { label: '🛠️ MỞ MÀN HÌNH KÝ APP', route: '/sign', styleType: 'primary' },
          { label: '📂 NẠP CHỨNG CHỈ ZIP', route: '/sign?importCert=true', styleType: 'yellow' },
        ];
      }
      // Intent 3: Deposit / Money / Coins / Bank
      else if (text.includes('nap') || text.includes('tien') || text.includes('xu') || text.includes('ngan hang') || text.includes('bank') || text.includes('chuyen khoan')) {
        const userEmail = auth.currentUser?.email || 'TaiKhoanCuaSep';
        botText = `💳 **Hướng Dẫn Nạp Xu Tự Động (ACB Bank)**\n\nSếp vui lòng chuyển khoản theo thông tin bên dưới, hệ thống sẽ cộng xu tự động sau 10 - 30 giây:\n\n• **Ngân hàng**: ACB (Á Châu)\n• **Số tài khoản**: \`${ACCOUNT_NO}\`\n• **Chủ tài khoản**: ${ACCOUNT_NAME}\n• **Nội dung chuyển khoản**: \`NAP ${userEmail}\`\n\n*(Lưu ý điền đúng cú pháp Email để xu tự động nạp nhé sếp!)*`;
        actions = [
          { label: '💳 ĐẾN TRANG NẠP TIỀN', route: '/account', styleType: 'primary' },
          { label: '💬 LIÊN HỆ ADMIN HỖ TRỢ', route: '/account', styleType: 'yellow' },
        ];
      }
      // Intent 4: Crash / Certificate Revoked / Error
      else if (text.includes('crash') || text.includes('loi') || text.includes('thu hoi') || text.includes('văng') || text.includes('vang') || text.includes('khong mo duoc')) {
        botText = `⚠️ **Khắc Phục Lỗi App Bị Crash / Thu Hồi Chứng Chỉ**\n\n• **Nguyên nhân**: Apple đã thu hồi chứng chỉ doanh nghiệp dùng chung.\n• **Cách xử lý**: \n  1. Sếp gỡ bản app bị văng ra khỏi máy.\n  2. Vào mục **Ký App** trên ứng dụng để ký lại bằng chứng chỉ cá nhân của sếp.\n  3. Hoặc nâng cấp **VIP IPAVIET** để dùng chứng chỉ riêng độc quyền chống thu hồi!`;
        actions = [
          { label: '👑 MUA CHỨNG CHỈ VIP', route: '/buy-vip', styleType: 'primary' },
          { label: '🛠️ TỰ KÝ LẠI APP', route: '/sign', styleType: 'yellow' },
        ];
      }
      // Intent 5: Search IPA / App Info
      else if (text.includes('ipa') || text.includes('game') || text.includes('hack') || text.includes('cheat') || text.includes('tim') || text.includes('app') || text.includes('youtube') || text.includes('facebook') || text.includes('tiktok')) {
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
      }
      // Intent 6: MMO Market / Accounts
      else if (text.includes('mmo') || text.includes('spotify') || text.includes('netflix') || text.includes('chatgpt') || text.includes('tai khoan') || text.includes('cho mmo')) {
        botText = `🛒 **Tạp Hóa MMO — Tài Khoản Bán Tự Động**\n\nSếp có thể mua các gói tài khoản Premium chính chủ với giá siêu rẻ:\n• Spotify Premium 1 Năm (Chính chủ)\n• Netflix Premium 4K\n• ChatGPT Plus / Claude Pro\n• Key Windows & Office Bản Quyền`;
        actions = [
          { label: '🛒 MỞ CHỢ MMO', route: '/mmo', styleType: 'primary' },
        ];
      }
      // Intent 7: Contact Admin
      else if (text.includes('admin') || text.includes('lien he') || text.includes('zalo') || text.includes('telegram') || text.includes('ho tro')) {
        botText = `💬 **Kênh Hỗ Trợ Kỹ Thuật IPAVIET OS**\n\nNếu sếp cần hỗ trợ trực tiếp từ Admin:\n• **Zalo / Hotline**: 0987.xxx.xxx\n• **Telegram**: @ipaviet_support\n• **Thời gian làm việc**: 08:00 - 23:00 hàng ngày`;
        actions = [
          { label: '💬 LIÊN HỆ ZALO ADMIN', actionType: 'zalo', styleType: 'primary' },
        ];
      }
      // Default AI Response
      else {
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (act.route) {
        router.push(act.route as any);
      } else if (act.actionType === 'zalo') {
        Alert.alert('Liên hệ Admin', 'Zalo Kỹ Thuật IPAVIET: 0987.xxx.xxx (Sếp copy số điện thoại nhé!)');
      }
    },
    [router]
  );

  return (
    <View style={styles.root}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <RNStatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />

      {/* Glass Top Navigation Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerBlurWrap}>
          <BlurView intensity={30} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color={COLORS.text} strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Animated.View style={[styles.aiAvatarBox, { transform: [{ scale: avatarPulse }] }]}>
                <Bot size={18} color="#00F0FF" strokeWidth={2.5} />
              </Animated.View>
              <View>
                <Text style={styles.headerTitle}>Trợ Lý IPAVIET AI</Text>
                <Text style={styles.headerSub}>Tư vấn & Hỗ trợ kỹ thuật 24/7</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={resetChat} activeOpacity={0.8}>
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
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Default Hero State when no messages */}
          {messages.length === 0 && (
            <View style={styles.heroBox}>
              <Animated.View style={[styles.heroAvatar, { transform: [{ scale: avatarPulse }] }]}>
                <Bot size={36} color="#00F0FF" strokeWidth={2.2} />
              </Animated.View>

              <Text style={styles.heroTitle}>
                Xin chào <Text style={{ color: isLight ? '#0052FF' : '#00F0FF' }}>{user?.displayName || 'sếp'}</Text>!
              </Text>
              <Text style={styles.heroSub}>
                Em là Trợ Lý AI Thông Minh. Hôm nay em có thể giúp gì cho sếp ạ?
              </Text>

              {/* Suggestions Grid */}
              <View style={styles.suggestionGrid}>
                <TouchableOpacity
                  style={styles.suggestionPill}
                  onPress={() => processQuery('gia han vip')}
                  activeOpacity={0.8}
                >
                  <Crown size={16} color="#F59E0B" />
                  <Text style={styles.suggestionPillText}>Gia hạn VIP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.suggestionPill}
                  onPress={() => processQuery('ky app vsign')}
                  activeOpacity={0.8}
                >
                  <Wrench size={16} color="#8B5CF6" />
                  <Text style={styles.suggestionPillText}>Ký App IPA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.suggestionPill}
                  onPress={() => processQuery('loi chung chi app crash')}
                  activeOpacity={0.8}
                >
                  <AlertTriangle size={16} color="#F43F5E" />
                  <Text style={styles.suggestionPillText}>Lỗi chứng chỉ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.suggestionPill}
                  onPress={() => processQuery('nap tien ngan hang')}
                  activeOpacity={0.8}
                >
                  <Wallet size={16} color="#10B981" />
                  <Text style={styles.suggestionPillText}>Nạp xu ACB</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.suggestionPill}
                  onPress={() => processQuery('tim ipa youtube')}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#00F0FF" />
                  <Text style={styles.suggestionPillText}>Tìm IPA YouTube</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.suggestionPill}
                  onPress={() => processQuery('lien he zalo admin')}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={16} color="#3B82F6" />
                  <Text style={styles.suggestionPillText}>Admin hỗ trợ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Render Messages */}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.msgRow,
                msg.sender === 'user' ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
              ]}
            >
              {msg.sender === 'bot' && (
                <View style={styles.msgAvatarBox}>
                  <Bot size={14} color="#00F0FF" />
                </View>
              )}

              <View
                style={[
                  styles.msgBubble,
                  msg.sender === 'user'
                    ? { backgroundColor: isLight ? '#0052FF' : '#00F0FF', borderBottomRightRadius: 4 }
                    : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.msgText,
                    { color: msg.sender === 'user' ? (isLight ? '#FFFFFF' : '#03040A') : COLORS.text },
                  ]}
                >
                  {msg.text}
                </Text>

                {/* App Cards inside AI response if matched */}
                {msg.appCards && msg.appCards.length > 0 && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {msg.appCards.map((appItem) => (
                      <TouchableOpacity
                        key={appItem.id}
                        style={styles.aiAppCard}
                        onPress={() => router.push(`/details/${appItem.id}`)}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: appItem.iconUrl }} style={styles.aiAppIcon} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.aiAppName} numberOfLines={1}>
                            {appItem.name}
                          </Text>
                          <Text style={styles.aiAppCat} numberOfLines={1}>
                            {appItem.category || 'IPA App'}
                          </Text>
                        </View>
                        <View style={styles.aiAppBtn}>
                          <Download size={12} color="#FFF" />
                          <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>TẢI VỀ</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Interactive Action Chips */}
                {msg.actions && msg.actions.length > 0 && (
                  <View style={styles.actionChipRow}>
                    {msg.actions.map((act, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.actionChip,
                          act.styleType === 'yellow' && { backgroundColor: '#F59E0B' },
                          act.styleType === 'danger' && { backgroundColor: '#F43F5E' },
                        ]}
                        onPress={() => handleActionPress(act)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionChipText}>{act.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text
                  style={[
                    styles.msgTime,
                    { color: msg.sender === 'user' ? (isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : COLORS.textMuted },
                  ]}
                >
                  {msg.timestamp}
                </Text>
              </View>
            </View>
          ))}

          {/* AI Thinking Animation Indicator */}
          {isThinking && (
            <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}>
              <View style={styles.msgAvatarBox}>
                <Bot size={14} color="#00F0FF" />
              </View>
              <View style={[styles.msgBubble, styles.botBubble, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <ActivityIndicator size="small" color={isLight ? '#0052FF' : '#00F0FF'} />
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600' }}>
                  IPAVIET AI đang suy nghĩ...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBarArea}>
          <View style={styles.inputPill}>
            <TextInput
              style={styles.textInput}
              placeholder="Hỏi AI bất cứ điều gì (Ký app, nạp xu, VIP...)..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => inputText.trim() && processQuery(inputText)}
              returnKeyType="send"
              selectionColor={isLight ? '#0052FF' : '#00F0FF'}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: inputText.trim() ? (isLight ? '#0052FF' : '#00F0FF') : COLORS.textMuted },
              ]}
              disabled={!inputText.trim()}
              onPress={() => inputText.trim() && processQuery(inputText)}
              activeOpacity={0.8}
            >
              <Send size={16} color={isLight ? '#FFFFFF' : '#03040A'} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — Dynamic Theme Engine
   ═══════════════════════════════════════════════════════════════ */
const getStyles = (theme: typeof COLORS, isLight: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },

    // Header
    topHeader: {
      paddingTop: Platform.OS === 'ios' ? 48 : 34,
      zIndex: 100,
    },
    headerBlurWrap: {
      overflow: 'hidden',
      borderBottomWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
      backgroundColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(18,20,32,0.85)',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    aiAvatarBox: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isLight ? 'rgba(0,82,255,0.1)' : 'rgba(0,240,255,0.12)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,82,255,0.25)' : 'rgba(0,240,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: theme.text,
    },
    headerSub: {
      fontSize: 11,
      color: isLight ? '#0052FF' : '#00F0FF',
      fontWeight: '700',
    },
    resetBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Profile Bar
    profileBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: isLight ? '#FFFFFF' : '#0F1220',
      borderBottomWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
    },
    profileUserText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
      maxWidth: 120,
    },

    // Hero Box
    heroBox: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    heroAvatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: isLight ? 'rgba(0,82,255,0.1)' : 'rgba(0,240,255,0.12)',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,82,255,0.3)' : 'rgba(0,240,255,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.text,
      textAlign: 'center',
    },
    heroSub: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
      maxWidth: 300,
    },
    suggestionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 24,
      justifyContent: 'center',
    },
    suggestionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: isLight ? '#FFFFFF' : '#0F1220',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
    },
    suggestionPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },

    // Chat Message Rows
    msgRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 16,
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
      paddingVertical: 12,
      borderRadius: 20,
    },
    botBubble: {
      backgroundColor: isLight ? '#FFFFFF' : '#0F1220',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
      borderBottomLeftRadius: 4,
    },
    msgText: {
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '500',
    },
    msgTime: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 6,
      alignSelf: 'flex-end',
    },

    // AI App Cards
    aiAppCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 14,
      backgroundColor: isLight ? '#F4F4F6' : '#161928',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
    },
    aiAppIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    aiAppName: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
    },
    aiAppCat: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 2,
    },
    aiAppBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isLight ? '#0052FF' : '#00F0FF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },

    // Action Chips
    actionChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    actionChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: isLight ? '#0052FF' : '#00F0FF',
    },
    actionChipText: {
      fontSize: 12,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    // Input Bar
    inputBarArea: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
    },
    inputPill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
      borderRadius: 24,
      backgroundColor: isLight ? '#FFFFFF' : '#0F1220',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
      paddingLeft: 16,
      paddingRight: 6,
    },
    textInput: {
      flex: 1,
      color: theme.text,
      fontSize: 14,
      fontWeight: '500',
      height: '100%',
      padding: 0,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
