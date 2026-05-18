import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, Modal, FlatList, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadToCloudinary } from '../services/api';
import { ALL_PERSONAS } from '../constants/personas';

const STYLE_IDS = [
  'normal','nude','seminude','breast','seductive',
  'wet','legs','saree','sleeping','halfbreast',
];

const API_BASE = typeof window !== 'undefined'
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN ?? window.location.hostname}/api`
  : '/api';

interface CachedPhoto { url: string; public_id: string; }

export default function FaceSwapScreen() {
  const [sourceUri, setSourceUri]     = useState<string | null>(null);
  const [sourceUrl, setSourceUrl]     = useState<string | null>(null);
  const [uploadingSrc, setUploadingSrc] = useState(false);

  const [targetUri, setTargetUri]     = useState<string | null>(null);
  const [targetUrl, setTargetUrl]     = useState<string | null>(null);
  const [uploadingTgt, setUploadingTgt] = useState(false);

  const [swapping, setSwapping]       = useState(false);
  const [resultUrl, setResultUrl]     = useState<string | null>(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const [saving, setSaving]           = useState(false);
  const [savedMsg, setSavedMsg]       = useState('');
  const [warmStatus, setWarmStatus]   = useState<'idle'|'warming'|'ready'>('idle');

  const [showCharModal, setShowCharModal]       = useState(false);
  const [charPhotos, setCharPhotos]             = useState<string[]>([]);
  const [loadingCharPhotos, setLoadingCharPhotos] = useState(false);
  const [selectedPersonaName, setSelectedPersonaName] = useState('');

  // ── Warm up HuggingFace space when screen loads ───────────────
  useEffect(() => {
    setWarmStatus('warming');
    fetch(`${API_BASE}/face-swap/ping`)
      .then(() => {
        // Give the space ~10s to start, then mark ready
        setTimeout(() => setWarmStatus('ready'), 10000);
      })
      .catch(() => setWarmStatus('idle'));
  }, []);

  // ── load cached photos for a persona ──────────────────────────
  const loadPersonaPhotos = async (personaId: string, personaName: string) => {
    setSelectedPersonaName(personaName);
    setLoadingCharPhotos(true);
    setCharPhotos([]);
    const urls: string[] = [];
    try {
      for (const sid of STYLE_IDS) {
        const raw = await AsyncStorage.getItem(`cloud_photos_${personaId}_${sid}`);
        if (raw) {
          const arr: CachedPhoto[] = JSON.parse(raw);
          arr.forEach(p => { if (p.url) urls.push(p.url); });
        }
      }
    } catch {}
    setCharPhotos(urls.slice(0, 60));
    setLoadingCharPhotos(false);
  };

  // ── blob URI → base64 (web compatible) ───────────────────────
  const uriToBase64 = async (uri: string): Promise<string> => {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ── pick selfie ───────────────────────────────────────────────
  const pickSelfie = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setErrorMsg('Gallery permission இல்ல.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.85, allowsEditing: true, aspect: [1, 1],
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setSourceUri(asset.uri);
      setSourceUrl(null);
      setResultUrl(null);
      setErrorMsg('');
      setUploadingSrc(true);
      try {
        const mime = asset.mimeType || 'image/jpeg';
        const b64 = asset.base64 ?? await uriToBase64(asset.uri);
        const up = await uploadToCloudinary(b64, mime, 'faceswap/selfies');
        setSourceUrl(up.url);
      } catch { setErrorMsg('Selfie upload failed. மீண்டும் try பண்ணுங்க.'); }
      setUploadingSrc(false);
    } catch (err: any) {
      setErrorMsg('Image pick error: ' + (err?.message || ''));
      setUploadingSrc(false);
    }
  };

  // ── pick target from gallery ──────────────────────────────────
  const pickTargetGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setErrorMsg('Gallery permission இல்ல.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setTargetUri(asset.uri);
      setTargetUrl(null);
      setResultUrl(null);
      setErrorMsg('');
      setUploadingTgt(true);
      try {
        const mime = asset.mimeType || 'image/jpeg';
        const b64 = asset.base64 ?? await uriToBase64(asset.uri);
        const up = await uploadToCloudinary(b64, mime, 'faceswap/targets');
        setTargetUrl(up.url);
      } catch { setErrorMsg('Target upload failed. மீண்டும் try பண்ணுங்க.'); }
      setUploadingTgt(false);
    } catch (err: any) {
      setErrorMsg('Image pick error: ' + (err?.message || ''));
      setUploadingTgt(false);
    }
  };

  const selectCharPhoto = (url: string) => {
    setTargetUri(url);
    setTargetUrl(url);
    setShowCharModal(false);
    setResultUrl(null);
    setErrorMsg('');
  };

  // ── do face swap (polling — avoids mobile browser timeout) ───────
  const doSwap = async () => {
    if (!sourceUrl || !targetUrl) return;
    setSwapping(true);
    setResultUrl(null);
    setErrorMsg('');
    setSavedMsg('');
    try {
      // 1. Start job — returns immediately with jobId
      const startRes = await fetch(`${API_BASE}/face-swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: sourceUrl, target_url: targetUrl }),
      });
      const startData = await startRes.json() as any;
      if (!startRes.ok) throw new Error(startData.error || 'Face swap start failed');
      const { jobId } = startData as { jobId: string };

      // 2. Poll every 5s (max 5 min = 60 attempts)
      for (let i = 0; i < 60; i++) {
        await sleep(5000);
        const pollRes = await fetch(`${API_BASE}/face-swap/result/${jobId}`);
        const poll = await pollRes.json() as any;
        if (poll.status === 'done') {
          setResultUrl(poll.result_url);
          setWarmStatus('ready');
          setSwapping(false);
          return;
        }
        if (poll.status === 'error') throw new Error(poll.error || 'Face swap failed');
        // still "processing" — keep polling
      }
      throw new Error('Face swap timeout ஆச்சு. மீண்டும் try பண்ணுங்க.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Face swap failed. மீண்டும் try பண்ணுங்க.');
      warmClient_reset();
    }
    setSwapping(false);
  };

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const warmClient_reset = () => {
    fetch(`${API_BASE}/face-swap/ping`).catch(() => {});
    setWarmStatus('warming');
    setTimeout(() => setWarmStatus('ready'), 15000);
  };

  // ── blob helper ───────────────────────────────────────────────
  const fetchBlob = async (url: string): Promise<{ blob: Blob; b64: string }> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = (reader.result as string).split(',')[1];
        resolve({ blob, b64 });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ── save to cloud ─────────────────────────────────────────────
  const saveResult = async () => {
    if (!resultUrl) return;
    setSaving(true); setSavedMsg('');
    try {
      const { b64 } = await fetchBlob(resultUrl);
      await uploadToCloudinary(b64, 'image/jpeg', 'faceswap/results');
      setSavedMsg('☁️ Cloud-ல் save ஆச்சு!');
    } catch { setSavedMsg('Cloud save failed. மீண்டும் try பண்ணுங்க.'); }
    setSaving(false);
  };

  // ── download to device ────────────────────────────────────────
  const downloadToDevice = async () => {
    if (!resultUrl) return;
    try {
      // For web — create a temporary <a> and trigger download
      if (typeof document !== 'undefined') {
        const res = await fetch(resultUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `faceswap_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        setSavedMsg('📥 Device-ல் download ஆச்சு!');
      }
    } catch { setSavedMsg('Download failed. மீண்டும் try பண்ணுங்க.'); }
  };

  const ready = !!sourceUrl && !!targetUrl && !uploadingSrc && !uploadingTgt;

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{
        title: '🤳 Face Swap',
        headerStyle: { backgroundColor: '#075E54' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Warm up banner ── */}
        {warmStatus === 'warming' && (
          <View style={s.warmBanner}>
            <ActivityIndicator size="small" color="#075E54" />
            <Text style={s.warmTxt}> AI space warm up ஆகுது... (30–60 sec) Photos pick பண்ணும்போது ready ஆயிடும் ✅</Text>
          </View>
        )}
        {warmStatus === 'ready' && (
          <View style={[s.warmBanner, s.warmReady]}>
            <Text style={s.warmReadyTxt}>✅ AI ready! Photos pick பண்ணி swap பண்ணலாம்</Text>
          </View>
        )}

        {/* ── How it works ── */}
        <View style={s.banner}>
          <Text style={s.bannerTxt}>
            <Text style={s.bold}>Step 1</Text> உன் selfie pick பண்ணு →{' '}
            <Text style={s.bold}>Step 2</Text> Character photo pick பண்ணு →{' '}
            <Text style={s.bold}>Step 3</Text> Swap பண்ணு! ✨
          </Text>
        </View>

        {/* ── Photo pickers ── */}
        <View style={s.row}>
          {/* Selfie */}
          <View style={s.card}>
            <Text style={s.cardTitle}>😊 உன் முகம்</Text>
            <TouchableOpacity style={s.photoWrap} onPress={pickSelfie} activeOpacity={0.8}>
              {sourceUri
                ? <Image source={{ uri: sourceUri }} style={s.photo} resizeMode="cover" />
                : <View style={s.photoEmpty}>
                    <Text style={s.emptyIcon}>📷</Text>
                    <Text style={s.emptyTxt}>Tap to pick selfie</Text>
                  </View>
              }
            </TouchableOpacity>
            {uploadingSrc
              ? <View style={s.statusRow}><ActivityIndicator size="small" color="#075E54" /><Text style={s.statusTxt}> Uploading...</Text></View>
              : sourceUrl ? <Text style={s.okTxt}>✅ Ready</Text> : null
            }
            <TouchableOpacity style={s.fullBtn} onPress={pickSelfie}>
              <Text style={s.fullBtnTxt}>🖼 Gallery-ல் இருந்து</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.swapArrow}>↔️</Text>

          {/* Character/target */}
          <View style={s.card}>
            <Text style={s.cardTitle}>🌸 Character</Text>
            <TouchableOpacity style={s.photoWrap} onPress={() => setShowCharModal(true)} activeOpacity={0.8}>
              {targetUri
                ? <Image source={{ uri: targetUri }} style={s.photo} resizeMode="cover" />
                : <View style={s.photoEmpty}>
                    <Text style={s.emptyIcon}>🖼</Text>
                    <Text style={s.emptyTxt}>Tap to pick</Text>
                  </View>
              }
            </TouchableOpacity>
            {uploadingTgt
              ? <View style={s.statusRow}><ActivityIndicator size="small" color="#075E54" /><Text style={s.statusTxt}> Uploading...</Text></View>
              : targetUrl ? <Text style={s.okTxt}>✅ Ready</Text> : null
            }
            <TouchableOpacity style={s.fullBtn} onPress={() => setShowCharModal(true)}>
              <Text style={s.fullBtnTxt}>👩 Character Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Error ── */}
        {!!errorMsg && (
          <View style={s.errorBox}>
            <Text style={s.errorTxt}>⚠️ {errorMsg}</Text>
            <TouchableOpacity style={s.retrySmallBtn} onPress={doSwap} disabled={!ready}>
              <Text style={s.retrySmallTxt}>🔄 மீண்டும் try</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Swap button ── */}
        <TouchableOpacity
          style={[s.swapBtn, (!ready || swapping) && s.swapBtnOff]}
          onPress={doSwap}
          disabled={!ready || swapping}
        >
          {swapping
            ? <><ActivityIndicator color="#fff" /><Text style={s.swapBtnTxt}>  AI Processing... (1–3 min)</Text></>
            : <Text style={s.swapBtnTxt}>🤳 Face Swap பண்ணு!</Text>
          }
        </TouchableOpacity>
        {swapping && (
          <Text style={s.swapHintTxt}>
            ⏳ Free AI space process பண்றது — patience please! App close பண்ணாதீங்க.
          </Text>
        )}

        {!ready && !swapping && (
          <Text style={s.hintTxt}>
            {!sourceUrl && !targetUrl ? 'இரண்டு photos-உம் pick பண்ணுங்க ↑'
              : !sourceUrl ? '← Selfie pick பண்ணுங்க'
              : '→ Character photo pick பண்ணுங்க'}
          </Text>
        )}

        {/* ── Result ── */}
        {!!resultUrl && (
          <View style={s.resultCard}>
            <Text style={s.resultTitle}>✨ Face Swap Ready!</Text>
            <Image source={{ uri: resultUrl }} style={s.resultImg} resizeMode="contain" />
            <View style={s.resultBtnRow}>
              <TouchableOpacity style={s.dlBtn} onPress={downloadToDevice}>
                <Text style={s.dlBtnTxt}>📥 Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dlBtn, s.cloudBtn]} onPress={saveResult} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.dlBtnTxt}>☁️ Cloud Save</Text>
                }
              </TouchableOpacity>
            </View>
            <Text style={s.resultHint}>📥 Download — Phone-ல் save ஆகும்{'\n'}☁️ Cloud Save — App-ல் எப்பவும் பார்க்கலாம்</Text>
            {!!savedMsg && <Text style={s.savedMsg}>{savedMsg}</Text>}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Character photo picker modal ── */}
      <Modal visible={showCharModal} animationType="slide" transparent onRequestClose={() => setShowCharModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>🌸 Character Photo தேர்வு</Text>
              <TouchableOpacity onPress={() => setShowCharModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Gallery pick option (always available) */}
            <TouchableOpacity style={s.galleryPickRow} onPress={() => { setShowCharModal(false); pickTargetGallery(); }}>
              <Text style={s.galleryPickIcon}>🖼</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.galleryPickTitle}>Phone Gallery-ல் இருந்து pick பண்ணு</Text>
                <Text style={s.galleryPickSub}>உன் phone-ல் உள்ள எந்த photo-வும் target ஆக use பண்ணலாம்</Text>
              </View>
              <Text style={s.galleryPickArrow}>›</Text>
            </TouchableOpacity>

            {/* Info about character photos */}
            <View style={s.charInfoBox}>
              <Text style={s.charInfoTxt}>
                💡 Character photos — Chat screen-ல் generate பண்ணி "Save" பண்ண அவை இங்கே show ஆகும்
              </Text>
            </View>

            {/* Persona row */}
            <Text style={s.sectionLabel}>Chat-ல் save பண்ண photos:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.personaScroll} contentContainerStyle={s.personaScrollContent}>
              {ALL_PERSONAS.map(p => (
                <TouchableOpacity key={p.id} style={s.personaChip} onPress={() => loadPersonaPhotos(p.id, p.name)}>
                  <View style={[s.personaAvatar, { backgroundColor: (p as any).avatarColor || '#075E54' }]}>
                    <Text style={s.personaAvatarTxt}>{(p as any).avatarLetter || (p as any).emoji || '👩'}</Text>
                  </View>
                  <Text style={s.personaChipName} numberOfLines={1}>{p.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loadingCharPhotos ? (
              <View style={s.charLoading}>
                <ActivityIndicator size="large" color="#075E54" />
                <Text style={s.charLoadingTxt}>{selectedPersonaName} photos load ஆகுது...</Text>
              </View>
            ) : selectedPersonaName && charPhotos.length === 0 ? (
              <View style={s.charEmpty}>
                <Text style={s.charEmptyIcon}>📭</Text>
                <Text style={s.charEmptyTxt}>
                  {selectedPersonaName}-ன் photos இல்ல.{'\n'}
                  Chat-ல் ஒரு photo generate பண்ணி "☁️ Save" பண்ணுங்க — அப்புறம் இங்கே வரும்.{'\n\n'}
                  அல்லது மேலே "Gallery" button-ல் உன் phone-ல் இருந்து pick பண்ணலாம்!
                </Text>
              </View>
            ) : charPhotos.length > 0 ? (
              <FlatList
                data={charPhotos}
                numColumns={3}
                keyExtractor={(item, i) => `${i}_${item}`}
                style={s.charGrid}
                contentContainerStyle={s.charGridContent}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.charPhotoWrap} onPress={() => selectCharPhoto(item)}>
                    <Image source={{ uri: item }} style={s.charPhoto} resizeMode="cover" />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={s.charEmpty}>
                <Text style={s.charEmptyIcon}>👆</Text>
                <Text style={s.charEmptyTxt}>மேலே ஒரு character தேர்வு பண்ணுங்க</Text>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  scroll: { padding: 16, paddingBottom: 40 },

  warmBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8e1', borderRadius: 10, padding: 10, marginBottom: 10 },
  warmTxt: { fontSize: 12, color: '#555', flex: 1 },
  warmReady: { backgroundColor: '#e8f5e9' },
  warmReadyTxt: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },

  banner: { backgroundColor: '#e8f5e9', borderRadius: 14, padding: 12, marginBottom: 14 },
  bannerTxt: { fontSize: 12, color: '#333', lineHeight: 20 },
  bold: { fontWeight: '700', color: '#075E54' },

  row: { flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'flex-start' },
  swapArrow: { fontSize: 22, marginTop: 58, alignSelf: 'center' },

  card: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#075E54', textAlign: 'center', marginBottom: 8 },
  photoWrap: { width: '100%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f0f0f0', marginBottom: 6 },
  photo: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  emptyIcon: { fontSize: 28 },
  emptyTxt: { fontSize: 10, color: '#aaa', textAlign: 'center' },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statusTxt: { fontSize: 11, color: '#555' },
  okTxt: { textAlign: 'center', fontSize: 11, color: '#2e7d32', fontWeight: '700', marginBottom: 4 },

  fullBtn: { backgroundColor: '#e8f5e9', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  fullBtnTxt: { fontSize: 11, fontWeight: '700', color: '#075E54' },

  errorBox: { backgroundColor: '#fdecea', borderRadius: 10, padding: 12, marginBottom: 10, gap: 8 },
  errorTxt: { color: '#c62828', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  retrySmallBtn: { backgroundColor: '#c62828', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  retrySmallTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  swapBtn: {
    backgroundColor: '#075E54', borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    elevation: 3, marginBottom: 8,
  },
  swapBtnOff: { backgroundColor: '#a0c4b8', elevation: 0 },
  swapBtnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  swapHintTxt: { textAlign: 'center', color: '#e65100', fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
  hintTxt: { textAlign: 'center', color: '#888', fontSize: 12, marginBottom: 16 },

  resultCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, elevation: 2, marginTop: 6 },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#075E54', textAlign: 'center', marginBottom: 10 },
  resultImg: { width: '100%', height: 320, borderRadius: 12, marginBottom: 12 },
  saveBtn: { backgroundColor: '#1565C0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  savedMsg: { textAlign: 'center', marginTop: 8, fontSize: 13, color: '#2e7d32', fontWeight: '600' },
  resultBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dlBtn: { flex: 1, backgroundColor: '#4527a0', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cloudBtn: { backgroundColor: '#1565C0' },
  dlBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  resultHint: { fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 18, marginBottom: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  modalClose: { fontSize: 22, color: '#888' },

  galleryPickRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f0f7ff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', gap: 12 },
  galleryPickIcon: { fontSize: 28 },
  galleryPickTitle: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  galleryPickSub: { fontSize: 11, color: '#555', marginTop: 2 },
  galleryPickArrow: { fontSize: 22, color: '#1565C0', fontWeight: 'bold' },

  charInfoBox: { backgroundColor: '#fffde7', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  charInfoTxt: { fontSize: 11, color: '#666', lineHeight: 17 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#555', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },

  personaScroll: { maxHeight: 90, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  personaScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  personaChip: { alignItems: 'center', gap: 4, width: 52 },
  personaAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  personaAvatarTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  personaChipName: { fontSize: 9, color: '#333', fontWeight: '600', textAlign: 'center' },

  charLoading: { padding: 40, alignItems: 'center', gap: 12 },
  charLoadingTxt: { color: '#555', fontSize: 13 },
  charEmpty: { padding: 30, alignItems: 'center', gap: 10 },
  charEmptyIcon: { fontSize: 44 },
  charEmptyTxt: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 22 },
  charGrid: { maxHeight: 380 },
  charGridContent: { padding: 6 },
  charPhotoWrap: { flex: 1, margin: 2, aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  charPhoto: { width: '100%', height: '100%' },
});
