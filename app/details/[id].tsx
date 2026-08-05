import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
  FlatList,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Star,
  Zap,
  X,
  Download,
  Sparkles,
  ShieldCheck,
  Globe,
  Share2,
  Layers,
  Info,
  CheckCircle2,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

import { CACHED_REGULAR_APPS, CACHED_VIP_APPS, fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS, useThemeUpdate, TXT, CURRENT_FPS_MODE, loadFpsMode } from '../../constants/theme';
import { translateText } from '../../utils/translate';
import { startStaticServer } from '../../utils/staticServer';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════════
   iOS 26 SPATIAL DESIGN SYSTEM — Liquid Glass & Depth
   ═══════════════════════════════════════════════════════════════ */
const T = {
  void: '#000000',
  depth1: '#050508',
  depth2: '#0a0a10',
  depth3: '#101018',
  depth4: '#161620',

  glass: {
    bg: 'rgba(255,255,255,0.04)',
    bgStrong: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',
    highlight: 'rgba(255,255,255,0.12)',
  },

  cyan: '#00E5FF',
  cyanGlow: 'rgba(0,229,255,0.3)',
  violet: '#A78BFA',
  violetGlow: 'rgba(167,139,250,0.3)',
  rose: '#FB7185',
  amber: '#FBBF24',
  emerald: '#34D399',
  gold: '#FFD700',

  text: '#FFFFFF',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.60)',
  textTertiary: 'rgba(255,255,255,0.35)',

  radius: { xs: 8, sm: 14, md: 20, lg: 28, xl: 36, full: 999 },
  spring: { friction: 8, tension: 140, useNativeDriver: true },
};

const IpaSigner = (() => {
  if (Platform.OS === 'web') return null;
  try {
    return requireNativeModule('IpaSigner');
  } catch (e) {
    return null;
  }
})();
const INSTALLER_WORKER_URL = "https://ipaviet-installer.clonene121212.workers.dev";

/* ═══════════════════════════════════════════════════════════════
   SPATIAL BACKDROP — Cinematic Ambient Layer
   ═══════════════════════════════════════════════════════════════ */
const SpatialBackdrop = memo(() => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDrift = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      );

    createDrift(anim1, 22000, 0).start();
    createDrift(anim2, 28000, 4000).start();
  }, []);

  const drift = (anim: Animated.Value, xRange: number[], yRange: number[]) => ({
    transform: [
      { translateX: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: xRange }) },
      { translateY: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: yRange }) },
    ],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          { position: 'absolute', borderRadius: 999, opacity: 0.6, width: 500, height: 500, backgroundColor: 'rgba(139,92,246,0.12)', top: -150, left: -100 },
          drift(anim1, [0, 60, 0], [0, 50, 0]),
        ]}
      />

      <Animated.View
        style={[
          { position: 'absolute', borderRadius: 999, opacity: 0.6, width: 450, height: 450, backgroundColor: 'rgba(0,229,255,0.10)', top: 250, right: -100 },
          drift(anim2, [0, -50, 0], [0, -40, 0]),
        ]}
      />
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   LIQUID GLASS CONTAINER
   ═══════════════════════════════════════════════════════════════ */
interface GlassProps {
  children: React.ReactNode;
  style?: any;
  intensity?: 'subtle' | 'normal' | 'strong' | 'ultra';
  border?: boolean;
}

