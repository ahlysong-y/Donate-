import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  Animated,
  Linking,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

interface ImpactItem {
  min: number;
  text: string;
}

const IMPACT_MAP: ImpactItem[] = [
  { min: 1, text: '💥 On-Screen Alert + Khmer TTS voice reading your gamer tag & message.' },
  { min: 5, text: '☕ Buys the streamer a coffee/energy drink for the late-night grind.' },
  { min: 10, text: '🎯 In-Game Challenge! Request hero, weapon, or play style on stream.' },
  { min: 25, text: '⭐ VIP Supporter Badge + special sound effect on stream.' },
  { min: 50, text: '🔥 Sponsor a 12-Hour Stream Marathon + personal shoutout.' },
  { min: 100, text: '👑 Legend Supporter Hall of Fame permanently on stream overlay!' },
];

const QUICK_CHEERS = [
  '🔥 GG WP! លេងកប់',
  '💪 ស៊ូៗបង ស៊ីមាន់!',
  '☕ ទិញកាហ្វេ 1 កែវ',
  '🎯 Challenge 1 គូ',
  '🚀 ឡើង Rank Mythic',
  '👑 MVP Streamer',
];

const BANK_DETAILS = {
  bankAccName: 'AHLYSONG',
  bankAccNum: 'ACLEDA KHQR',
  bankName: 'ACLEDA Bank / Bakong KHQR',
};

interface SocialLink {
  id: string;
  name: string;
  handle: string;
  url: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'SOENG Bun Song',
    url: 'https://www.facebook.com/share/1B3mWHPucD/',
    color: '#1877f2',
    bgColor: '#f0f6ff',
    borderColor: '#cce0ff',
    icon: 'logo-facebook',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    handle: 'Channel',
    url: 'https://t.me/+oSDwct4_FtA0YTll',
    color: '#229ed9',
    bgColor: '#f0f9ff',
    borderColor: '#bfe7fc',
    icon: 'paper-plane',
  },
  {
    id: 'discord',
    name: 'Discord',
    handle: 'Community',
    url: 'https://discord.gg/BVJRfz6zc',
    color: '#5865f2',
    bgColor: '#f3f4fe',
    borderColor: '#d5d7fc',
    icon: 'logo-discord',
  },
];

