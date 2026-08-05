import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Dimensions, Animated, LayoutAnimation, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router'; 
import { GlassView } from '../components/ui/GlassView';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SVG TỪ LUCIDE
import { 
  Fingerprint, User, Mail, Lock, BellRing, Star, Gem, ChevronRight, 
  CloudDownload, Clock, ShieldCheck, Languages, Palette, X, Database, 
  HelpCircle, MessageSquare, FileText, Shield, Instagram, Facebook, 
  Share2, RefreshCw, Film, Bot
} from 'lucide-react-native';

import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithCredential, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS, TXT, useThemeUpdate, THEME_STYLES } from '../constants/theme';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';

WebBrowser.maybeCompleteAuthSession();

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

const { width } = Dimensions.get('window');
const GOOGLE_SHEET_WEBHOOK = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const ADMIN_EMAIL = "mquitran@gmail.com"; 

interface UserData { fullname?: string; email?: string; coins?: number; vipExpire?: any; }

export default function AccountScreen() {
  useThemeUpdate();
  const router = useRouter(); 
  const navigateFromModal = (targetPath: string) => {
    router.back();
    setTimeout(() => {
      router.push(targetPath as any);
    }, 120);
  };
  const isLight = COLORS.background === '#F4F4F6';
  const styles = getStyles(COLORS, isLight);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sysPopup, setSysPopup] = useState({ show: false, msg: '' });
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  
  const [captchaState, setCaptchaState] = useState<'idle' | 'checking' | 'interactive' | 'success'>('idle');
  const captchaTimeoutRef = useRef<any>(null);
  
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const toggleRegisterMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsRegisterMode(!isRegisterMode);
  };

  useEffect(() => {
    let unsubDoc: any;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        try { WebBrowser.dismissAuthSession(); } catch (e) {}
        setGoogleModalVisible(false);
        
        // Match account.html web logic: Create user Firestore doc if missing
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            email: user.email || '',
            username: user.displayName || user.email?.split('@')[0] || 'Hội Viên Mới',
            coins: 0,
            createdAt: new Date(),
          });
        }

        unsubDoc = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) setUserData(snap.data() as UserData);
          },
          (err) => console.warn('[Account Snapshot Warning]:', err?.message || err)
        );
        const snapConfig = await getDoc(doc(db, 'settings', 'config'));
        if (snapConfig.exists() && snapConfig.data().showPopup) setSysPopup({ show: true, msg: snapConfig.data().popupMsg });
      } else {
        setIsLoggedIn(false); setUserData(null);
        if (unsubDoc) unsubDoc();
      }
      setIsLoading(false);
    });
    return () => { 
      unsubscribeAuth(); 
      if (unsubDoc) unsubDoc(); 
      if (captchaTimeoutRef.current) clearTimeout(captchaTimeoutRef.current);
    };
  }, []);

  const turnstileHtml = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: transparent;
        }
      </style>
  </head>
  <body>
      <div class="cf-turnstile" 
           data-sitekey="0x4AAAAAADuG_qcsGlFOiiqT" 
           data-callback="onTurnstileSuccess"
           data-expired-callback="onTurnstileExpired"
           data-error-callback="onTurnstileError"
           data-theme="${isLight ? 'light' : 'dark'}"></div>
  
      <script>
          function onTurnstileSuccess(token) {
              if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', token: token }));
              }
          }
          function onTurnstileExpired() {
              if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
              }
          }
          function onTurnstileError() {
              if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
              }
          }
      </script>
  </body>
  </html>
  `;

  const registerWithCaptcha = async (captchaToken: string) => {
    console.log("[Register] Starting registration with captcha token:", captchaToken.substring(0, 15) + "...");
    setIsLoading(true);
    try {
      const payload = {
        email: email.trim(),
        password: password,
        username: fullname.trim() || email.split('@')[0],
        captchaToken: captchaToken,
        captchaType: "turnstile",
      };
      console.log("[Register] Sending payload:", JSON.stringify(payload));
      
      const response = await fetch("https://www.ipaviet.site/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("[Register] Response status:", response.status);
      const responseText = await response.text();
      console.log("[Register] Response text:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error("[Register] Failed to parse JSON response:", jsonErr);
        throw new Error("Invalid server response format");
      }

      if (response.ok && result.success) {
        console.log("[Register] Success! Signing in with Firebase...");
        await signInWithEmailAndPassword(auth, email, password);
        console.log("[Register] Firebase sign in completed.");
        fetch(GOOGLE_SHEET_WEBHOOK, { method: 'POST', body: JSON.stringify({ email, action: "Tạo Tài Khoản", amount: "0", status: "Thành công" }) }).catch((e)=>{
          console.error("[Register] Webhook error:", e);
        });
      } else {
        console.log("[Register] Failed on server:", result.message);
        Alert.alert(TXT.errorLabel, result.message || (TXT.langName === 'English' ? 'Registration failed!' : 'Đăng ký thất bại!'));
      }
    } catch (error: any) {
      console.error("[Register] Caught error during registration:", error);
      Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? `Network error or registration service is offline. Details: ${error?.message || error}` : `Lỗi kết nối mạng hoặc dịch vụ đăng ký đang ngoại tuyến. Chi tiết: ${error?.message || error}`);
    } finally {
      console.log("[Register] Done, setting isLoading to false.");
      setIsLoading(false);
      setCaptchaState('idle');
    }
  };

  const handleCaptchaMessage = async (event: any) => {
    try {
      // Check if it's a valid JSON string (our Turnstile script returns stringified JSON)
      const data = JSON.parse(event.nativeEvent.data);
      console.log("[Register] Captcha event received:", data.type);
      
      if (data.type === 'success' && data.token) {
        if (captchaTimeoutRef.current) {
          clearTimeout(captchaTimeoutRef.current);
          captchaTimeoutRef.current = null;
        }
        setCaptchaState('success');
        await registerWithCaptcha(data.token);
      } else if (data.type === 'expired') {
        if (captchaTimeoutRef.current) {
          clearTimeout(captchaTimeoutRef.current);
          captchaTimeoutRef.current = null;
        }
        setCaptchaState('idle');
        setIsLoading(false);
        Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'Verification token expired. Please try again.' : 'Mã xác thực đã hết hạn, vui lòng thử lại.');
      } else if (data.type === 'error') {
        if (captchaTimeoutRef.current) {
          clearTimeout(captchaTimeoutRef.current);
          captchaTimeoutRef.current = null;
        }
        setCaptchaState('idle');
        setIsLoading(false);
        Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'CAPTCHA verification failed. Please try again.' : 'Xác thực CAPTCHA thất bại, vui lòng thử lại.');
      }
    } catch (err) {
      // Ignore messages from Turnstile's internal iframe calls that aren't JSON
      console.log("[Register] Non-JSON message from WebView ignored:", event.nativeEvent.data?.substring(0, 50) + "...");
    }
  };

  const handleAuth = async () => {
    if (!email || !password || (isRegisterMode && !fullname)) return Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'Please fill in all fields!' : 'Vui lòng nhập đủ thông tin!');
    
    // Tactile animation scale down & up
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isRegisterMode) {
        if (captchaTimeoutRef.current) clearTimeout(captchaTimeoutRef.current);
        console.log("[Register] Initializing background Turnstile verification...");
        setCaptchaState('checking');
        
        captchaTimeoutRef.current = setTimeout(() => {
          console.log("[Register] Turnstile did not resolve passively within 2.5s. Showing interactive Modal.");
          setCaptchaState('interactive');
        }, 2500);
      } else {
        console.log("[Login] Signing in with email:", cleanEmail);
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        console.log("[Login] Firebase auth success!");
        Alert.alert("Thành Công", "Đăng nhập thành công!");
      }
    } catch (error: any) {
      console.error("[Login Error]:", error?.code, error?.message);
      let msg = error?.message || 'Đăng nhập không thành công!';
      if (error?.code === 'auth/invalid-email') msg = 'Email không đúng định dạng!';
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential') msg = 'Email hoặc mật khẩu không chính xác!';
      if (error?.code === 'auth/wrong-password') msg = 'Mật khẩu không chính xác!';
      if (error?.code === 'auth/too-many-requests') msg = 'Tài khoản bị tạm khóa do thử sai nhiều lần. Vui lòng thử lại sau 1 phút!';
      if (error?.code === 'auth/network-request-failed') msg = 'Lỗi kết nối mạng!';
      Alert.alert(TXT.errorLabel, msg);
    } finally {
      if (!isRegisterMode) setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        const { signInWithPopup } = require('firebase/auth');
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        Alert.alert("Thành Công", "Đăng nhập Google thành công!");
      } else {
        const redirectUrl = Linking.createURL('/account');
        const authUrl = `https://ipaviet.site/login-app.html?redirect_uri=${encodeURIComponent(redirectUrl)}`;
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          const token = (parsed.queryParams?.idToken || parsed.queryParams?.token) as string;
          if (token) {
            try {
              const credential = GoogleAuthProvider.credential(token);
              await signInWithCredential(auth, credential);
              Alert.alert("Thành Công", "Đăng nhập Google thành công!");
            } catch (credError: any) {
              try {
                await signInWithCustomToken(auth, token);
                Alert.alert("Thành Công", "Đăng nhập Google thành công!");
              } catch (customErr) {
                console.error("Token auth failed:", customErr);
                Alert.alert("Lỗi", "Không thể xác thực token Google.");
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("[Google Sign-In Error]:", error);
      Alert.alert(
        TXT.errorLabel,
        TXT.langName === 'English'
          ? 'Google Sign-In failed: ' + (error?.message || error)
          : 'Đăng nhập Google thất bại: ' + (error?.message || error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(TXT.confirmLogoutTitle, TXT.confirmLogoutMsg, [{ text: TXT.cancelBtn, style: 'cancel' }, { text: TXT.confirmExit, style: 'destructive', onPress: async () => { setIsLoading(true); await signOut(auth); setPassword(''); }}]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      TXT.langName === 'English' ? 'Delete Account' : 'Xóa tài khoản',
      TXT.langName === 'English' ? 'WARNING: This action is permanent and cannot be undone!' : 'CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn tài khoản của bạn và không thể khôi phục!',
      [
        { text: TXT.cancelBtn, style: 'cancel' },
        { 
          text: TXT.langName === 'English' ? 'Delete' : 'Xóa', 
          style: 'destructive', 
          onPress: async () => {
            setIsLoading(true);
            try {
              if (auth.currentUser) {
                await setDoc(doc(db, 'users', auth.currentUser.uid), {}, { merge: false });
                await auth.currentUser.delete();
                Alert.alert(TXT.successLabel, TXT.langName === 'English' ? 'Account deleted successfully!' : 'Đã xóa tài khoản thành công!');
              }
            } catch (error: any) {
              Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'Failed to delete account. Please log in again.' : 'Không thể xóa tài khoản. Vui lòng đăng nhập lại.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const getVipMillis = () => {
    if (!userData?.vipExpire) return 0;
    if (typeof userData.vipExpire.toMillis === 'function') return userData.vipExpire.toMillis();
    if (userData.vipExpire.seconds) return userData.vipExpire.seconds * 1000;
    return Number(userData.vipExpire) || 0;
  };

  const vipMillis = getVipMillis();
  const isVipActive = vipMillis > Date.now();

  const getVipRemainingDays = () => {
    if (!isVipActive) return TXT.noVipStatus;
    const diff = vipMillis - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + TXT.daysRemaining;
  };

  const renderRow = (IconComponent: any, title: string, value?: string, color: string = '#8E8E93', isLast: boolean = false, isExternal: boolean = false, onPress?: () => void) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.iconBox}><IconComponent color={color} size={18} strokeWidth={2.2} /></View>
      <View style={[styles.rowContent, !isLast && styles.rowBorder]}>
         <Text style={styles.rowTitle}>{title}</Text>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
           {value && <Text style={styles.rowValue}>{value}</Text>}
           <ChevronRight color={COLORS.textMuted} size={16} style={{ transform: [{ rotate: isExternal ? '-45deg' : '0deg' }] }} />
         </View>
      </View>
    </TouchableOpacity>
  );

  const getFirstLetter = (name?: string) => {
    if (!name) return 'K';
    return name.charAt(0).toUpperCase();
  };

  if (isLoading && !isLoggedIn && !email) {
    return (
      <LinearGradient colors={COLORS.bgGradient} style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  if (!isLoggedIn) {
    return (
      <LinearGradient colors={COLORS.bgGradient} style={styles.gradientContainer}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authContainer}>
           <StatusBar style={isLight ? 'dark' : 'light'} />
           
           {/* BACK/CLOSE BUTTON */}
           <TouchableOpacity 
             style={{
               position: 'absolute',
               top: Platform.OS === 'ios' ? 60 : 30,
               right: 20,
               width: 36,
               height: 36,
               borderRadius: 18,
               backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
               justifyContent: 'center',
               alignItems: 'center',
               zIndex: 9999,
               borderWidth: 0.8,
               borderColor: COLORS.border,
             }} 
             activeOpacity={0.7} 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
            >
             <X color={COLORS.text} size={20} />
           </TouchableOpacity>

           <View style={[styles.authBox, SHADOWS.glowDark]}>
              <GlassView intensity={25} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
              <View style={styles.authBoxInside}>
                <View style={[styles.authLogo, SHADOWS.glowBlue]}><Fingerprint color={COLORS.primary} size={42} strokeWidth={2} /></View>
                <Text style={styles.authTitle}>{isRegisterMode ? TXT.authTitleRegister : TXT.authTitleLogin}</Text>
                <Text style={styles.authSub}>{TXT.cloudSystemSub}</Text>
                
                {isRegisterMode && (
                  <View style={styles.inputWrap}>
                    <User color={COLORS.textMuted} size={20} style={styles.inputIcon}/>
                    <TextInput style={styles.input} placeholder={TXT.fullnamePlaceholder} placeholderTextColor={COLORS.textMuted} value={fullname} onChangeText={setFullname} />
                  </View>
                )}
                <View style={styles.inputWrap}>
                  <Mail color={COLORS.textMuted} size={20} style={styles.inputIcon}/>
                  <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
                </View>
                <View style={styles.inputWrap}>
                  <Lock color={COLORS.textMuted} size={20} style={styles.inputIcon}/>
                  <TextInput style={styles.input} placeholder={TXT.passwordPlaceholder} placeholderTextColor={COLORS.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
                </View>
                
                <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
                  <TouchableOpacity 
                    style={styles.authBtn} 
                    activeOpacity={0.9} 
                    onPress={handleAuth} 
                    disabled={isLoading}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  >
                    <LinearGradient colors={COLORS.primaryGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.authBtnGradient}>
                      {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnText}>{isRegisterMode ? TXT.registerBtnText : TXT.loginBtnText}</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* DIVIDER */}
                <View style={styles.authDividerRow}>
                  <View style={styles.authDividerLine} />
                  <Text style={styles.authDividerText}>
                    {TXT.langName === 'English' ? 'OR' : 'HOẶC'}
                  </Text>
                  <View style={styles.authDividerLine} />
                </View>

                {/* GOOGLE SIGN-IN BUTTON */}
                <TouchableOpacity
                  style={styles.googleBtn}
                  activeOpacity={0.85}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <View style={styles.googleIconBox}>
                    <GoogleLogo size={20} />
                  </View>
                  <Text style={styles.googleBtnText}>
                    {TXT.langName === 'English' ? 'Continue with Google' : 'Đăng nhập bằng Google'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={{marginTop: 20}} onPress={toggleRegisterMode}>
                  <Text style={styles.authSwitchText}>{isRegisterMode ? TXT.switchLoginText : TXT.switchRegisterText}</Text>
                </TouchableOpacity>
              </View>
           </View>
        </KeyboardAvoidingView>
        
        {/* BACKGROUND CAPTCHA CHECKING WIDGET */}
        {captchaState === 'checking' && (
          <View style={{ position: 'absolute', top: -1000, left: -1000, width: 302, height: 67, overflow: 'hidden' }}>
            <WebView
              originWhitelist={['*']}
              source={{ html: turnstileHtml, baseUrl: 'https://www.ipaviet.site' }}
              style={{ width: 302, height: 67, backgroundColor: 'transparent' }}
              onMessage={handleCaptchaMessage}
              onError={() => {
                console.log("[Register] Background CAPTCHA widget failed to load.");
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scalesPageToFit={false}
              scrollEnabled={false}
              mixedContentMode="always"
            />
          </View>
        )}

        {/* CLOUDFLARE TURNSTILE CAPTCHA MODAL */}
        <Modal visible={captchaState === 'interactive'} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={[styles.modalBox, SHADOWS.glowDark, { padding: 20, width: '90%', maxWidth: 350 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 }}>
                <Text style={[styles.modalTitle, { marginBottom: 0, fontSize: 18 }]}>
                  {TXT.langName === 'English' ? 'Security Verification' : 'Xác minh bảo mật'}
                </Text>
                <TouchableOpacity onPress={() => {
                  if (captchaTimeoutRef.current) clearTimeout(captchaTimeoutRef.current);
                  setCaptchaState('idle');
                  setIsLoading(false);
                }}>
                  <X color={COLORS.textMuted} size={20} />
                </TouchableOpacity>
              </View>
              
              <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 15 }}>
                {TXT.langName === 'English' 
                  ? 'Please complete the verification below to proceed.' 
                  : 'Vui lòng hoàn thành xác minh bên dưới để tiếp tục.'}
              </Text>

              <View style={{ width: 302, height: 67, overflow: 'hidden', borderRadius: 8, backgroundColor: 'transparent', alignSelf: 'center', marginBottom: 10 }}>
                {captchaState === 'interactive' && (
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: turnstileHtml, baseUrl: 'https://www.ipaviet.site' }}
                    style={{ width: 302, height: 67, backgroundColor: 'transparent' }}
                    onMessage={handleCaptchaMessage}
                    onError={() => {
                      Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'Failed to load CAPTCHA widget.' : 'Không thể tải widget CAPTCHA.');
                      setCaptchaState('idle');
                      setIsLoading(false);
                    }}
                    javaScriptEnabled={true}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* GOOGLE SIGN-IN STANDALONE WEBVIEW MODAL FOR MOBILE APP */}
        <Modal visible={googleModalVisible} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ width: '100%', height: '86%', backgroundColor: isLight ? '#FFFFFF' : '#0F172A', borderRadius: 24, overflow: 'hidden', borderWidth: 0.8, borderColor: COLORS.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.8, borderBottomColor: COLORS.border }}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800' }}>
                  {TXT.langName === 'English' ? 'Google Sign-In' : 'Đăng nhập bằng Google'}
                </Text>
                <TouchableOpacity onPress={() => setGoogleModalVisible(false)} style={{ padding: 6 }}>
                  <X color={COLORS.textMuted} size={22} />
                </TouchableOpacity>
              </View>
              <WebView
                originWhitelist={['*']}
                source={{
                  html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                      <script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js"></script>
                      <script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-auth-compat.js"></script>
                      <style>
                        body {
                          margin: 0;
                          padding: 0;
                          display: flex;
                          flex-direction: column;
                          justify-content: center;
                          align-items: center;
                          height: 100vh;
                          background-color: ${isLight ? '#FFFFFF' : '#0F172A'};
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          color: ${isLight ? '#111' : '#FFF'};
                        }
                        .btn-google {
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          gap: 12px;
                          background-color: ${isLight ? '#F4F4F6' : 'rgba(255,255,255,0.08)'};
                          color: ${isLight ? '#111' : '#FFF'};
                          border: 1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'};
                          padding: 14px 24px;
                          border-radius: 16px;
                          font-size: 15px;
                          font-weight: 700;
                          cursor: pointer;
                          width: 80%;
                          max-width: 300px;
                        }
                        .status-msg {
                          margin-top: 15px;
                          font-size: 13px;
                          color: #888;
                        }
                      </style>
                  </head>
                  <body>
                      <div id="btnContainer">
                        <button class="btn-google" onclick="startGoogleAuth()">
                          <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                          Bấm để kết nối Google
                        </button>
                      </div>
                      <p class="status-msg" id="statusText">Đang khởi tạo xác thực Google...</p>

                      <script>
                        const firebaseConfig = {
                          apiKey: "AIzaSyBJ9UhdejvlE-cOBdeOIHCIl8pgSbUTwgs",
                          authDomain: "ipaviet-st.firebaseapp.com",
                          projectId: "ipaviet-st",
                          storageBucket: "ipaviet-st.firebasestorage.app",
                          messagingSenderId: "127619650916",
                          appId: "1:127619650916:web:fc8904c99804eeb7539671"
                        };
                        firebase.initializeApp(firebaseConfig);
                        const auth = firebase.auth();

                        async function startGoogleAuth() {
                          const status = document.getElementById('statusText');
                          status.innerText = "Đang mở cửa sổ Google Auth...";
                          const provider = new firebase.auth.GoogleAuthProvider();
                          try {
                            const res = await auth.signInWithPopup(provider);
                            if (res && res.user && window.ReactNativeWebView) {
                              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'google_success', uid: res.user.uid }));
                            }
                          } catch (err) {
                            console.error(err);
                            if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                              auth.signInWithRedirect(provider);
                            } else {
                              let msg = err.message || err;
                              if (err.code === 'auth/unauthorized-domain') {
                                msg = "Tên miền chưa được ủy quyền trong Firebase Console. Vui lòng thêm localhost/domain vào Authorized Domains.";
                              } else if (err.code === 'auth/operation-not-allowed') {
                                msg = "Google Sign-In chưa được bật trong Firebase Auth Console. Vui lòng bật Google Provider.";
                              }
                              status.innerText = "Lỗi: " + msg;
                            }
                          }
                        }
                        setTimeout(startGoogleAuth, 400);
                      </script>
                  </body>
                  `,
                  baseUrl: 'http://localhost'
                }}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                thirdPartyCookiesEnabled={true}
                sharedCookiesEnabled={true}
                userAgent={
                  Platform.OS === 'android'
                    ? 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                }
              />
            </View>
          </View>
        </Modal>
      </LinearGradient>
    );
  }

  const workspaceName = `${userData?.fullname || 'Khách'}'s Workspace`;

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <Modal visible={sysPopup.show} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalBox, SHADOWS.glowDark]}>
            <BellRing color={COLORS.warning} size={60} strokeWidth={1.5} style={{marginBottom: 10}}/>
            <Text style={styles.modalTitle}>{TXT.systemNotificationTitle}</Text>
            <Text style={styles.modalMsg}>{sysPopup.msg}</Text>
            <TouchableOpacity style={styles.modalBtn} activeOpacity={0.8} onPress={() => setSysPopup({show: false, msg: ''})}><Text style={styles.modalBtnText}>{TXT.understoodBtn}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TOP CLOSE BUTTON */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <X color={COLORS.text} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* CENTER PROFILE HEADER */}
        <View style={styles.profileHeaderSection}>
          <View style={[styles.avatarWrapper, SHADOWS.glowCard, { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
            <LinearGradient
              colors={COLORS.primaryGradient}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: 36, 
              fontWeight: '800', 
              fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' 
            }}>
              {getFirstLetter(userData?.fullname || userData?.email)}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.workspacePill} activeOpacity={0.8}>
            <View style={styles.workspaceLetterBadge}>
              <Text style={styles.workspaceLetter}>{getFirstLetter(userData?.fullname || userData?.email)}</Text>
            </View>
            <Text style={styles.workspaceText} numberOfLines={1}>{workspaceName}</Text>
            <ChevronRight color={COLORS.textMuted} size={12} style={{ transform: [{ rotate: '90deg' }], marginLeft: 2 }} />
          </TouchableOpacity>

          <Text style={styles.profileName}>{userData?.fullname || TXT.customerGuest}</Text>
          <Text style={styles.profileEmail}>{userData?.email}</Text>
          
          <Text style={styles.creditsText}>• {(userData?.coins ?? 0).toLocaleString('vi-VN')} credits</Text>
        </View>

        {/* MODERN UPGRADE CARD */}
        <View style={[styles.upgradeCard, SHADOWS.glowCard]}>
          {/* Top Gradient Box */}
          <LinearGradient 
            colors={['#FF4B2B', '#FF416C', '#8A2387']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={styles.upgradeGradientBg}
          >
            <View style={styles.creatorPill}>
              <Text style={styles.creatorPillText}>{isVipActive ? 'VIP Member' : 'Creator'}</Text>
            </View>
          </LinearGradient>
          
          {/* Upgrade Content Info */}
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeTitle}>
              {isVipActive ? TXT.vipExtend : TXT.vipUpgrade}
            </Text>
            <Text style={styles.upgradeDesc}>
              {isVipActive 
                ? `VIP của sếp còn lại ${getVipRemainingDays()}. Hãy gia hạn để duy trì đặc quyền tải tốc độ cao!`
                : 'Mở khóa kho ứng dụng Độc quyền, Ký file IPA ngoại tuyến và tải trực tiếp qua OTA tốc độ cực đại!'
              }
            </Text>
            
            <TouchableOpacity 
              style={styles.upgradeBlackBtn} 
              activeOpacity={0.85} 
              onPress={() => navigateFromModal('/buy-vip')}
            >
              <Text style={styles.upgradeBlackBtnText}>{isVipActive ? 'Gia hạn gói' : 'Nâng cấp ngay'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ACCOUNT INFO GROUP */}
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            <View style={styles.detailRow}>
              <View style={styles.detailRowLabelGroup}>
                <Mail color="#8E8E93" size={18} strokeWidth={2.2} />
                <Text style={styles.detailRowLabel}>Email</Text>
              </View>
              <Text style={styles.detailRowValue} numberOfLines={1}>{userData?.email}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailRowLabelGroup}>
                <User color="#8E8E93" size={18} strokeWidth={2.2} />
                <Text style={styles.detailRowLabel}>Tên hiển thị</Text>
              </View>
              <Text style={styles.detailRowValue} numberOfLines={1}>{userData?.fullname || TXT.customerGuest}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailRowLabelGroup}>
                <Gem color="#8E8E93" size={18} strokeWidth={2.2} />
                <Text style={styles.detailRowLabel}>Gói hiện tại</Text>
              </View>
              <Text style={[styles.detailRowValue, isVipActive && { color: COLORS.gold, fontWeight: '700' }]}>
                {isVipActive ? 'VIP Pro' : 'Free Plan'}
              </Text>
            </View>
          </View>
        </View>

        {/* SETTINGS ACTIONS GROUP */}
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            {renderRow(Bot, 'Trợ Lý IPAVIET AI 24/7', 'Tư vấn & Ký App', isLight ? '#0052FF' : '#00F0FF', false, false, () => {
              navigateFromModal('/ai-support');
            })}
            <View style={styles.divider} />
            {renderRow(RefreshCw, 'Restore purchases', undefined, '#8E8E93', false, false, () => {
              Alert.alert('Khôi phục giao dịch', 'Giao dịch mua của sếp đã được đồng bộ tự động với hệ thống iCloud.');
            })}
            <View style={styles.divider} />
            {renderRow(Share2, 'Share to Explore', undefined, '#8E8E93', false, false, () => {
              Alert.alert('Chia sẻ ứng dụng', 'Cảm ơn sếp đã ủng hộ ứng dụng AppChinhChu!');
            })}
            <View style={styles.divider} />
            {renderRow(Database, 'Data controls', undefined, '#8E8E93', true, false, () => {
              navigateFromModal('/settings');
            })}
          </View>
        </View>

        {/* SYSTEM SETTINGS & UTILITIES */}
        <Text style={styles.sectionTitle}>HỆ THỐNG & TIỆN ÍCH</Text>
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            {renderRow(Palette, TXT.setupThemeRow, TXT.openLabel, '#8E8E93', false, false, () => navigateFromModal('/settings'))}
            <View style={styles.divider} />
            {process.env.EXPO_PUBLIC_APP_TYPE === 'movie' && (
              <>
                {renderRow(Film, 'Rạp phim online', 'VPhim', '#FFB822', false, false, () => navigateFromModal('/movie'))}
                <View style={styles.divider} />
              </>
            )}
            {renderRow(CloudDownload, TXT.cloudStorage, '5 GB', '#8E8E93', false, false)}
            <View style={styles.divider} />
            {renderRow(Clock, TXT.history, TXT.langName === 'English' ? 'Lookup' : 'Tra cứu', '#8E8E93', true, false)}
          </View>
        </View>

        {/* FAQ, TERMS AND EXTERNAL LINKS */}
        <Text style={styles.sectionTitle}>TÀI LIỆU & PHÁP LÝ</Text>
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            {renderRow(HelpCircle, 'Frequently asked questions', undefined, '#8E8E93', false, true, () => Linking.openURL('https://t.me/mqui_dev'))}
            <View style={styles.divider} />
            {renderRow(MessageSquare, 'Give feedback', undefined, '#8E8E93', false, true, () => Linking.openURL('https://t.me/mqui_dev'))}
            <View style={styles.divider} />
            {renderRow(FileText, 'Terms of Service', undefined, '#8E8E93', false, true, () => Linking.openURL('https://t.me/mqui_dev'))}
            <View style={styles.divider} />
            {renderRow(Shield, 'Privacy Policy', undefined, '#8E8E93', true, true, () => Linking.openURL('https://t.me/mqui_dev'))}
          </View>
        </View>

        {/* SOCIAL LINKS */}
        <Text style={styles.sectionTitle}>MẠNG XÃ HỘI</Text>
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            {renderRow(Instagram, 'Instagram', undefined, '#8E8E93', false, true, () => Linking.openURL('https://instagram.com/'))}
            <View style={styles.divider} />
            {renderRow(Facebook, 'Facebook', undefined, '#8E8E93', false, true, () => Linking.openURL('https://facebook.com/'))}
            <View style={styles.divider} />
            {renderRow(MessageSquare, 'Discord', undefined, '#8E8E93', true, true, () => Linking.openURL('https://discord.com/'))}
          </View>
        </View>

        {/* ADMIN AREA */}
        {process.env.EXPO_PUBLIC_APP_TYPE === 'admin' && userData?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
          <>
            <Text style={styles.sectionTitle}>{TXT.adminArea.toUpperCase()}</Text>
            <View style={[styles.groupCard, SHADOWS.glowCard]}>
              <View style={styles.groupInside}>
                {renderRow(ShieldCheck, TXT.adminArea, TXT.langName === 'English' ? 'Required PIN' : 'Yêu cầu PIN', '#FF453A', true, false, () => navigateFromModal('/admin'))}
              </View>
            </View>
          </>
        )}

        {/* EXIT BUTTONS */}
        <View style={styles.exitActionsContainer}>
          <TouchableOpacity style={styles.logoutRowBtn} activeOpacity={0.7} onPress={handleLogout}>
            <Text style={styles.logoutRowText}>{TXT.logout}</Text>
          </TouchableOpacity>
          <View style={styles.exitDivider} />
          <TouchableOpacity style={styles.deleteRowBtn} activeOpacity={0.7} onPress={handleDeleteAccount}>
            <Text style={styles.deleteRowText}>Delete account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