const LiquidGlass = memo(({ children, style, intensity = 'normal', border = true }: GlassProps) => {
  useThemeUpdate();
  const isLight = COLORS.background === '#F4F4F6';
  const opacityMap = { subtle: 0.03, normal: 0.06, strong: 0.12, ultra: 0.18 };
  const borderMap = { subtle: 0.06, normal: 0.12, strong: 0.20, ultra: 0.30 };

  return (
    <View
      style={[
        {
          backgroundColor: isLight ? '#FFFFFF' : `rgba(255,255,255,${opacityMap[intensity]})`,
          borderWidth: border ? 1 : 0,
          borderColor: isLight ? 'rgba(0,0,0,0.08)' : `rgba(255,255,255,${borderMap[intensity]})`,
          borderRadius: T.radius.lg,
          overflow: 'hidden',
          shadowColor: isLight ? 'rgba(0,0,0,0.06)' : '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: isLight ? 0.1 : 0.4,
          shadowRadius: 24,
          elevation: 8,
        },
        style,
      ]}
    >
      {!isLight && (
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.00)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   MAIN APP DETAILS SCREEN
   ═══════════════════════════════════════════════════════════════ */
export default function AppDetailScreen() {
  useThemeUpdate();
  const isLight = COLORS.background === '#F4F4F6';
  const styles = getStyles(COLORS, isLight);
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [app, setApp] = useState<AppItem | null>(null);
  const [downloadState, setDownloadState] = useState('CÀI ĐẶT');
  const [isFetchingApple, setIsFetchingApple] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // States dịch chủ động
  const [showTranslated, setShowTranslated] = useState(false);
  const [translatedDesc, setTranslatedDesc] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const currentLang = TXT.langName === 'English' ? 'en' : 'vi';

  // Lightbox screenshot viewer
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const backBtnScale = useRef(new Animated.Value(1)).current;
  const downloadBtnScale = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  // Staggered 3D Entrance Animation Values
  const topCapsuleY = useRef(new Animated.Value(-35)).current;
  const topCapsuleOpacity = useRef(new Animated.Value(0)).current;

  const iconScale = useRef(new Animated.Value(0.8)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  const heroMetaY = useRef(new Animated.Value(25)).current;
  const heroMetaOpacity = useRef(new Animated.Value(0)).current;

  const statsScale = useRef(new Animated.Value(0.94)).current;
  const statsY = useRef(new Animated.Value(20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;

  const screenshotsX = useRef(new Animated.Value(40)).current;
  const screenshotsOpacity = useRef(new Animated.Value(0)).current;

  const bodyTranslateY = useRef(new Animated.Value(30)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;

  const modalTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const combinedTranslateY = Animated.add(modalTranslateY, dragY);

  const handleCloseModal = () => {
    setActiveScreenshotIndex(null);
  };

  // Modal screenshot entrance
  useEffect(() => {
    if (activeScreenshotIndex !== null) {
      modalTranslateY.setValue(SCREEN_H);
      modalScale.setValue(0.9);
      Animated.parallel([
        Animated.spring(modalTranslateY, { toValue: 0, stiffness: 200, damping: 20, useNativeDriver: true }),
        Animated.spring(modalScale, { toValue: 1, stiffness: 200, damping: 20, useNativeDriver: true }),
      ]).start();
    }
  }, [activeScreenshotIndex]);

  // Load app data
  useEffect(() => {
    const loadData = async () => {
      let allApps = [...CACHED_REGULAR_APPS, ...CACHED_VIP_APPS];
      let foundApp = allApps.find((a: AppItem) => a.id === id);

      if (!foundApp) {
        const [reg, vip] = await Promise.all([fetchRegularApps(), fetchVIPApps()]);
        foundApp = [...reg, ...vip].find((a: AppItem) => a.id === id);
      }

      if (foundApp) {
        setApp(foundApp);

        await loadFpsMode();
        const is120 = CURRENT_FPS_MODE === '120fps';

        // Run 3D Staggered Entrance Animation with 120Hz vs 60Hz frame pacing
        setTimeout(() => {
          Animated.stagger(is120 ? 15 : 40, [
            Animated.parallel([
              Animated.spring(topCapsuleY, { toValue: 0, stiffness: is120 ? 280 : 200, damping: is120 ? 22 : 18, useNativeDriver: true }),
              Animated.timing(topCapsuleOpacity, { toValue: 1, duration: is120 ? 180 : 280, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.spring(iconScale, { toValue: 1, stiffness: is120 ? 300 : 220, damping: is120 ? 20 : 16, mass: 0.8, useNativeDriver: true }),
              Animated.timing(iconOpacity, { toValue: 1, duration: is120 ? 180 : 280, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.spring(heroMetaY, { toValue: 0, stiffness: is120 ? 260 : 180, damping: is120 ? 20 : 16, useNativeDriver: true }),
              Animated.timing(heroMetaOpacity, { toValue: 1, duration: is120 ? 200 : 300, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.spring(statsScale, { toValue: 1, stiffness: is120 ? 280 : 200, damping: is120 ? 22 : 18, useNativeDriver: true }),
              Animated.spring(statsY, { toValue: 0, stiffness: is120 ? 260 : 180, damping: is120 ? 20 : 16, useNativeDriver: true }),
              Animated.timing(statsOpacity, { toValue: 1, duration: is120 ? 200 : 300, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.spring(screenshotsX, { toValue: 0, stiffness: is120 ? 240 : 180, damping: is120 ? 20 : 18, useNativeDriver: true }),
              Animated.timing(screenshotsOpacity, { toValue: 1, duration: is120 ? 220 : 350, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.spring(bodyTranslateY, { toValue: 0, stiffness: is120 ? 220 : 160, damping: is120 ? 20 : 18, useNativeDriver: true }),
              Animated.timing(bodyOpacity, { toValue: 1, duration: is120 ? 250 : 380, useNativeDriver: true }),
            ]),
          ]).start();
        }, is120 ? 20 : 50);

        if (!foundApp.screenshots || foundApp.screenshots.length === 0) fetchAppleData(foundApp);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy dữ liệu ứng dụng!');
        router.back();
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    setTranslatedDesc('');
    setShowTranslated(false);
  }, [app]);

  // Fetch Apple screenshot metadata fallback
  const fetchAppleData = async (currentApp: AppItem) => {
    setIsFetchingApple(true);
    try {
      let searchName = currentApp.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';

      const country = currentLang === 'en' ? 'us' : 'vn';
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=${country}`);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const appleData = data.results[0];
        setApp((prev) => {
          if (!prev || prev.id !== currentApp.id) return prev;
          return {
            ...prev,
            iconUrl: appleData.artworkUrl512 || prev.iconUrl,
            screenshots: appleData.screenshotUrls || prev.screenshots,
            description: appleData.description || prev.description,
          };
        });
      }
    } catch (error) { }
    setIsFetchingApple(false);
  };

  const handleTranslateToggle = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translatedDesc) {
      setShowTranslated(true);
      return;
    }
    if (!app || !app.description) return;

    setIsTranslating(true);
    try {
      const resTrans = await translateText(app.description, currentLang);
      if (resTrans) {
        setTranslatedDesc(resTrans);
        setShowTranslated(true);
      } else {
        Alert.alert('Lỗi', 'Không thể dịch mô tả lúc này. Sếp vui lòng thử lại sau!');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể dịch mô tả lúc này. Sếp vui lòng thử lại sau!');
    } finally {
      setIsTranslating(false);
    }
  };

  const getVipMillis = (vipExpire: any) => {
    if (!vipExpire) return 0;
    if (typeof vipExpire.toMillis === 'function') return vipExpire.toMillis();
    if (vipExpire.seconds) return vipExpire.seconds * 1000;
    return Number(vipExpire) || 0;
  };

  const handleSecureDownload = async () => {
    if (downloadState !== 'CÀI ĐẶT' && downloadState !== 'LỖI, THỬ LẠI') return;

    if (!auth.currentUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
      return Alert.alert(
        'Yêu cầu Đăng nhập',
        'Vui lòng đăng nhập tài khoản trước khi cài đặt ứng dụng nhé!',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng nhập ngay', onPress: () => router.push('/account') },
        ]
      );
    }

    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const expireMillis = getVipMillis(snap.data().vipExpire);
        if (expireMillis > Date.now()) {
          handleOneClickInstall();
          return;
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
      Alert.alert(
        'Yêu cầu Đặc Quyền VIP',
        'Để tải kho ứng dụng độc quyền và không chứa quảng cáo, Sếp vui lòng nâng cấp gói VIP nhé!',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Nâng Cấp Ngay', onPress: () => router.push('/buy-vip') },
        ]
      );
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xác thực.');
    }
  };

  const handleOneClickInstall = async () => {
    if (!app) return;
    if (Platform.OS === 'web') {
      Alert.alert('Không khả dụng', 'Tính năng ký và cài đặt IPA ngoại tuyến chỉ được hỗ trợ trên thiết bị iOS thực tế.');
      return;
    }
    if (!IpaSigner) {
      Alert.alert('Hạn chế của Expo Go', 'Tính năng ký và cài đặt IPA yêu cầu bản build phát triển (Development Build) vì sử dụng mô-đun native tự viết.');
      return;
    }

    const bgMode = (await AsyncStorage.getItem('@background_mode')) === 'true';
    if (bgMode && IpaSigner) {
      try {
        await IpaSigner.startBackgroundTask();
      } catch (e) { }
    }

    try {
      const certsStr = await AsyncStorage.getItem('@saved_certs');
      const certs = certsStr ? JSON.parse(certsStr) : [];
      if (!certs || certs.length === 0) {
        Alert.alert('Chưa có chứng chỉ', 'Sếp cần thêm chứng chỉ P12 vào Thư viện trước khi cài app!');
        router.push('/sign');
        if (bgMode && IpaSigner) {
          try { await IpaSigner.endBackgroundTask(); } catch (e) { }
        }
        return;
      }
      const activeId = await AsyncStorage.getItem('@active_cert_id');
      let activeCert = certs[0];
      if (activeId) {
        const found = certs.find((c: any) => c.id === activeId);
        if (found) activeCert = found;
      }

      const currentCertUdid = activeCert.udid || activeCert.uuid || '';
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.boundUdid && currentCertUdid && userData.boundUdid !== currentCertUdid) {
          Alert.alert(
            'Thiết bị không hợp lệ',
            `Tài khoản VIP này đã được liên kết cố định với một thiết bị/chứng chỉ khác (UDID: ${userData.boundUdid}) và không thể sử dụng trên thiết bị này.`
          );
          if (bgMode && IpaSigner) {
            try { await IpaSigner.endBackgroundTask(); } catch (e) { }
          }
          return;
        }
      }

      setDownloadState('Đang tải...');
      const safeName = 'app_' + Date.now();
      const rawIpaPath = FileSystem.cacheDirectory + safeName + '.ipa';
      const ipaLink = (app.ipaUrl || (app as any).link || '').trim();

      const dl = FileSystem.createDownloadResumable(
        ipaLink,
        rawIpaPath,
        { sessionType: FileSystem.FileSystemSessionType.FOREGROUND },
        (p) => {
          const prog = Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100);
          setDownloadState(`Tải ${prog}%`);
        }
      );
      await dl.downloadAsync();

      const fileInfo = await FileSystem.getInfoAsync(rawIpaPath);
      if (!fileInfo.exists || fileInfo.size < 100 * 1024) {
        throw new Error('Tệp tải về bị lỗi hoặc quá nhỏ. Sếp vui lòng kiểm tra nguồn tải nhé.');
      }

      setDownloadState('Đang ký App...');
      const { signAppOffline } = require('../../modules/ipa-signer');
      const signResult = await signAppOffline(rawIpaPath, activeCert.p12Uri, activeCert.provUri, activeCert.password);

      setDownloadState('Tạo OTA...');
      const signedFileName = signResult.outputPath.split('/').pop();
      const signedFileDir = signResult.outputPath.substring(0, signResult.outputPath.lastIndexOf('/'));
      const serverUrl = await startStaticServer(signedFileDir);

      setDownloadState('Hoàn tất!');
      const localIpaUrl = `${serverUrl}/${signedFileName}`;
      const plistUrl = `${INSTALLER_WORKER_URL}/?plist=true&ipa=${encodeURIComponent(localIpaUrl)}&name=${encodeURIComponent(app.name)}&bundle=${encodeURIComponent(signResult.bundleId || (app as any).bundleId || 'com.ipaviet.app')}&icon=${encodeURIComponent(app.iconUrl)}&version=1.0`;
      const directInstallUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;

      if (bgMode) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Ký App Thành Công!',
              body: `Ứng dụng "${app.name}" đã được ký xong. Bấm vào đây để cài đặt trực tiếp.`,
              sound: true,
              data: { installUrl: directInstallUrl },
            },
            trigger: null,
          });
        } catch (e) { }
      }

      Linking.openURL(directInstallUrl);
      setTimeout(() => setDownloadState('CÀI ĐẶT'), 3000);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Quá trình cài đặt thất bại.');
      setDownloadState('LỖI, THỬ LẠI');
    }
  };

  // Header title fade animation on scroll
  const navTitleOpacity = scrollY.interpolate({
    inputRange: [50, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const capsuleBgOpacity = scrollY.interpolate({
    inputRange: [50, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (!app) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <SpatialBackdrop />
        <ActivityIndicator size="large" color={T.cyan} />
      </View>
    );
  }

  const isVipApp = app.id.startsWith('vip_') || app.sub.includes('VIP') || app.sub.includes('Độc Quyền');

  return (
    <View style={styles.container}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <RNStatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />

      {/* Spatial Ambient Background */}
      <SpatialBackdrop />

      {/* Dynamic Floating Navigation Header */}
      <Animated.View
        style={[
          styles.topBarCapsule,
          {
            opacity: topCapsuleOpacity,
            transform: [{ translateY: topCapsuleY }],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Full Capsule Bar Background (Fades in smoothly when scrolled) */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.topBarGlassInner, { opacity: capsuleBgOpacity }]} />

        {/* Header Content Row */}
        <View style={styles.topBarInner}>
          <TouchableOpacity
            style={styles.navBackBtn}
            onPress={() => router.back()}
            onPressIn={() => Animated.spring(backBtnScale, { toValue: 0.88, ...T.spring }).start()}
            onPressOut={() => Animated.spring(backBtnScale, { toValue: 1, ...T.spring }).start()}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: backBtnScale }] }}>
              <ChevronLeft size={22} color={styles.navTitleText.color} strokeWidth={2.5} />
            </Animated.View>
          </TouchableOpacity>

          <Animated.View style={[styles.navTitleWrap, { opacity: navTitleOpacity }]}>
            <Image source={{ uri: app.iconUrl }} style={styles.navTitleIcon} />
            <Text style={styles.navTitleText} numberOfLines={1}>
              {app.name}
            </Text>
          </Animated.View>

          <View style={styles.navRightWrap}>
            {isVipApp ? (
              <View style={styles.vipTagNav}>
                <Sparkles size={11} color={T.gold} />
                <Text style={styles.vipTagNavText}>VIP</Text>
              </View>
            ) : (
              <View style={styles.freeTagNav}>
                <Text style={styles.freeTagNavText}>FREE</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={1}
      >
        {/* HERO SPOTLIGHT HEADER */}
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            {/* 3D App Icon */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={() => Animated.timing(iconRotate, { toValue: 1, duration: 200, useNativeDriver: true }).start()}
              onPressOut={() => Animated.timing(iconRotate, { toValue: 0, duration: 300, useNativeDriver: true }).start()}
            >
              <Animated.View
                style={[
                  styles.iconWrap,
                  {
                    shadowColor: isVipApp ? T.gold : T.cyan,
                    opacity: iconOpacity,
                    transform: [
                      { scale: iconScale },
                      {
                        rotateZ: iconRotate.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '-6deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image source={{ uri: app.iconUrl }} style={styles.heroIcon} />
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.05)', 'transparent']}
                  locations={[0, 0.4, 1]}
                  style={styles.iconReflection}
                />
              </Animated.View>
            </TouchableOpacity>

            {/* Title & Developer Info */}
            <Animated.View
              style={[
                styles.heroMeta,
                { opacity: heroMetaOpacity, transform: [{ translateY: heroMetaY }] },
              ]}
            >
              <Text style={styles.heroTitle} numberOfLines={2}>
                {app.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                <Text style={styles.heroDeveloper} numberOfLines={1}>
                  {app.developer || app.sub}
                </Text>
                <CheckCircle2 size={13} color={T.cyan} strokeWidth={2.5} />
              </View>

              {/* Main Action Pill Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleSecureDownload}
                onPressIn={() => Animated.spring(downloadBtnScale, { toValue: 0.94, ...T.spring }).start()}
                onPressOut={() => Animated.spring(downloadBtnScale, { toValue: 1, ...T.spring }).start()}
                style={styles.actionBtnWrap}
              >
                <Animated.View style={[styles.actionBtn, { transform: [{ scale: downloadBtnScale }] }]}>
                  <LinearGradient
                    colors={isVipApp ? [T.gold, '#FFA500'] : [T.cyan, T.violet]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <View style={styles.actionBtnInner}>
                    {downloadState !== 'CÀI ĐẶT' && downloadState !== 'LỖI, THỬ LẠI' && downloadState !== 'Hoàn tất!' ? (
                      <ActivityIndicator size="small" color={isVipApp ? T.void : T.void} style={{ marginRight: 6 }} />
                    ) : (
                      <Download size={15} color={T.void} strokeWidth={2.5} style={{ marginRight: 6 }} />
                    )}
                    <Text style={[styles.actionBtnText, isVipApp && { color: T.void }]}>
                      {downloadState}
                    </Text>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Security Badge */}
          <View style={styles.securityRow}>
            <ShieldCheck size={13} color={T.cyan} strokeWidth={2} />
            <Text style={styles.securityText}>Bảo Mật Ký IPA Trực Tiếp • Không QC</Text>
          </View>
        </View>

        {/* SPATIAL STATS CHIP CARD */}
        <Animated.View
          style={[
            styles.statsContainer,
            { opacity: statsOpacity, transform: [{ translateY: statsY }, { scale: statsScale }] },
          ]}
        >
          <LiquidGlass intensity="strong">
            <View style={styles.statsRow}>
              {/* Stat 1: Rating */}
              <View style={styles.statChip}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={styles.statVal}>{app.rating || '4.9'}</Text>
                  <Star size={12} color={T.amber} fill={T.amber} />
                </View>
                <Text style={styles.statLbl}>ĐÁNH GIÁ</Text>
              </View>

              <View style={styles.statSep} />

              {/* Stat 2: Size */}
              <View style={styles.statChip}>
                <Text style={styles.statVal} numberOfLines={1}>
                  {app.size || '120 MB'}
                </Text>
                <Text style={styles.statLbl}>DUNG LƯỢNG</Text>
              </View>

              <View style={styles.statSep} />

              {/* Stat 3: Category */}
              <View style={styles.statChip}>
                <Text style={styles.statVal} numberOfLines={1}>
                  {app.category || 'Tiện ích'}
                </Text>
                <Text style={styles.statLbl}>THỂ LOẠI</Text>
              </View>

              <View style={styles.statSep} />

              {/* Stat 4: License */}
              <View style={styles.statChip}>
                <Text style={[styles.statVal, { color: isVipApp ? T.gold : T.cyan }]}>
                  {isVipApp ? 'VIP' : 'MIỄN PHÍ'}
                </Text>
                <Text style={styles.statLbl}>ĐẶC QUYỀN</Text>
              </View>
            </View>
          </LiquidGlass>
        </Animated.View>

        {/* SCREENSHOTS CAROUSEL */}
        <Animated.View
          style={[
            styles.sectionWrap,
            { opacity: screenshotsOpacity, transform: [{ translateX: screenshotsX }] },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Layers size={16} color={T.cyan} strokeWidth={2} />
            <Text style={styles.sectionTitle}>HÌNH ÁNH ỨNG DỤNG</Text>
          </View>

          {isFetchingApple ? (
            <ActivityIndicator color={T.cyan} style={{ marginTop: 24 }} />
          ) : app.screenshots && app.screenshots.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.screenshotScroll}
              decelerationRate="fast"
              snapToInterval={245}
            >
              {app.screenshots.map((img: string, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.9}
                  onPress={() => setActiveScreenshotIndex(idx)}
                >
                  <LiquidGlass intensity="normal" style={styles.screenshotBox}>
                    <Image source={{ uri: img }} style={styles.screenshotImg} resizeMode="cover" />
                  </LiquidGlass>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <LiquidGlass intensity="subtle" style={styles.noScreenshotBox}>
              <Text style={styles.noScreenshotText}>Xem chi tiết giao diện khi cài đặt</Text>
            </LiquidGlass>
          )}
        </Animated.View>

        {/* BODY & MOD FEATURES */}
        <Animated.View style={{ opacity: bodyOpacity, transform: [{ translateY: bodyTranslateY }] }}>
          {/* TÍNH NĂNG MOD & VIP */}
          {app.modFeatures ? (
            <View style={styles.sectionWrap}>
              <LiquidGlass intensity={isVipApp ? 'strong' : 'normal'} style={styles.modGlassBox}>
                <LinearGradient
                  colors={isVipApp ? ['rgba(255,215,0,0.12)', 'transparent'] : ['rgba(0,229,255,0.12)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Zap size={18} color={isVipApp ? T.gold : T.cyan} fill={isVipApp ? T.gold : T.cyan} />
                  <Text style={[styles.modTitle, { color: isVipApp ? T.gold : T.cyan }]}>
                    TÍNH NĂNG MOD & ĐẶC QUYỀN VIP
                  </Text>
                </View>
                <Text style={styles.modText}>{app.modFeatures}</Text>
              </LiquidGlass>
            </View>
          ) : null}

        {/* DESCRIPTION & AI TRANSLATION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Info size={16} color={T.cyan} />
              <Text style={styles.sectionTitle}>MÔ TẢ ỨNG DỤNG</Text>
            </View>

            <TouchableOpacity style={styles.translateBtn} onPress={handleTranslateToggle} activeOpacity={0.8}>
              {isTranslating ? (
                <ActivityIndicator size="small" color={T.cyan} />
              ) : (
                <>
                  <Globe size={13} color={T.cyan} />
                  <Text style={styles.translateBtnText}>
                    {showTranslated ? 'Gốc' : 'Dịch Tiếng Việt'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <LiquidGlass intensity="subtle" style={{ padding: 18, marginTop: 10 }}>
            <Text style={styles.descText} numberOfLines={isDescExpanded ? undefined : 4}>
              {showTranslated && translatedDesc ? translatedDesc : app.description || 'Không có mô tả chi tiết.'}
            </Text>

            <TouchableOpacity onPress={() => setIsDescExpanded(!isDescExpanded)} style={styles.moreBtn}>
              <Text style={styles.moreBtnText}>{isDescExpanded ? 'Thu gọn' : 'Xem thêm'}</Text>
            </TouchableOpacity>
          </LiquidGlass>
        </View>

        {/* METADATA GRID */}
        <View style={[styles.sectionWrap, { marginBottom: 40 }]}>
          <View style={styles.sectionHeader}>
            <Info size={16} color={T.textSecondary} />
            <Text style={styles.sectionTitle}>THÔNG TIN KỸ THUẬT</Text>
          </View>

          <LiquidGlass intensity="subtle" style={{ padding: 18, marginTop: 10, gap: 14 }}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Nhà phát triển</Text>
              <Text style={styles.metaVal}>{app.developer || 'IPAVIET Repository'}</Text>
            </View>
            <View style={styles.metaSep} />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Phiên bản</Text>
              <Text style={styles.metaVal}>{app.version || '1.0'}</Text>
            </View>
            <View style={styles.metaSep} />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Khả dụng</Text>
              <Text style={styles.metaVal}>iOS 14.0 trở lên</Text>
            </View>
            <View style={styles.metaSep} />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Nguồn tải</Text>
              <Text style={styles.metaVal}>{isVipApp ? 'Github VIP CDN' : 'AppTesters Mirror'}</Text>
            </View>
          </LiquidGlass>
        </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* SCREENSHOT LIGHTBOX MODAL */}
      <Modal visible={activeScreenshotIndex !== null} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.fullscreenOverlay}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.95 }]}>
            <LinearGradient colors={['rgba(0,0,0,0.95)', 'rgba(5,5,8,0.98)']} style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseModal} />
          </Animated.View>

          <TouchableOpacity style={styles.closeModalBtn} activeOpacity={0.8} onPress={handleCloseModal}>
            <X size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {activeScreenshotIndex !== null && app.screenshots && app.screenshots.length > 0 && (
            <Animated.View
              style={[
                styles.fullscreenWrapper,
                { transform: [{ translateY: modalTranslateY }, { scale: modalScale }] },
              ]}
            >
              <FlatList
                data={app.screenshots}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={activeScreenshotIndex}
                onScrollToIndexFailed={() => { }}
                getItemLayout={(data, idx) => ({
                  length: SCREEN_W,
                  offset: SCREEN_W * idx,
                  index: idx,
                })}
                renderItem={({ item }) => (
                  <View style={styles.fullscreenImgWrapper}>
                    <Image source={{ uri: item }} style={styles.fullscreenImg} resizeMode="contain" />
                  </View>
                )}
              />
            </Animated.View>
          )}
        </View>
      </Modal>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — iOS 26 Liquid Glass Detail Geometry & Light/Dark Theme
   ═══════════════════════════════════════════════════════════════ */
const getStyles = (theme: typeof COLORS, isLight: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  auroraBlob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: isLight ? 0.3 : 0.8,
    ...(Platform.OS === 'web' ? { filter: 'blur(100px)' } : {}),
  },

  // Navigation
  topBarCapsule: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 32,
    left: 18,
    right: 18,
    zIndex: 200,
    shadowColor: isLight ? 'rgba(0,0,0,0.1)' : T.cyan,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  topBarGlassInner: {
    borderRadius: T.radius.full,
    borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,229,255,0.25)',
    borderWidth: 1,
    backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(10,10,16,0.75)',
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: isLight ? '#FFFFFF' : 'rgba(18,20,32,0.85)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  navTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '55%',
  },
  navTitleIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: isLight ? '#F4F4F6' : T.depth3,
  },
  navTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
  },
  navRightWrap: {
    width: 44,
    alignItems: 'flex-end',
  },
  vipTagNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radius.full,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  vipTagNavText: {
    fontSize: 10,
    fontWeight: '900',
    color: T.gold,
  },
  freeTagNav: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radius.full,
    backgroundColor: isLight ? 'rgba(0,82,255,0.08)' : 'rgba(0,229,255,0.10)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,82,255,0.18)' : 'rgba(0,229,255,0.20)',
  },
  freeTagNavText: {
    fontSize: 9,
    fontWeight: '900',
    color: isLight ? '#0052FF' : T.cyan,
    letterSpacing: 0.5,
  },

  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 116 : 98,
    paddingBottom: 100,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 24,
    position: 'relative',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  heroIcon: {
    width: 104,
    height: 104,
    borderRadius: 24,
    backgroundColor: isLight ? '#F4F4F6' : T.depth3,
  },
  iconReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  heroMeta: {
    flex: 1,
    marginLeft: 18,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  heroDeveloper: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '600',
  },
  actionBtnWrap: {
    marginTop: 14,
  },
  actionBtn: {
    height: 40,
    borderRadius: T.radius.full,
    overflow: 'hidden',
    shadowColor: isLight ? 'rgba(0,82,255,0.3)' : T.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 20,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.8,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  securityText: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '600',
  },

  // Stats Card
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
    borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: T.radius.lg,
  },
  statChip: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
  },
  statLbl: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.textMuted,
    marginTop: 4,
    letterSpacing: 1,
  },
  statSep: {
    width: 1,
    height: 24,
    backgroundColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
  },

  // Sections
  sectionWrap: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textMuted,
    letterSpacing: 1,
  },

  // Screenshots
  screenshotScroll: {
    gap: 14,
    paddingRight: 20,
  },
  screenshotBox: {
    width: 235,
    height: 410,
    borderRadius: T.radius.lg,
    overflow: 'hidden',
  },
  screenshotImg: {
    width: '100%',
    height: '100%',
  },
  noScreenshotBox: {
    padding: 24,
    alignItems: 'center',
    marginTop: 6,
  },
  noScreenshotText: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '500',
  },

  // Mod Box
  modGlassBox: {
    padding: 18,
    borderRadius: T.radius.lg,
    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
  },
  modTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modText: {
    fontSize: 14,
    color: theme.textMuted,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Description
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radius.full,
    backgroundColor: isLight ? 'rgba(0,82,255,0.08)' : 'rgba(0,229,255,0.08)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,82,255,0.18)' : 'rgba(0,229,255,0.18)',
  },
  translateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: isLight ? '#0052FF' : T.cyan,
  },
  descText: {
    fontSize: 14,
    color: theme.textMuted,
    lineHeight: 22,
    fontWeight: '500',
  },
  moreBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  moreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: isLight ? '#0052FF' : T.cyan,
  },

  // Metadata Grid
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '700',
  },
  metaSep: {
    height: 1,
    backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)',
  },

  // Lightbox Modal
  fullscreenOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 32,
    alignSelf: 'center',
    zIndex: 120,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  closeModalBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 46 : 26,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 130,
  },
  fullscreenWrapper: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImgWrapper: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImg: {
    width: SCREEN_W * 0.85,
    height: SCREEN_H * 0.72,
    borderRadius: 24,
  },
});
