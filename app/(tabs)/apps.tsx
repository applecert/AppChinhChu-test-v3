import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Alert,
  TextInput,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { fetchRegularApps, AppItem } from '../../constants/data';
import { COLORS, useThemeUpdate, loadFpsMode, saveFpsMode, FpsMode } from '../../constants/theme';
import { AppleButton } from '../../components/ui/AppleButton';
import {
  Search,
  X,
  Layers,
  Gamepad2,
  MessageCircle,
  PlaySquare,
  Wand2,
  Wrench,
  Download,
  Star,
  ChevronRight,
  Zap,
  Box,
  Flame,
  Sparkles,
  Orbit,
} from 'lucide-react-native';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 18;
const GAP = 14;
const COL2_W = (SCREEN_W - PAD * 2 - GAP) / 2;

/* ═══════════════════════════════════════════════════════════════
   IPAVIET OS 2026 DESIGN SYSTEM — Performance & Apple HIG Theme
   ═══════════════════════════════════════════════════════════════ */
const T = {
  void: '#000000',
  depth1: '#1C1C1E',
  depth2: '#2C2C2E',
  depth3: '#3A3A3C',
  cardBg: '#1C1C1E',
  cyan: '#0A84FF',
  violet: '#5E5CE6',
  rose: '#FF3B30',
  amber: '#FF9F0A',
  emerald: '#30D158',
  blue: '#0A84FF',
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.6)',
  textTertiary: 'rgba(235,235,245,0.3)',
  radius: { sm: 8, md: 12, lg: 16, xl: 22, full: 999 },
};

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: Layers, color: T.cyan },
  { id: 'game', label: 'Trò chơi', icon: Gamepad2, color: T.rose },
  { id: 'social', label: 'Social', icon: MessageCircle, color: T.violet },
  { id: 'media', label: 'Giải trí', icon: PlaySquare, color: T.amber },
  { id: 'edit', label: 'Sáng tạo', icon: Wand2, color: T.emerald },
  { id: 'utility', label: 'Tiện ích', icon: Wrench, color: T.blue },
];

/* ═══════════════════════════════════════════════════════════════
   FAST ULTRA-SMOOTH APP CARD
   ═══════════════════════════════════════════════════════════════ */
interface AppCardProps {
  item: AppItem;
  index: number;
  isLight: boolean;
  styles: any;
  onPress: (id: string) => void;
  onGetPress: (item: AppItem) => void;
}

