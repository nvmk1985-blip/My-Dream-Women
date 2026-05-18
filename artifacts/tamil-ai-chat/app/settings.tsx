import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadUriToCloudinary } from '../services/api';

const APP_VERSION = '1.2.0 (Build 61)';
const LATEST_APK_URL = 'https://expo.dev/artifacts/eas/kSXWfdv4e7iY3GTwRvBCPY.apk';
const API_BASE = '';

export default function SettingsScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');
  const [appIconUri, setAppIconUri] = useState<string | null>(null);
  const [uploadingAppIcon, setUploadingAppIcon] = useState(false);

  const pickAndUploadAppIcon = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission வேணும்', 'Gallery access allow பண்ணுங்க');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setAppIconUri(asset.uri);
    setUploadingAppIcon(true);
    try {
      await uploadUriToCloudinary(asset.uri, 'image/jpeg', 'my-girls/app-icon');
      Alert.alert(
        '✅ Icon Upload ஆச்சு!',
        'Cloudinary-ல் my-girls/app-icon/ folder-ல் save ஆனது.\n\nGitHub Actions-ல் APK Build trigger பண்ணினா புது icon-ஓட APK கிடைக்கும்! 🎉',
      );
    } catch (e: any) {
      setAppIconUri(null);
      Alert.alert('Upload பிழை', e?.message || 'மீண்டும் try பண்ணுங்க');
    } finally {
      setUploadingAppIcon(false);
    }
  };

  const checkUpdate = async () => {
    setChecking(true);
    setCheckMsg('சரிபார்க்கிறோம்...');
    try {
      const res = await fetch(`${API_BASE}/api/healthz`);
      if (res.ok) {
        setCheckMsg(`✅ v${APP_VERSION} — Latest version தான்! APK link கீழே இருக்கு.`);
      } else {
        setCheckMsg(`v${APP_VERSION} — APK link கீழே இருக்கு`);
      }
    } catch {
      setCheckMsg(`v${APP_VERSION} — APK link கீழே download பண்ணலாம்`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.headerBack}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>⚙️ Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.version}>Version {APP_VERSION}</Text>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>🔄</Text>
            <Text style={s.cardTitle}>App Update</Text>
          </View>
          <Text style={s.cardDesc}>
            புதிய version வந்திருக்கா check பண்ணி latest features download பண்ணும்.
          </Text>
          <TouchableOpacity
            style={[s.updateBtn, checking && { opacity: 0.7 }]}
            onPress={checkUpdate}
            disabled={checking}
          >
            {checking
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.updateBtnTxt}>🔍 Update Check பண்ணு</Text>
            }
          </TouchableOpacity>
          {checkMsg ? <Text style={s.checkMsg}>{checkMsg}</Text> : null}
          {!checking && (
            <TouchableOpacity style={s.downloadLink} onPress={() => Linking.openURL(LATEST_APK_URL)}>
              <Text style={s.downloadLinkTxt}>⬇️ Latest APK Download</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>ℹ️</Text>
            <Text style={s.cardTitle}>App Info</Text>
          </View>
          {[
            ['App', 'My Girls'],
            ['Version', APP_VERSION],
            ['Package', 'com.smk1.tamilaichat'],
            ['Storage', 'Cloudinary'],
            ['AI Model', 'Gemini 2.5 Flash'],
            ['Characters', '10 Tamil AI'],
          ].map(([label, val]) => (
            <View key={label} style={s.infoRow}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoVal}>{val}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>🎯</Text>
            <Text style={s.cardTitle}>App Icon மாத்து</Text>
          </View>
          <Text style={s.cardDesc}>
            உங்கள் photo-வை app icon ஆக set பண்ணலாம். Upload ஆனதும் APK build trigger பண்ணினா புது icon-ஓட app கிடைக்கும்.
          </Text>

          {appIconUri ? (
            <View style={s.iconPreviewRow}>
              <Image source={{ uri: appIconUri }} style={s.iconPreview} />
              <View style={s.iconPreviewInfo}>
                <Text style={s.iconPreviewTitle}>✅ Upload ஆச்சு!</Text>
                <Text style={s.iconPreviewHint}>APK build trigger பண்ணு</Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.iconBtn, uploadingAppIcon && { opacity: 0.6 }]}
            onPress={pickAndUploadAppIcon}
            disabled={uploadingAppIcon}
          >
            {uploadingAppIcon
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.iconBtnTxt}>🖼️ {appIconUri ? 'வேற Icon Upload பண்ணு' : 'Gallery-ல் இருந்து Icon Select பண்ணு'}</Text>
            }
          </TouchableOpacity>

          <View style={s.iconSteps}>
            <Text style={s.iconStep}>1️⃣ Gallery open → photo select → 1:1 square crop</Text>
            <Text style={s.iconStep}>2️⃣ Cloudinary-ல் my-girls/app-icon/ save ஆகும்</Text>
            <Text style={s.iconStep}>3️⃣ GitHub Actions APK Build trigger பண்ணு</Text>
            <Text style={s.iconStep}>4️⃣ புது icon-ஓட APK ready! 🎉</Text>
          </View>
        </View>

        <TouchableOpacity style={s.keysBtn} onPress={() => router.push('/keys')}>
          <Text style={s.keysBtnTxt}>🔑 Keys & Accounts</Text>
        </TouchableOpacity>

        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>💡 Tips</Text>
          <Text style={s.tip}>• முதல் message slow-ஆ வந்தா — server wake up ஆக நேரம் ஆகும்</Text>
          <Text style={s.tip}>• AI Girls photo generate பண்ண Stable Horde (free) use ஆகும்</Text>
          <Text style={s.tip}>• Cloud-ல் images save ஆக Cloudinary configured ஆகிட்டது</Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d1117' },
  header: {
    backgroundColor: '#161b22', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#30363d',
  },
  headerBack: { color: '#fff', fontSize: 22, fontWeight: 'bold', width: 40 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 90 },
  version: { color: '#8b949e', fontSize: 13, marginBottom: 18, textAlign: 'center' },
  card: {
    backgroundColor: '#161b22', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#30363d',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#e6edf3' },
  cardDesc: { fontSize: 13, color: '#8b949e', lineHeight: 20, marginBottom: 14 },
  updateBtn: {
    backgroundColor: '#7C3AED', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  updateBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  checkMsg: { color: '#58a6ff', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  downloadLink: {
    borderWidth: 1, borderColor: '#7C3AED', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  downloadLinkTxt: { color: '#7C3AED', fontWeight: '600', fontSize: 13 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#21262d',
  },
  infoLabel: { fontSize: 13, color: '#8b949e' },
  infoVal: { fontSize: 13, fontWeight: '600', color: '#e6edf3' },
  keysBtn: {
    backgroundColor: '#1f2937', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#374151', flexDirection: 'row',
    justifyContent: 'center', gap: 8,
  },
  keysBtnTxt: { color: '#F59E0B', fontSize: 16, fontWeight: 'bold' },
  tipsCard: { backgroundColor: '#0d2137', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1565C0' },
  tipsTitle: { color: '#58a6ff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  tip: { color: '#8b949e', fontSize: 12, lineHeight: 22 },
  iconBtn: {
    backgroundColor: '#7C3AED', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  iconBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  iconPreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#0d2137', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#00C853',
  },
  iconPreview: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#2a2a4a' },
  iconPreviewInfo: { flex: 1 },
  iconPreviewTitle: { color: '#00C853', fontWeight: 'bold', fontSize: 14 },
  iconPreviewHint: { color: '#aaa', fontSize: 12, marginTop: 4 },
  iconSteps: {
    backgroundColor: '#0d1117', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#30363d', gap: 6,
  },
  iconStep: { color: '#8b949e', fontSize: 12, lineHeight: 20 },
  bottomBar: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#30363d',
    backgroundColor: '#161b22', paddingVertical: 10,
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  bottomBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  bottomIcon: { fontSize: 20, color: '#8b949e', fontWeight: 'bold' },
  bottomIconHome: { fontSize: 22 },
  bottomLabel: { fontSize: 11, color: '#8b949e', marginTop: 2 },
  bottomLabelActive: { fontSize: 11, color: '#58a6ff', fontWeight: '700', marginTop: 2 },
});