function getStyles(theme: typeof COLORS, isLight: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gradientContainer: { flex: 1 },
    
    // Top Close Button Header
    topBar: {
      paddingTop: Platform.OS === 'ios' ? 50 : 30,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: 70,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 0.8,
      borderColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 160, paddingTop: 10 },
    
    // Profile Header Section
    profileHeaderSection: {
      alignItems: 'center',
      marginBottom: 25,
    },
    avatarWrapper: {
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 3,
      borderColor: '#FFFFFF',
      overflow: 'hidden',
      backgroundColor: '#E5E5EA',
      marginBottom: 12,
    },
    avatar: { width: '100%', height: '100%' },
    
    workspacePill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 30,
      borderRadius: 15,
      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
      borderWidth: 0.8,
      borderColor: theme.border,
      paddingLeft: 6,
      paddingRight: 10,
      marginBottom: 12,
    },
    workspaceLetterBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#5856D6',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 6,
    },
    workspaceLetter: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    workspaceText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
      maxWidth: 150,
    },
    
    profileName: { 
      color: theme.text, 
      fontSize: 24, 
      fontWeight: '800', 
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    profileEmail: { 
      color: theme.textMuted, 
      fontSize: 14, 
      marginBottom: 10,
    },
    creditsText: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },

    // Modern Upgrade Card
    upgradeCard: {
      backgroundColor: theme.surfaceSolid,
      borderRadius: SIZES.radiusCard,
      overflow: 'hidden',
      borderWidth: 0.8,
      borderColor: theme.border,
      marginBottom: 25,
    },
    upgradeGradientBg: {
      height: 110,
      justifyContent: 'center',
      alignItems: 'center',
    },
    creatorPill: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    creatorPillText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#000000',
      letterSpacing: 0.2,
    },
    upgradeContent: {
      padding: 20,
      alignItems: 'center',
    },
    upgradeTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 6,
    },
    upgradeDesc: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 18,
      textAlign: 'center',
      marginBottom: 16,
    },
    upgradeBlackBtn: {
      backgroundColor: '#0E0E10',
      width: '100%',
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },
    upgradeBlackBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    // Group cards (white/light grey containers)
    groupCard: {
      borderRadius: SIZES.radiusCard,
      borderWidth: 0.8,
      borderColor: theme.border,
      backgroundColor: theme.surfaceSolid,
      overflow: 'hidden',
      marginBottom: 20,
    },
    groupInside: {
      paddingLeft: 16,
    },

    // Detail rows (Email, Name, Current Plan)
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 15,
      paddingRight: 16,
    },
    detailRowLabelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailRowLabel: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
    },
    detailRowValue: {
      color: theme.textMuted,
      fontSize: 14,
      fontWeight: '500',
      maxWidth: '60%',
    },

    // Settings actions rows
    row: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingRight: 16 },
    rowBorder: { borderBottomWidth: 0.8, borderBottomColor: theme.border },
    rowTitle: { color: theme.text, fontSize: 14, fontWeight: '600' },
    rowValue: { color: theme.textMuted, fontSize: 13, marginRight: 6 },
    divider: { height: 0.8, backgroundColor: theme.border },

    // Sections
    sectionTitle: { 
      color: theme.textMuted, 
      fontSize: 10, 
      fontWeight: '800', 
      marginLeft: 15, 
      marginBottom: 8, 
      marginTop: 15, 
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },

    // Exit rows at bottom
    exitActionsContainer: {
      borderRadius: SIZES.radiusCard,
      borderWidth: 0.8,
      borderColor: theme.border,
      backgroundColor: theme.surfaceSolid,
      overflow: 'hidden',
      marginTop: 20,
      paddingLeft: 16,
    },
    logoutRowBtn: {
      paddingVertical: 16,
      justifyContent: 'center',
    },
    logoutRowText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '700',
    },
    exitDivider: {
      height: 0.8,
      backgroundColor: theme.border,
    },
    deleteRowBtn: {
      paddingVertical: 16,
      justifyContent: 'center',
    },
    deleteRowText: {
      color: '#FF3B30',
      fontSize: 14,
      fontWeight: '700',
    },
    
    // Auth screens
    authContainer: { flex: 1, justifyContent: 'center', padding: 16 },
    authBox: { borderRadius: SIZES.radiusSquircle, borderWidth: 0.8, borderColor: isLight ? 'rgba(0,0,0,0.08)' : theme.border, overflow: 'hidden', backgroundColor: isLight ? '#FFFFFF' : theme.surfaceCard },
    authBoxInside: { padding: 30, alignItems: 'center' },
    authLogo: { width: 80, height: 80, borderRadius: 24, backgroundColor: isLight ? 'rgba(0, 82, 255, 0.08)' : 'rgba(255, 255, 255, 0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    authTitle: { color: theme.text, fontSize: 28, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
    authSub: { color: theme.textMuted, fontSize: 14, marginBottom: 25 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#F4F4F6' : 'rgba(255,255,255,0.05)', borderRadius: SIZES.radiusButton, height: 54, marginBottom: 15, paddingHorizontal: 15, borderWidth: 0.8, borderColor: isLight ? 'rgba(0,0,0,0.08)' : theme.border },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: theme.text, fontSize: 16, height: '100%' },
    authBtn: { width: '100%', height: 54, borderRadius: SIZES.radiusButton, overflow: 'hidden', marginTop: 10 },
    authBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    authBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    authDividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, width: '100%' },
    authDividerLine: { flex: 1, height: 0.8, backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : theme.border },
    authDividerText: { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginHorizontal: 12, letterSpacing: 1 },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: 52,
      borderRadius: SIZES.radiusButton,
      backgroundColor: isLight ? '#F4F4F6' : 'rgba(255, 255, 255, 0.08)',
      borderWidth: 0.8,
      borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)',
    },
    googleIconBox: { marginRight: 10 },
    googleBtnText: { color: theme.text, fontSize: 15, fontWeight: '700' },
    authSwitchText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
    
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalBox: { backgroundColor: theme.surfaceSolid, width: '100%', borderRadius: SIZES.radiusSquircle, padding: 30, alignItems: 'center', borderWidth: 0.8, borderColor: theme.border },
    modalTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 15 },
    modalMsg: { color: theme.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 25 },
    modalBtn: { backgroundColor: theme.gold, width: '100%', paddingVertical: 14, borderRadius: SIZES.radiusButton, alignItems: 'center' },
    modalBtnText: { color: '#000', fontSize: 16, fontWeight: '800' }
  });
}