const AppCard = memo(({ item, index, isLight, styles, onPress, onGetPress }: AppCardProps) => {
  const isFirstBatch = index < 8;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(isFirstBatch ? 0 : 1)).current;

  useEffect(() => {
    if (!isFirstBatch) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      delay: (index % 8) * 25,
      useNativeDriver: true,
    }).start();
  }, []);

  const pressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const pressOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  const accentColor = isLight ? '#0052FF' : T.cyan;

  return (
    <Animated.View
      style={[
        { width: COL2_W, marginBottom: GAP },
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => onPress(item.id)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.cardContainer}
      >
        <View style={{ padding: 14, flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={styles.iconBox}>
              <Image source={{ uri: item.iconUrl }} style={styles.iconImg} resizeMode="cover" />
            </View>

            <View style={styles.freeBadge}>
              <Sparkles size={9} color={accentColor} />
              <Text style={styles.freeBadgeText}>MIỄN PHÍ</Text>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={styles.appName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 }}>
              <Text style={styles.appCat} numberOfLines={1}>
                {item.category || item.sub || 'Tiện ích'}
              </Text>
              {item.rating && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Star size={10} color={T.amber} fill={T.amber} />
                  <Text style={{ fontSize: 11, color: T.amber, fontWeight: '700' }}>
                    {item.rating}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <AppleButton
              title="NHẬN"
              variant="pill"
              size="small"
              onPress={() => onGetPress(item)}
              isLight={isLight}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   SKELETON CARD
   ═══════════════════════════════════════════════════════════════ */
const SkeletonCard = memo(({ styles }: { styles: any }) => {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[styles.cardContainer, { width: COL2_W, height: 196, marginBottom: GAP }]}>
      <View style={{ padding: 14, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Animated.View style={[styles.skelIcon, { opacity }]} />
          <Animated.View style={[styles.skelPill, { width: 54, height: 18, opacity }]} />
        </View>
        <View style={{ marginTop: 6 }}>
          <Animated.View style={[styles.skelLine, { width: '80%', opacity }]} />
          <Animated.View style={[styles.skelLine, { width: '50%', marginTop: 6, opacity }]} />
        </View>
        <Animated.View style={[styles.skelPill, { width: '100%', height: 34, opacity }]} />
      </View>
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   CATEGORY PILL
   ═══════════════════════════════════════════════════════════════ */
const CategoryPill = memo(({ item, active, isLight, styles, onPress }: any) => {
  const Icon = item.icon;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }, [onPress]);

  const activeBg = isLight ? '#000000' : '#FFFFFF';
  const activeFg = isLight ? '#FFFFFF' : '#000000';
  const inactiveBg = isLight ? 'rgba(118, 118, 128, 0.12)' : 'rgba(118, 118, 128, 0.24)';
  const inactiveFg = isLight ? '#3C3C43' : 'rgba(235, 235, 245, 0.8)';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <View
        style={[
          styles.catPill,
          {
            backgroundColor: active ? activeBg : inactiveBg,
            borderColor: 'transparent',
            borderRadius: 18,
            paddingVertical: 7,
            paddingHorizontal: 14,
          },
        ]}
      >
        <Icon size={13} color={active ? activeFg : inactiveFg} strokeWidth={active ? 2.5 : 1.8} />
        <Text style={[styles.catText, { color: active ? activeFg : inactiveFg, fontWeight: active ? '700' : '500' }]}>{item.label}</Text>
      </View>
    </TouchableOpacity>
  );
});

/* ═══════════════════════════════════════════════════════════════
   HERO BANNER
   ═══════════════════════════════════════════════════════════════ */
const HeroBanner = memo(({ item, isLight, styles, onPress }: { item: AppItem | null; isLight: boolean; styles: any; onPress: (id: string) => void }) => {
  if (!item) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item.id)}
      style={{ marginBottom: GAP * 1.5, marginHorizontal: PAD, marginTop: 8 }}
    >
      <View style={[styles.heroContainer, { backgroundColor: isLight ? '#FFFFFF' : '#1C1C1E', borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
        <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.heroIconWrap}>
            <Image source={{ uri: item.iconUrl }} style={styles.heroIcon} resizeMode="cover" />
          </View>

          <View style={{ flex: 1, marginLeft: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Flame size={14} color="#FF9F0A" />
              <Text style={[styles.heroTag, { color: '#FF9F0A' }]}>NỔI BẬT</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.heroSub} numberOfLines={2}>{item.category || 'Ứng dụng nổi bật'}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 }}>
              <View style={[styles.heroBtn, { backgroundColor: isLight ? '#000000' : '#FFFFFF' }]}>
                <Text style={[styles.heroBtnText, { color: isLight ? '#FFFFFF' : '#000000' }]}>Khám phá</Text>
                <ChevronRight size={14} color={isLight ? '#FFFFFF' : '#000000'} strokeWidth={3} />
              </View>
              {item.rating && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star size={12} color={T.amber} fill={T.amber} />
                  <Text style={{ color: T.amber, fontSize: 13, fontWeight: '800' }}>{item.rating}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

/* ═══════════════════════════════════════════════════════════════
   SEARCH FIELD
   ═══════════════════════════════════════════════════════════════ */
const SearchField = memo(({ value, isLight, styles, onChangeText, onClear }: any) => (
  <View style={{ paddingHorizontal: PAD, marginTop: 12, marginBottom: 12 }}>
    <View style={[styles.searchBar, { backgroundColor: isLight ? 'rgba(118, 118, 128, 0.12)' : 'rgba(118, 118, 128, 0.24)', borderRadius: 10, borderWidth: 0, height: 38 }]}>
      <Search size={15} color={isLight ? '#8E8E93' : 'rgba(235, 235, 245, 0.6)'} strokeWidth={2} />
      <TextInput
        style={[styles.searchInput, { fontSize: 14 }]}
        placeholder="Tìm kiếm ứng dụng, game..."
        placeholderTextColor={isLight ? '#8E8E93' : 'rgba(235, 235, 245, 0.5)'}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        selectionColor={isLight ? '#007AFF' : '#0A84FF'}
      />
      {value !== '' && (
        <TouchableOpacity onPress={onClear} style={{ padding: 4 }}>
          <View style={styles.clearCircle}>
            <X size={12} color={isLight ? '#8E8E93' : '#FFFFFF'} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  </View>
));

/* ═══════════════════════════════════════════════════════════════
   MAIN SCREEN — KHO IPA
   ═══════════════════════════════════════════════════════════════ */
export default function AppsScreen() {
  useThemeUpdate();
  const router = useRouter();
  const isLight = COLORS.background === '#F4F4F6';
  const styles = getStyles(COLORS, isLight);

  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [featuredApp, setFeaturedApp] = useState<AppItem | null>(null);
  const [fpsMode, setFpsMode] = useState<FpsMode>('120fps');

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadFpsMode().then(setFpsMode);
  }, []);

  const toggleFps = useCallback(async () => {
    const next = fpsMode === '120fps' ? '60fps' : '120fps';
    setFpsMode(next);
    await saveFpsMode(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert(
      next === '120fps' ? '⚡ 120 FPS ProMotion' : '🔋 60 FPS Standard',
      next === '120fps' ? 'Đã bật chế độ 120Hz ProMotion!' : 'Đã bật chế độ 60Hz Tiết Kiệm Pin.'
    );
  }, [fpsMode]);

  useEffect(() => {
    let mounted = true;
    fetchRegularApps().then((data) => {
      if (!mounted) return;
      setApps(data);
      setFeaturedApp(data[0] || null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => {
      const text = `${app.name} ${app.sub || ''} ${app.category || ''}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filter === 'all') return true;
      const cat = (app.category || '').toLowerCase();
      switch (filter) {
        case 'game': return cat.includes('trò chơi') || cat.includes('game');
        case 'social': return cat.includes('mạng xã hội') || cat.includes('social');
        case 'media': return cat.includes('giải trí') || cat.includes('music') || cat.includes('media');
        case 'edit': return cat.includes('sáng tạo') || cat.includes('photo') || cat.includes('edit');
        case 'utility': return cat.includes('tiện ích') || cat.includes('utility') || cat.includes('tool');
        default: return true;
      }
    });
  }, [apps, filter, query]);

  const handleCardPress = useCallback((id: string) => {
    router.push(`/details/${id}`);
  }, [router]);

  const handleGetPress = useCallback(async (item: AppItem) => {
    if (!auth.currentUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Yêu cầu Đăng nhập', 'Sếp cần đăng nhập tài khoản trước nhé!', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng nhập ngay', onPress: () => router.push('/account') },
      ]);
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const vip = snap.data().vipExpire;
        const ms = vip?.toMillis ? vip.toMillis() : vip?.seconds ? vip.seconds * 1000 : Number(vip) || 0;
        if (ms > Date.now()) return router.push(`/details/${item.id}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Đặc Quyền VIP', 'Để tải ứng dụng siêu mượt không quảng cáo, Sếp vui lòng nâng cấp gói VIP nhé!', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Nâng Cấp Ngay', onPress: () => router.push('/buy-vip') },
      ]);
    } catch {
      Alert.alert('Lỗi', 'Không thể xác thực. Vui lòng thử lại.');
    }
  }, [router]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [90, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslate = scrollY.interpolate({
    inputRange: [90, 160],
    outputRange: [-24, 0],
    extrapolate: 'clamp',
  });

  const renderItem = useCallback(
    ({ item, index }: { item: AppItem; index: number }) => (
      <AppCard item={item} index={index} isLight={isLight} styles={styles} onPress={handleCardPress} onGetPress={handleGetPress} />
    ),
    [handleCardPress, handleGetPress, isLight, styles]
  );

  const keyExtractor = useCallback((item: AppItem) => item.id, []);

  const accentColor = isLight ? '#0052FF' : T.cyan;

  return (
    <View style={styles.root}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <RNStatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />

      {/* Floating Header Capsule */}
      <Animated.View
        style={[
          styles.headerCapsule,
          { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.capsuleBlurWrap}>
          <BlurView intensity={30} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.capsuleIcon}>
                <Box size={16} color={accentColor} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.capsuleTitle}>Kho IPA</Text>
                <Text style={styles.capsuleSub} numberOfLines={1}>
                  {filter === 'all' ? 'Tất cả ứng dụng' : CATEGORIES.find((c) => c.id === filter)?.label} ({filtered.length})
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.fpsPill} onPress={toggleFps} activeOpacity={0.8}>
              <Zap size={11} color={fpsMode === '120fps' ? accentColor : COLORS.textMuted} />
              <Text style={[styles.fpsText, { color: fpsMode === '120fps' ? accentColor : COLORS.textMuted }]}>
                {fpsMode === '120fps' ? '120 FPS' : '60 FPS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={loading ? [] : filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: PAD }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        updateCellsBatchingPeriod={30}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            {/* Top Brand Header */}
            <View style={styles.brandHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.brandIconBox}>
                    <Box size={22} color={accentColor} strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={styles.brandTag}>IPAVIET OS</Text>
                    <Text style={styles.brandTitle}>iOS 26 Edition</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.topFpsBadge} onPress={toggleFps} activeOpacity={0.8}>
                  <Zap size={12} color={fpsMode === '120fps' ? accentColor : COLORS.textMuted} strokeWidth={2.5} />
                  <Text style={[styles.topFpsText, { color: fpsMode === '120fps' ? accentColor : COLORS.textMuted }]}>
                    {fpsMode === '120fps' ? '120 FPS' : '60 FPS'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.pageHeading}>Kho IPA</Text>
              <Text style={styles.pageSubheading}>Kho ứng dụng cao cấp đã ký sẵn dành riêng cho bạn</Text>
            </View>

            {/* Search Field */}
            <SearchField value={query} isLight={isLight} styles={styles} onChangeText={setQuery} onClear={() => setQuery('')} />

            {/* Category Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: PAD, gap: 8, paddingBottom: 16 }}
            >
              {CATEGORIES.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  item={cat}
                  active={filter === cat.id}
                  isLight={isLight}
                  styles={styles}
                  onPress={() => setFilter(cat.id)}
                />
              ))}
            </ScrollView>

            {/* Featured Hero Banner */}
            {!loading && filter === 'all' && !query && featuredApp && (
              <HeroBanner item={featuredApp} isLight={isLight} styles={styles} onPress={handleCardPress} />
            )}

            {/* Section Header */}
            {!loading && filtered.length > 0 && (
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Zap size={16} color={accentColor} />
                  <Text style={styles.sectionTitle}>
                    {filter === 'all' ? 'Khám phá' : CATEGORIES.find((c) => c.id === filter)?.label}
                  </Text>
                </View>
                <Text style={styles.sectionCount}>{filtered.length} ứng dụng</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: PAD }}>
                <SkeletonCard styles={styles} />
                <SkeletonCard styles={styles} />
              </View>
              <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: PAD }}>
                <SkeletonCard styles={styles} />
                <SkeletonCard styles={styles} />
              </View>
              <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: PAD }}>
                <SkeletonCard styles={styles} />
                <SkeletonCard styles={styles} />
              </View>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Orbit size={56} color={COLORS.textMuted} strokeWidth={1.2} />
              <Text style={styles.emptyTitle}>Không tìm thấy</Text>
              <Text style={styles.emptySub}>Thử từ khóa khác hoặc đổi danh mục</Text>
            </View>
          )
        }
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — Dynamic Theme Engine
   ═══════════════════════════════════════════════════════════════ */
const getStyles = (theme: typeof COLORS, isLight: boolean) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  headerCapsule: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: PAD,
    right: PAD,
    zIndex: 200,
  },
  capsuleBlurWrap: {
    borderRadius: T.radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
    backgroundColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(18, 20, 32, 0.75)',
  },
  capsuleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isLight ? 'rgba(0,82,255,0.08)' : 'rgba(0,240,255,0.12)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,82,255,0.18)' : 'rgba(0,240,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.3,
  },
  capsuleSub: {
    fontSize: 11,
    color: isLight ? '#0052FF' : T.cyan,
    fontWeight: '700',
  },
  fpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.radius.full,
    backgroundColor: isLight ? 'rgba(0,82,255,0.08)' : 'rgba(0,240,255,0.12)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,82,255,0.18)' : 'rgba(0,240,255,0.25)',
  },
  fpsText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandHeader: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingHorizontal: PAD,
    marginBottom: 4,
  },
  brandIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: isLight ? 'rgba(0,82,255,0.08)' : 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,82,255,0.18)' : 'rgba(0,240,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTag: {
    fontSize: 11,
    fontWeight: '800',
    color: isLight ? '#0052FF' : T.cyan,
    letterSpacing: 2.5,
  },
  brandTitle: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  topFpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: isLight ? 'rgba(0, 82, 255, 0.08)' : 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0, 82, 255, 0.2)' : 'rgba(0, 240, 255, 0.3)',
  },
  topFpsText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pageHeading: {
    fontSize: 40,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -1.5,
    marginTop: 16,
  },
  pageSubheading: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  searchBar: {
    height: 50,
    borderRadius: T.radius.full,
    backgroundColor: isLight ? '#FFFFFF' : T.cardBg,
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  clearCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: T.radius.full,
    backgroundColor: isLight ? '#FFFFFF' : T.cardBg,
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
  },
  catText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textMuted,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 2,
  },
  heroContainer: {
    borderRadius: T.radius.xl,
    backgroundColor: isLight ? '#FFFFFF' : T.cardBg,
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  heroIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: isLight ? '#F4F4F6' : T.depth3,
    overflow: 'hidden',
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 18,
  },
  heroTag: {
    fontSize: 11,
    fontWeight: '800',
    color: T.rose,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isLight ? '#0F172A' : T.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: T.radius.full,
  },
  heroBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: isLight ? '#FFFFFF' : T.void,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  sectionCount: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 140,
  },
  cardContainer: {
    borderRadius: T.radius.lg,
    backgroundColor: isLight ? '#FFFFFF' : T.cardBg,
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
    height: 196,
    overflow: 'hidden',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  iconImg: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radius.full,
    backgroundColor: isLight ? 'rgba(0,82,255,0.08)' : 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: isLight ? 'rgba(0,82,255,0.18)' : 'rgba(0,240,255,0.18)',
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: isLight ? '#0052FF' : T.cyan,
  },
  appName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.3,
  },
  appCat: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: '600',
  },
  getBtn: {
    height: 34,
    borderRadius: T.radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  getBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.8,
  },
  skelIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
  },
  skelPill: {
    borderRadius: T.radius.full,
    backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: theme.textMuted,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 20,
  },
  emptySub: {
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});