export default function DonationScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const donateCardRef = useRef<View>(null);

  // Donation State
  const [frequency, setFrequency] = useState<'once' | 'monthly'>('once');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [amount, setAmount] = useState<number>(25);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');

  // Form State
  const [name, setName] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [youtubeError, setYoutubeError] = useState<string>('');

  // Payment Method State (Bank transfer only)
  const paymentMethod = 'bank';

  // UI / Copy States
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  // Ching Chang (Shin-chan) Voice Style State
  const [voiceStyle, setVoiceStyle] = useState<'chingchang' | 'normal'>('chingchang');
  // Auto Payment Detection State (Option A)
  const waitingPaymentRef = useRef<boolean>(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Audio Refs for Natural Khmer Voice
  const soundRef = useRef<Audio.Sound | null>(null);
  const webAudioRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const handleOpenSocial = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Could not open social URL:', url, error);
    }
  };

  // Impact message resolver
  const getImpactMessage = () => {
    let msg = IMPACT_MAP[0].text;
    for (const item of IMPACT_MAP) {
      if (amount >= item.min) {
        msg = item.text;
      }
    }
    const prefix = frequency === 'monthly' ? 'Every month: ' : '';
    return prefix + msg.charAt(0).toLowerCase() + msg.slice(1);
  };

  // Preset Selection
  const handleSelectPreset = (presetVal: number) => {
    setSelectedPreset(presetVal);
    setAmount(presetVal);
    setCustomAmountStr('');
    setAmountError('');
  };

  // Custom Amount Handler
  const handleCustomAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setCustomAmountStr(cleaned);
    setSelectedPreset(null);
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
      setAmountError('');
    } else {
      setAmount(0);
    }
  };



  // Extract YouTube ID
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const m = url.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    return m ? m[1] : null;
  };

  const youtubeId = getYouTubeId(youtubeUrl.trim());

  // Copy to clipboard
  const handleCopy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1500);
  };

  // 1-Tap Quick Cheer Handler
  const handleSelectQuickCheer = (cheerText: string) => {
    setMessage((prev) => {
      if (!prev.trim()) return cheerText;
      if (prev.includes(cheerText)) return prev;
      return `${prev.trim()} ${cheerText}`;
    });
  };

  // Instant Open ACLEDA Mobile App
  const handleOpenAcledaApp = async () => {
    waitingPaymentRef.current = true;
    try {
      const acledaUrl = 'acledamobile://';
      const canOpen = await Linking.canOpenURL(acledaUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(acledaUrl);
      } else {
        await handleCopy('acc', BANK_DETAILS.bankAccNum);
        alert(
          'បាន Copy ព័ត៌មានកុង ACLEDA: ' +
          BANK_DETAILS.bankAccNum +
          ' រួចរាល់! ពេលបងផ្ទេររួចត្រឡប់មក AHLYSUNG វិញ វានឹង Auto លោត Alert ជូនភ្លាម។'
        );
      }
    } catch {
      await handleCopy('acc', BANK_DETAILS.bankAccNum);
    }
  };

  // Sequential TTS announcement:
  // 1. ដំបូង អានឈ្មោះអ្នក Donate (First: Donor Name)
  // 2. បន្ទាប់មក ប្រាប់ចំនួនទឹកប្រាក់ដែល donate មក (Next: Amount Donated)
  // 3. ហើយបាន អាន Message ដើម្បីបញ្ចប់ (Finally: Message to finish)
  // Sequential TTS announcement:
  // 1. ដំបូង អានឈ្មោះអ្នក Donate (Donor Name)
  // 2. បន្ទាប់មក ប្រាប់ចំនួនទឹកប្រាក់ដែល donate មក (Amount Donated)
  // 3. ហើយបាន អាន Message ដោយផ្ទាល់ មិនបាច់និយាយ Message ទេ (Just read the message directly)
  const stopAllAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) { }

    if (Platform.OS === 'web' && webAudioRef.current) {
      try {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      } catch (e) { }
    }

    try {
      Speech.stop();
    } catch (e) { }

    setIsSpeaking(false);
  };

  // លេងសំឡេងខ្មែរ (Khmer Voice with Ching Chang playful tone or Standard tone)
  const playNaturalKhmerVoice = async (
    text: string,
    onDone?: () => void,
    forceChingChang?: boolean
  ) => {
    await stopAllAudio();
    setIsSpeaking(true);

    const isChing = forceChingChang !== undefined ? forceChingChang : voiceStyle === 'chingchang';

    const finish = () => {
      setIsSpeaking(false);
      if (onDone) onDone();
    };

    try {
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        text.trim()
      )}&tl=km&client=tw-ob`;

      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        // Priority 1: /api/tts serverless proxy (solves Google referer blocking on Vercel)
        // Priority 2: direct Google Translate TTS URL
        // Priority 3: Speech.speak fallback
        const apiUrl = `/api/tts?text=${encodeURIComponent(text.trim())}`;
        const directUrl = audioUrl;

        const playAudioWithUrl = (srcUrl: string, onFail: () => void) => {
          try {
            const audio = new (window as any).Audio();
            try {
              audio.referrerPolicy = 'no-referrer';
            } catch (e) { }
            audio.src = srcUrl;
            webAudioRef.current = audio;

            if (isChing) {
              audio.playbackRate = 1.25;
              (audio as any).preservesPitch = false;
            }

            audio.onended = () => {
              webAudioRef.current = null;
              finish();
            };

            audio.onerror = (err: any) => {
              console.warn(`TTS audio error for ${srcUrl}:`, err);
              webAudioRef.current = null;
              onFail();
            };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch((err: any) => {
                console.warn(`Audio.play() rejected for ${srcUrl}:`, err);
                webAudioRef.current = null;
                onFail();
              });
            }
          } catch (e) {
            onFail();
          }
        };

        const fallbackToSpeech = () => {
          Speech.speak(text, {
            language: 'km-KH',
            pitch: isChing ? 1.55 : 1.0,
            rate: isChing ? 0.9 : 0.75,
            onDone: finish,
            onError: finish,
          });
        };

        playAudioWithUrl(apiUrl, () => {
          playAudioWithUrl(directUrl, fallbackToSpeech);
        });
        return;
      }

      // iOS and Android via expo-av
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;

      // In expo-av: shouldCorrectPitch = false raises the pitch along with speed (Shin-chan anime kid voice)
      if (isChing) {
        await sound.setRateAsync(1.28, false);
      }

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          finish();
        }
      });
    } catch (error) {
      console.warn('Native audio play error, falling back to local speech:', error);
      Speech.speak(text, {
        language: 'km-KH',
        pitch: isChing ? 1.55 : 1.0,
        rate: isChing ? 0.9 : 0.75,
        onDone: finish,
        onError: finish,
      });
    }
  };

  const toKhmerNumber = (num: number | string) => {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(num).replace(/[0-9]/g, (d) => khmerDigits[parseInt(d, 10)]);
  };

  // 1. អរគុណ [ឈ្មោះ]
  // 2. សម្រាប់ទឹកប្រាក់ [ចំនួន] ដុល្លា
  // 3. អាន Message ដោយផ្ទាល់ (បែបអាឈីងចាំង ឌឺៗ ឬ ធម្មតា)
  const announceDonationSequence = (
    donorName: string,
    donationAmount: number,
    donorMsg?: string
  ) => {
    const amountKhmer = toKhmerNumber(donationAmount);
    let announcement = '';

    if (voiceStyle === 'chingchang') {
      announcement = `អរគុណបង ${donorName} សម្រាប់ទឹកចិត្ត ${amountKhmer} ដុល្លា!`;
      if (donorMsg && donorMsg.trim()) {
        announcement += ` ${donorMsg.trim()}`;
      }
    } else {
      announcement = `អរគុណ ${donorName}, សម្រាប់ទឹកចិត្ត ${amountKhmer} ដុល្លា`;
      if (donorMsg && donorMsg.trim()) {
        announcement += `, ${donorMsg.trim()}`;
      }
    }

    playNaturalKhmerVoice(announcement, undefined, voiceStyle === 'chingchang');
  };

  const previewChingChangVoice = () => {
    if (isSpeaking) {
      stopAllAudio();
      return;
    }
    const sample = voiceStyle === 'chingchang'
      ? 'អរគុណបងសម្លាញ់!'
      : 'អរគុណសម្រាប់ការគាំទ្រ!';
    playNaturalKhmerVoice(sample, undefined, voiceStyle === 'chingchang');
  };

  const speakText = (text: string) => {
    if (isSpeaking) {
      stopAllAudio();
      return;
    }
    const isKhmer = /[\u1780-\u17FF]/.test(text);
    if (isKhmer) {
      playNaturalKhmerVoice(text, undefined, voiceStyle === 'chingchang');
    } else {
      Speech.stop();
      setIsSpeaking(true);
      Speech.speak(text, {
        language: 'en-US',
        pitch: voiceStyle === 'chingchang' ? 1.5 : 1.0,
        rate: voiceStyle === 'chingchang' ? 0.9 : 0.85,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  // Validation (Frictionless for live stream tipping)
  const validateForm = () => {
    let isValid = true;

    if (!amount || amount < 1) {
      setAmountError('សូមជ្រើសរើស ឬបញ្ចូលចំនួនទឹកប្រាក់យ៉ាងតិច $1។');
      isValid = false;
    } else {
      setAmountError('');
    }

    // Name is optional for live stream (defaults to Gamer Fan)
    if (name.trim() && name.trim().length < 2) {
      setNameError('Gamer Tag ត្រូវមានយ៉ាងតិច 2 អក្សរ (ឬទុកទំនេរដើម្បីប្រើឈ្មោះ Gamer Fan)');
      isValid = false;
    } else {
      setNameError('');
    }

    // Email is optional (only validated if entered)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (email.trim() && !emailRegex.test(email.trim())) {
      setEmailError('សូមបញ្ចូល Email ឲ្យបានត្រឹមត្រូវ (ឬទុកទំនេរមិនបាច់ដាក់ក៏បាន)');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (youtubeUrl.trim() && !getYouTubeId(youtubeUrl.trim())) {
      setYoutubeError('សូមបញ្ចូល YouTube Link ឲ្យបានត្រឹមត្រូវ (youtube.com ឬ youtu.be)');
      isValid = false;
    } else {
      setYoutubeError('');
    }

    return isValid;
  };

  // Submit Tip to Live Stream
  const handleSubmit = () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const refId = 'TIP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      const donorDisplayName = name.trim() || 'Gamer Fan';
      const donorFirstName = donorDisplayName.split(' ')[0] || donorDisplayName;

      setReceiptData({
        donorName: donorFirstName,
        fullName: donorDisplayName,
        email: email.trim() || 'Anonymous Gamer',
        amount: amount,
        frequency: frequency === 'monthly' ? 'Monthly Fan (VIP)' : 'One-time Tip',
        paymentMethod: 'ACLEDA KHQR Bank Transfer',
        bankAccount: BANK_DETAILS.bankAccName,
        message: message.trim(),
        youtubeUrl: youtubeUrl.trim(),
        youtubeId: youtubeId,
        refId,
        voiceStyle,
      });

      setIsModalVisible(true);
      // Automatically announce: 1. Name -> 2. Amount -> 3. Message
      announceDonationSequence(
        donorDisplayName,
        amount,
        message.trim()
      );
    }, 700);
  };

  // Auto Payment Trigger (Option A: Auto detect when returning from ACLEDA / Bank app)
  const triggerAutoPaymentSuccess = () => {
    if (isModalVisible || isSubmitting) return;
    setIsAutoDetecting(true);
    setTimeout(() => {
      setIsAutoDetecting(false);
      handleSubmit();
    }, 1200);
  };

  // AppState & Window Focus Listener for Auto-Detection
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (waitingPaymentRef.current && !isModalVisible) {
          waitingPaymentRef.current = false;
          triggerAutoPaymentSuccess();
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (amount > 0) {
          waitingPaymentRef.current = true;
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    // On Web: also support switching browser tab or app window
    let handleWindowFocus: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      handleWindowFocus = () => {
        if (waitingPaymentRef.current && !isModalVisible) {
          waitingPaymentRef.current = false;
          triggerAutoPaymentSuccess();
        }
      };
      window.addEventListener('focus', handleWindowFocus);
    }

    return () => {
      sub.remove();
      if (handleWindowFocus && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
      }
    };
  }, [amount, name, message, isModalVisible, isSubmitting, voiceStyle]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f6faf9" />

      {/* HEADER / NAVIGATION */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerInner}>
          <View style={styles.logoRow}>
            <Text style={styles.logoTitle}>AHLYSUNG</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.navDonateBtn}
              activeOpacity={0.85}
              onPress={() => scrollRef.current?.scrollTo({ y: 350, animated: true })}
            >
              <Text style={styles.navDonateBtnText}>Tip Streamer</Text>
              <Ionicons name="flash" size={13} color="#ffffff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION / STREAMER PROFILE & SOCIAL MEDIA */}
        <View style={styles.heroSection}>
          <View style={styles.streamerProfileCard}>
            {/* CENTERED STREAMER PROFILE */}
            <View style={styles.profileCenterBox}>
              <View style={styles.streamerAvatarWrap}>
                <Image
                  source={require('../../assets/profile/1.png')}
                  style={styles.streamerAvatarImg}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.streamerNameRow}>
                <Text style={styles.streamerName}>AHLYSUNG</Text>
                <Ionicons name="checkmark-circle" size={19} color="#00b4d8" style={{ marginLeft: 5 }} />
              </View>
            </View>

            {/* SOCIAL MEDIA BUTTONS ROW (3 SIDE-BY-SIDE) */}
            <View style={styles.socialGrid}>
              {SOCIAL_LINKS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.socialCard, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}
                  activeOpacity={0.75}
                  onPress={() => handleOpenSocial(item.url)}
                  accessibilityLabel={`Open ${item.name}`}
                >
                  <View style={[styles.socialIconWrap, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={15} color="#ffffff" />
                  </View>
                  <View style={styles.socialCardInfo}>
                    <Text style={styles.socialCardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.socialCardHandle} numberOfLines={1}>
                      {item.handle}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* DONATION CARD */}
        <View ref={donateCardRef} style={styles.donateCard}>
          {/* CHOOSE AN AMOUNT */}
          <View style={[styles.fieldHeaderRow, { marginTop: 0, marginBottom: 12 }]}>
            <Text style={[styles.fieldLabel, { marginTop: 0, marginBottom: 0 }]}>CHOOSE AN AMOUNT</Text>
            <TouchableOpacity
              style={[styles.ttsBtn, isSpeaking && styles.ttsBtnSpeaking]}
              activeOpacity={0.8}
              onPress={() => speakText(`You are tipping $${amount}.`)}
            >
              <Ionicons
                name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
                size={13}
                color={isSpeaking ? '#ffffff' : '#0f5f5b'}
              />
              <Text style={[styles.ttsBtnText, isSpeaking && { color: '#ffffff' }]}>Listen</Text>
            </TouchableOpacity>
          </View>

          {/* PRESETS GRID */}
          <View style={styles.presetGrid}>
            {[2, 5, 10, 25, 50, 100].map((presetVal) => {
              const isSelected = selectedPreset === presetVal;
              return (
                <TouchableOpacity
                  key={presetVal}
                  style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectPreset(presetVal)}
                >
                  <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                    ${presetVal}
                  </Text>
                  {presetVal === 10 && (
                    <Text style={[styles.popularBadge, isSelected && styles.popularBadgeActive]}>
                      Challenge
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CUSTOM AMOUNT INPUT */}
          <View style={styles.customAmountWrap}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.customInput, amountError ? styles.inputErrorBorder : null]}
              placeholder="Custom tip amount"
              placeholderTextColor="#9aa9a7"
              keyboardType="numeric"
              value={customAmountStr}
              onChangeText={handleCustomAmountChange}
            />
          </View>
          {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}

          {/* DONOR DETAILS */}
          <View style={styles.fieldHeaderRow}>
            <Text style={styles.fieldLabel}>GAMER INFO</Text>
          </View>
          <View style={styles.inputStack}>
            <TextInput
              style={[styles.textInput, nameError ? styles.inputErrorBorder : null]}
              placeholder="Name"
              placeholderTextColor="#9aa9a7"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError('');
              }}
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

          </View>

          {/* QUICK CHEER CHIPS */}
          <View style={styles.quickCheerSection}>
            <View style={styles.quickCheerHeader}>
              <Ionicons name="flash" size={13} color="#ff7a59" />
              <Text style={styles.quickCheerHeading}>1-Tap Fast Cheers</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickCheerList}
            >
              {QUICK_CHEERS.map((chip, idx) => {
                const isSelected = message.includes(chip);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.quickChip, isSelected && styles.quickChipActive]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectQuickCheer(chip)}
                  >
                    <Text style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* MESSAGE / REMARK */}
          <View style={styles.fieldHeaderRow}>
            <Text style={styles.fieldLabel}>
              MESSAGE
            </Text>
            <TouchableOpacity
              style={styles.ttsBtn}
              activeOpacity={0.8}
              onPress={() => speakText(`Tip message: ${message || 'No message provided'}`)}
            >
              <Ionicons name="volume-medium-outline" size={13} color="#0f5f5b" />
              <Text style={styles.ttsBtnText}>Read</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Remark"
            placeholderTextColor="#9aa9a7"
            multiline
            maxLength={300}
            value={message}
            onChangeText={setMessage}
          />
          <Text style={styles.charCount}>{message.length}/300</Text>

          {/* YOUTUBE LINK */}
          <View style={styles.fieldHeaderRow}>
            <Text style={styles.fieldLabel}>
              YOUTUBE SONG / VIDEO
            </Text>
          </View>
          <TextInput
            style={[styles.textInput, youtubeError ? styles.inputErrorBorder : null]}
            placeholder="https://www.youtube.com/watch?v=... "
            placeholderTextColor="#9aa9a7"
            autoCapitalize="none"
            value={youtubeUrl}
            onChangeText={(text) => {
              setYoutubeUrl(text);
              if (youtubeError) setYoutubeError('');
            }}
          />
          {youtubeError ? <Text style={styles.errorText}>{youtubeError}</Text> : null}

          {/* YOUTUBE PREVIEW */}
          {youtubeId && (
            <TouchableOpacity
              style={styles.ytPreviewCard}
              activeOpacity={0.9}
              onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${youtubeId}`)}
            >
              <Image
                source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }}
                style={styles.ytThumb}
                resizeMode="cover"
              />
              <View style={styles.ytPlayBadge}>
                <Ionicons name="play" size={24} color="#ffffff" />
              </View>
              <View style={styles.ytBanner}>
                <Text style={styles.ytBannerText}>Tap to open video preview</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* PAYMENT METHOD / KHQR SCAN & PAY */}
          <View style={styles.fieldHeaderRow}>
            <Text style={styles.fieldLabel}>SCAN & PAY</Text>
            <View style={styles.fastBadge}>
              <Ionicons name="flash" size={12} color="#ffffff" />
              <Text style={styles.fastBadgeText}>Instant 2s</Text>
            </View>
          </View>

          {/* AUTHENTIC ACLEDA BAKONG KHQR CARD */}
          <View style={styles.khqrCard}>
            {/* Red Bakong Header */}
            <View style={styles.khqrHeader}>
              <View style={styles.khqrLogoWrap}>
                <Text style={styles.khqrLogoText}>KHQR</Text>
                <View style={styles.khqrSpiral}>
                  <Ionicons name="scan-circle" size={18} color="#ffffff" />
                </View>
              </View>
              <View style={styles.khqrHeaderRight}>
                <Text style={styles.khqrHeaderTag}>ACLEDA · BAKONG · SCAN & PAY</Text>
                <Text style={styles.khqrHeaderSub}>Scan with ACLEDA mobile & all Bakong apps</Text>
              </View>
            </View>

            {/* Merchant & Dynamic Amount */}
            <View style={styles.khqrMerchantRow}>
              <View style={styles.khqrMerchantInfo}>
                <Text style={styles.khqrMerchantName}>{BANK_DETAILS.bankAccName}</Text>
                <Text style={styles.khqrMerchantId}>ACLEDA Bank: {BANK_DETAILS.bankAccNum}</Text>
              </View>
              <View style={styles.khqrAmountPill}>
                <Text style={styles.khqrAmountLabel}>Tip Amount</Text>
                <Text style={styles.khqrAmountVal}>
                  ${amount > 0 ? amount.toFixed(2) : '1.00'} USD
                </Text>
              </View>
            </View>

            {/* QR Code Presentation with User's ACLEDA QR */}
            <View style={styles.qrCenterWrap}>
              <View style={styles.qrFrame}>
                {/* 4 Corner Markers */}
                <View style={[styles.qrCorner, styles.qrCornerTL]} />
                <View style={[styles.qrCorner, styles.qrCornerTR]} />
                <View style={[styles.qrCorner, styles.qrCornerBL]} />
                <View style={[styles.qrCorner, styles.qrCornerBR]} />

                <Image
                  source={require('../../assets/images/acleda-qr.jpg')}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.qrScanHint}>
                ⚡ ស្កេនជាមួយ <Text style={{ fontWeight: '700', color: '#0d1b1a' }}>ACLEDA mobile</Text>, ABA, ឬ Bakong App ណាមួយក៏បាន
              </Text>
            </View>

            {/* Fast Action Buttons */}
            <View style={styles.khqrActionGrid}>
              <TouchableOpacity
                style={styles.openAcledaBtn}
                activeOpacity={0.85}
                onPress={handleOpenAcledaApp}
              >
                <Ionicons name="phone-portrait-outline" size={16} color="#ffffff" />
                <Text style={styles.openAcledaBtnText}>បើក ACLEDA mobile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.copyAbaBtn, copiedKey === 'acc' && styles.copyAbaBtnCopied]}
                activeOpacity={0.8}
                onPress={() => handleCopy('acc', BANK_DETAILS.bankAccNum)}
              >
                <Ionicons
                  name={copiedKey === 'acc' ? 'checkmark-circle' : 'copy-outline'}
                  size={16}
                  color={copiedKey === 'acc' ? '#ffffff' : '#0d3b66'}
                />
                <Text
                  style={[
                    styles.copyAbaBtnText,
                    copiedKey === 'acc' && styles.copyAbaBtnTextCopied,
                  ]}
                >
                  {copiedKey === 'acc' ? 'Copied ✓' : 'Copy កុង ACLEDA'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* AUTO-DETECTION STATUS BADGE */}
          <View style={[styles.autoDetectBox, isAutoDetecting && styles.autoDetectBoxActive]}>
            <View style={styles.pulseDotWrap}>
              <View style={[styles.pulseDot, isAutoDetecting && styles.pulseDotActive]} />
            </View>
            <Text style={[styles.autoDetectText, isAutoDetecting && styles.autoDetectTextActive]}>
              {isAutoDetecting
                ? '⚡ បានរកឃើញការបាញ់លុយ! កំពុងលោត Alert ស្វ័យប្រវត្តិ...'
                : '⚡ Auto-Detect: ពេលផ្ទេររួចត្រឡប់មកវិញ នឹង Auto លោត Alert ភ្លាម'}
            </Text>
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || isAutoDetecting) && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.88}
            disabled={isSubmitting || isAutoDetecting}
            onPress={handleSubmit}
          >
            <View style={styles.submitBtnContent}>
              <Ionicons
                name={isAutoDetecting ? 'sync' : 'rocket'}
                size={20}
                color="#ffffff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.submitButtonText}>
                {isAutoDetecting
                  ? 'កំពុងផ្ទៀងផ្ទាត់ការទូទាត់…'
                  : isSubmitting
                    ? 'កំពុងបាញ់ Alert លើ Live…'
                    : 'ស្កេនរួចហើយ (ឬរង់ចាំ Auto)'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* SECURITY ASSURANCE */}
          <View style={styles.secureRow}>
            <Ionicons name="flash" size={13} color="#14746f" />
            <Text style={styles.secureText}>100% Instant Alert · Live Khmer Voice TTS</Text>
          </View>
        </View>

        {/* RECENT ON-STREAM CHEERS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.kicker}>LIVE CHEERS</Text>
          <Text style={styles.sectionTitle}>Recent Cheers on Live</Text>
          <Text style={styles.sectionSubtitle}>
            អ្នកទស្សនាដែលទើបតែបាន Tip លើកទឹកចិត្តដល់ Streamer លើកចុងក្រោយ។
          </Text>
        </View>

        <View style={styles.recentCheersList}>
          {[
            {
              name: 'ShadowV_99',
              amount: 25,
              badge: 'VIP Gold',
              msg: 'GG WP! លេងកប់បង MVP MLBB',
              time: '5m ago',
              color: '#ff7a59',
            },
            {
              name: 'Sopheak_Gamer',
              amount: 5,
              badge: 'Supporter',
              msg: 'ស៊ូៗបង ស៊ីមាន់ PUBG យប់នេះ!',
              time: '14m ago',
              color: '#14746f',
            },
            {
              name: 'Pro_Rath',
              amount: 10,
              badge: 'Challenger',
              msg: 'Challenge លេង Fanny 1 គូ!',
              time: '28m ago',
              color: '#f5b942',
            },
          ].map((item, idx) => (
            <View key={idx} style={styles.recentCheerCard}>
              <View style={[styles.cheerAvatarCircle, { backgroundColor: item.color }]}>
                <Text style={styles.cheerAvatarLetter}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.cheerBody}>
                <View style={styles.cheerTopRow}>
                  <Text style={styles.cheerName}>{item.name}</Text>
                  <View style={styles.cheerBadge}>
                    <Text style={styles.cheerBadgeText}>{item.badge}</Text>
                  </View>
                  <Text style={styles.cheerTime}>{item.time}</Text>
                </View>
                <Text style={styles.cheerMsg}>"{item.msg}"</Text>
              </View>
              <View style={styles.cheerAmountWrap}>
                <Text style={styles.cheerAmountText}>+${item.amount}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* READY TO TIP BANNER */}
        <View style={styles.ctaBanner}>
          <Text style={styles.ctaBannerTitle}>Want your message on screen now?</Text>
          <Text style={styles.ctaBannerSub}>
            Send a tip with your message or song request and watch it appear live on stream in seconds!
          </Text>
          <TouchableOpacity
            style={styles.ctaBannerBtn}
            activeOpacity={0.85}
            onPress={() => scrollRef.current?.scrollTo({ y: 350, animated: true })}
          >
            <Text style={styles.ctaBannerBtnText}>Tip Streamer</Text>
            <Ionicons name="flash" size={15} color="#0f5f5b" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* GOOD TO KNOW (FAQ) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.kicker}>STREAM FAQ</Text>
          <Text style={styles.sectionTitle}>Good to know</Text>
        </View>

        <View style={styles.faqList}>
          {[
            {
              q: 'តើសាររបស់ខ្ញុំនឹងលោតលើអេក្រង់ Live ដែរឬទេ?',
              a: 'ពិតប្រាកដណាស់! ពេលដែលអ្នក Tip រួច Alert នឹងលោតលើអេក្រង់ភ្លាមៗ ជាមួយឈ្មោះ សារ និងសំឡេងអាន Khmer TTS Voice ដោយស្វ័យប្រវត្តិ។',
            },
            {
              q: 'តើអាចកុម្ម៉ង់ចម្រៀង YouTube លើ Live បានទេ?',
              a: 'បានយ៉ាងស្រួល! គ្រាន់តែ paste link YouTube ក្នុងទម្រង់ខាងលើ នោះវីដេអូ ឬបទចម្រៀងរបស់អ្នកនឹងចាក់ជូនអ្នកទស្សនាទាំងអស់ស្តាប់។',
            },
            {
              q: 'តើអាច Tip តាម ABA ឬ Bakong ដោយរបៀបណា?',
              a: 'លោកអ្នកគ្រាន់តែមើលព័ត៌មានគណនីធនាគារខាងលើ ផ្ទេរប្រាក់តាម App ធនាគារ រួចចុច Confirm Bank Transfer ជាការស្រេច។',
            },
            {
              q: 'តើខ្ញុំអាច Tip ដោយមិនបញ្ចេញឈ្មោះពិតបានទេ?',
              a: 'បាន! អ្នកអាចដាក់ឈ្មោះ Gamer Tag, ឈ្មោះហៅក្រៅ ឬសរសេរ "Anonymous Gamer" បានតាមចិត្ត។',
            },
          ].map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <View key={index} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => setOpenFaq(isOpen ? null : index)}
                >
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <View style={[styles.faqChevron, isOpen && styles.faqChevronOpen]}>
                    <Ionicons
                      name="chevron-down"
                      size={15}
                      color={isOpen ? '#ffffff' : '#14746f'}
                    />
                  </View>
                </TouchableOpacity>
                {isOpen && <Text style={styles.faqAnswer}>{item.a}</Text>}
              </View>
            );
          })}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerLogoRow}>
            <Text style={[styles.logoTitle, { fontSize: 16 }]}>AHLYSUNG</Text>
          </View>
          <Text style={styles.footerNote}>© 2025 AHLYSUNG Live Streamer Tip Platform · Designed for gamers & streamers.</Text>
        </View>
      </ScrollView>

      {/* THANK YOU / RECEIPT MODAL */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* CHECK BADGE */}
            <View style={styles.modalCheckBadge}>
              <Ionicons name="checkmark" size={36} color="#ffffff" />
            </View>

            <Text style={styles.modalTitle}>
              Thank you, {receiptData?.donorName || 'Gamer'}!
            </Text>
            <Text style={styles.modalSub}>
              Your tip alert has triggered on the live stream! The streamer and chat appreciate your support.
            </Text>

            {/* RECEIPT SUMMARY */}
            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Tip type</Text>
                <Text style={styles.receiptVal}>{receiptData?.frequency}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment method</Text>
                <Text style={styles.receiptVal}>{receiptData?.paymentMethod}</Text>
              </View>
              {receiptData?.bankAccount && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>To account</Text>
                  <Text style={styles.receiptVal}>{receiptData?.bankAccount}</Text>
                </View>
              )}
              {receiptData?.message ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>TTS Message</Text>
                  <Text style={[styles.receiptVal, { maxWidth: '60%' }]} numberOfLines={2}>
                    {receiptData?.message}
                  </Text>
                </View>
              ) : null}
              {receiptData?.youtubeUrl ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Requested Song</Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(receiptData.youtubeUrl)}
                  >
                    <Text style={[styles.receiptVal, { color: '#14746f', textDecorationLine: 'underline' }]}>
                      Watch Video
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Reference</Text>
                <Text style={styles.receiptVal}>{receiptData?.refId}</Text>
              </View>

              <View style={[styles.receiptRow, styles.receiptTotalRow]}>
                <Text style={[styles.receiptLabel, { fontWeight: '700', color: '#0d1b1a' }]}>
                  Total Tip
                </Text>
                <Text style={styles.receiptTotalVal}>
                  ${receiptData?.amount?.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* MODAL ACTIONS */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalReadBtn, isSpeaking && { backgroundColor: '#ff7a59' }]}
                activeOpacity={0.8}
                onPress={() => {
                  if (isSpeaking) {
                    stopAllAudio();
                  } else {
                    announceDonationSequence(
                      receiptData?.fullName || receiptData?.donorName || name.trim() || 'សប្បុរសជន',
                      receiptData?.amount || amount,
                      receiptData?.message || message.trim()
                    );
                  }
                }}
              >
                <Ionicons
                  name={isSpeaking ? 'pause' : 'volume-medium-outline'}
                  size={17}
                  color={isSpeaking ? '#ffffff' : '#0f5f5b'}
                />
                <Text style={[styles.modalReadBtnText, isSpeaking && { color: '#ffffff' }]}>
                  {isSpeaking ? 'ផ្អាក / Pause' : 'អានឡើងវិញ / Replay'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                activeOpacity={0.85}
                onPress={() => {
                  stopAllAudio();
                  setIsModalVisible(false);
                }}
              >
                <Text style={styles.modalCloseBtnText}>បិទ / Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6faf9',
  },
  header: {
    backgroundColor: 'rgba(246, 250, 249, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#e2eae9',
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#14746f',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14746f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0d1b1a',
    marginLeft: 0,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navDonateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff7a59',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: '#ff7a59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 2,
  },
  navDonateBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  heroSection: {
    marginBottom: 8,
  },
  streamerProfileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    borderWidth: 1.5,
    borderColor: '#e2eae9',
    shadowColor: '#0d1b1a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 24,
  },
  profileCenterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  streamerAvatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  streamerAvatarImg: {
    width: 120,
    height: 120,
    borderRadius: 100,
    borderColor: '#ffffff',
    backgroundColor: '#0d3b66',
    shadowColor: '#0d1b1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  streamerLiveDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e11925',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  streamerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0d1b1a',
    letterSpacing: -0.3,
  },
  socialGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    width: '100%',
  },
  socialCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  socialIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  socialCardInfo: {
    flex: 1,
  },
  socialCardName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d1b1a',
  },
  socialCardHandle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#5d6f6d',
    marginTop: 1,
  },
  donateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2eae9',
    shadowColor: '#0d1b1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    marginBottom: 36,
  },
  donateCardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0d1b1a',
    letterSpacing: -0.4,
  },
  donateCardSub: {
    fontSize: 13,
    color: '#5d6f6d',
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5d6f6d',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  optionalText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9aa9a7',
    textTransform: 'none',
  },
  freqContainer: {
    flexDirection: 'row',
    backgroundColor: '#eff5f4',
    borderRadius: 999,
    padding: 4,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqBtnActive: {
    backgroundColor: '#14746f',
    shadowColor: '#14746f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  freqBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5d6f6d',
  },
  freqBtnTextActive: {
    color: '#ffffff',
  },
  saveBadge: {
    backgroundColor: '#ff7a59',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    marginLeft: 5,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  ttsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4f3',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 99,
  },
  ttsBtnSpeaking: {
    backgroundColor: '#ff7a59',
  },
  ttsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f5f5b',
    marginLeft: 4,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  presetBtn: {
    width: '31.3%',
    margin: '1%',
    backgroundColor: '#ffffff',
    borderWidth: 1.6,
    borderColor: '#e2eae9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnActive: {
    borderColor: '#14746f',
    backgroundColor: '#e8f4f3',
  },
  presetBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d1b1a',
  },
  presetBtnTextActive: {
    color: '#0f5f5b',
  },
  popularBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5d6f6d',
    marginTop: 2,
  },
  popularBadgeActive: {
    color: '#14746f',
  },
  customAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    position: 'relative',
  },
  currencySymbol: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
    fontSize: 16,
    fontWeight: '700',
    color: '#5d6f6d',
  },
  customInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.6,
    borderColor: '#e2eae9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingLeft: 30,
    paddingRight: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#0d1b1a',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d93a3f',
    marginTop: 6,
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff7f3',
    borderWidth: 1,
    borderColor: '#ffe2d6',
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    color: '#8a4a33',
    fontWeight: '600',
    lineHeight: 18,
    marginHorizontal: 8,
  },
  impactTtsBtn: {
    backgroundColor: '#ffe2d6',
    borderRadius: 99,
    padding: 5,
  },
  inputStack: {
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.6,
    borderColor: '#e2eae9',
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0d1b1a',
  },
  inputErrorBorder: {
    borderColor: '#e5484d',
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#5d6f6d',
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '600',
  },
  ytPreviewCard: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ytThumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  ytPlayBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ff7a59',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  ytBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  ytBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickCheerSection: {
    marginTop: 14,
    marginBottom: 4,
  },
  quickCheerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickCheerHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ff7a59',
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  quickCheerList: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  quickChip: {
    backgroundColor: '#eff5f4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#dce8e6',
  },
  quickChipActive: {
    backgroundColor: '#14746f',
    borderColor: '#14746f',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14746f',
  },
  quickChipTextActive: {
    color: '#ffffff',
  },
  fastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e11925',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  fastBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    marginLeft: 3,
  },
  khqrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e8eceb',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 10,
  },
  khqrHeader: {
    backgroundColor: '#e11925',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  khqrLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  khqrLogoText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  khqrSpiral: {
    opacity: 0.9,
  },
  khqrHeaderRight: {
    alignItems: 'flex-end',
  },
  khqrHeaderTag: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  khqrHeaderSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  khqrMerchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  khqrMerchantInfo: {
    flex: 1,
  },
  khqrMerchantName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0d1b1a',
  },
  khqrMerchantId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5d6f6d',
    marginTop: 2,
  },
  khqrAmountPill: {
    backgroundColor: '#fff1ec',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#ffd8cc',
  },
  khqrAmountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ff7a59',
    textTransform: 'uppercase',
  },
  khqrAmountVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ff7a59',
    marginTop: 1,
  },
  qrCenterWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrFrame: {
    width: 216,
    height: 216,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#f0f3f2',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  qrCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#e11925',
  },
  qrCornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  qrCornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  qrCornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  qrCornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  qrImage: {
    width: 196,
    height: 196,
    borderRadius: 8,
  },
  qrScanHint: {
    fontSize: 12,
    color: '#5d6f6d',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  khqrActionGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  openAcledaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3b66',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#0d3b66',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  openAcledaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  copyAbaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f4f3',
    borderWidth: 1.5,
    borderColor: '#c6e3e1',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  copyAbaBtnCopied: {
    backgroundColor: '#14746f',
    borderColor: '#14746f',
  },
  copyAbaBtnText: {
    color: '#005f73',
    fontSize: 13,
    fontWeight: '800',
  },
  copyAbaBtnTextCopied: {
    color: '#ffffff',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#ff7a59',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    shadowColor: '#ff7a59',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  secureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  secureText: {
    fontSize: 12,
    color: '#5d6f6d',
    marginLeft: 6,
    fontWeight: '500',
  },
  sectionHeader: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: '#14746f',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0d1b1a',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#5d6f6d',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  recentCheersList: {
    marginBottom: 28,
    gap: 10,
  },
  recentCheerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#e2eae9',
    shadowColor: '#0d1b1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cheerAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cheerAvatarLetter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  cheerBody: {
    flex: 1,
  },
  cheerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cheerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0d1b1a',
  },
  cheerBadge: {
    backgroundColor: '#eff5f4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cheerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#14746f',
  },
  cheerTime: {
    fontSize: 11,
    color: '#9aa9a7',
    marginLeft: 'auto',
  },
  cheerMsg: {
    fontSize: 12,
    color: '#5d6f6d',
    marginTop: 3,
    fontStyle: 'italic',
  },
  cheerAmountWrap: {
    backgroundColor: '#fff1ec',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
  },
  cheerAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ff7a59',
  },
  ctaBanner: {
    backgroundColor: '#0f5f5b',
    borderRadius: 22,
    padding: 26,
    alignItems: 'center',
    marginBottom: 36,
  },
  ctaBannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  ctaBannerSub: {
    fontSize: 13,
    color: '#d5e8e6',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 18,
  },
  ctaBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  ctaBannerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f5f5b',
  },
  faqList: {
    marginBottom: 36,
  },
  faqCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2eae9',
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d1b1a',
    flex: 1,
    paddingRight: 10,
  },
  faqChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8f4f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqChevronOpen: {
    backgroundColor: '#14746f',
    transform: [{ rotate: '180deg' }],
  },
  faqAnswer: {
    fontSize: 13,
    color: '#5d6f6d',
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2eae9',
    paddingTop: 24,
    alignItems: 'center',
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 12,
    color: '#5d6f6d',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 26, 24, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 26,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  modalCheckBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#14746f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#14746f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0d1b1a',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#5d6f6d',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: '#f6faf9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cfe0de',
    padding: 14,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#5d6f6d',
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d1b1a',
  },
  receiptTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#cfe0de',
    marginTop: 8,
    paddingTop: 10,
  },
  receiptTotalVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14746f',
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  modalReadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f4f3',
    paddingVertical: 14,
    borderRadius: 999,
  },
  modalReadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f5f5b',
    marginLeft: 6,
  },
  modalCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff7a59',
    paddingVertical: 14,
    borderRadius: 999,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Ching Chang Voice Alert Styles
  voiceSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#ffd7cb',
    shadowColor: '#ff7a59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  voiceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff1ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ff7a59',
    letterSpacing: 0.5,
  },
  voiceSectionSub: {
    fontSize: 11,
    color: '#657876',
    marginTop: 1,
  },
  voiceTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff7a59',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#ff7a59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceTestBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  voiceOptionRow: {
    gap: 8,
  },
  voiceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8faf9',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#e8eeed',
  },
  voiceOptionBtnActive: {
    backgroundColor: '#fff7f4',
    borderColor: '#ff7a59',
  },
  voiceOptionEmoji: {
    fontSize: 22,
  },
  voiceOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d1b1a',
  },
  voiceOptionNameActive: {
    color: '#ff7a59',
  },
  voiceOptionDesc: {
    fontSize: 11,
    color: '#7a8c8a',
    marginTop: 2,
  },
  hotVoiceBadge: {
    backgroundColor: '#ffede8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hotVoiceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ff7a59',
  },
  radioUnchecked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  autoDetectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7f5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bce4df',
  },
  autoDetectBoxActive: {
    backgroundColor: '#fff4f0',
    borderColor: '#ff7a59',
  },
  pulseDotWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14746f',
  },
  pulseDotActive: {
    backgroundColor: '#ff7a59',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  autoDetectText: {
    flex: 1,
    fontSize: 12,
    color: '#0f5f5b',
    fontWeight: '600',
    lineHeight: 16,
  },
  autoDetectTextActive: {
    color: '#ff7a59',
    fontWeight: '700',
  },
});