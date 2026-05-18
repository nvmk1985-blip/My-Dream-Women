import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ALL_PERSONAS } from '../constants/personas';
import { ParamsStore } from '../context/params-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isModelDownloaded, downloadModel, loadModel, isModelLoaded,
  chatOffline, unloadModel, deleteModel, MODEL_SIZE_LABEL,
  DownloadProgress,
} from '../services/llama-offline';

interface Msg { id: string; role: 'user' | 'assistant'; text: string }

type ScreenState = 'checking' | 'need-download' | 'downloading' | 'loading-model' | 'ready' | 'error';

export default function OfflineChatScreen() {
  const router = useRouter();
  const personaId = ParamsStore.getOfflineChatPersonaId?.() ?? null;
  const persona = personaId ? ALL_PERSONAS.find(p => p.id === personaId) : undefined;
  const personaName = persona?.name ?? 'AI';
  const personaDesc = persona?.description ?? persona?.relationship ?? '';

  const STORAGE_KEY = `offline_ai_msgs_${personaId ?? 'default'}`;

  const [screen, setScreen] = useState<ScreenState>('checking');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [dlProgress, setDlProgress] = useState<DownloadProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const listRef = useRef<FlatList>(null);

  // ── Initial check ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const downloaded = await isModelDownloaded();
        if (!downloaded) { setScreen('need-download'); return; }
        if (!isModelLoaded()) {
          setScreen('loading-model');
          await loadModel();
        }
        await loadHistory();
        setScreen('ready');
      } catch (e: any) {
        setErrorMsg(e?.message ?? 'Unknown error');
        setScreen('error');
      }
    })();
    return () => { unloadModel().catch(() => {}); };
  }, []);

  const loadHistory = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    if (raw) {
      setMessages(JSON.parse(raw));
    } else {
      const welcome: Msg = {
        id: 'w0',
        role: 'assistant',
        text: persona?.greeting?.trim() ||
          `வணக்கம்! நான் ${personaName}. Offline-ல் chat பண்ணலாம்! 🤗`,
      };
      setMessages([welcome]);
    }
  };

  const save = (msgs: Msg[]) =>
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)).catch(() => {});

  // ── Download model ─────────────────────────────────────────────
  const startDownload = useCallback(async () => {
    setScreen('downloading');
    setDlProgress(null);
    try {
      await downloadModel(p => setDlProgress(p));
      setScreen('loading-model');
      await loadModel();
      await loadHistory();
      setScreen('ready');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Download failed');
      setScreen('error');
    }
  }, []);

  // ── Send message ───────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');

    const userMsg: Msg = { id: Date.now().toString(), role: 'user', text };
    const next = [...messages, userMsg];
    setMessages(next);
    save(next);
    setTyping(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history = next.map(m => ({ role: m.role, content: m.text }));
      const reply = await chatOffline(text, history, personaName, personaDesc);
      const botMsg: Msg = { id: (Date.now() + 1).toString(), role: 'assistant', text: reply };
      const final = [...next, botMsg];
      setMessages(final);
      save(final);
    } catch (e: any) {
      const errMsg: Msg = {
        id: (Date.now() + 2).toString(), role: 'assistant',
        text: 'மன்னிக்கவும், ஒரு error வந்துச்சு. மீண்டும் try பண்ணுங்க. 😔',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, typing, messages, personaName, personaDesc]);

  // ── Delete model ───────────────────────────────────────────────
  const handleDeleteModel = async () => {
    setShowDeleteModal(false);
    await unloadModel().catch(() => {});
    await deleteModel().catch(() => {});
    setMessages([]);
    setScreen('need-download');
  };

  const renderMsg = ({ item }: { item: Msg }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.bubble, isUser ? s.userBubble : s.botBubble]}>
        <Text style={[s.bubbleTxt, isUser ? s.userTxt : s.botTxt]}>{item.text}</Text>
      </View>
    );
  };

  // ── Checking screen ────────────────────────────────────────────
  if (screen === 'checking' || screen === 'loading-model') {
    return (
      <SafeAreaView style={s.root}>
        <Stack.Screen options={{
          title: `${personaName} (Offline AI)`,
          headerStyle: { backgroundColor: '#FF6F00' },
          headerTintColor: '#fff',
        }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color="#FF6F00" />
          <Text style={s.centerTxt}>
            {screen === 'loading-model' ? 'AI Model load ஆகுது...' : 'சரிபார்க்கிறேன்...'}
          </Text>
          <Text style={s.centerSub}>சற்று நேரம் பொறுங்க 🙏</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Need download screen ───────────────────────────────────────
  if (screen === 'need-download') {
    return (
      <SafeAreaView style={s.root}>
        <Stack.Screen options={{
          title: `${personaName} (Offline AI)`,
          headerStyle: { backgroundColor: '#FF6F00' },
          headerTintColor: '#fff',
        }} />
        <View style={s.center}>
          <Text style={s.dlIcon}>🤖</Text>
          <Text style={s.dlTitle}>Offline AI Download</Text>
          <Text style={s.dlDesc}>
            இந்த AI model device-ல் download ஆகும்.{'\n'}
            Download ஆனதும் internet இல்லாம் chat பண்ணலாம்!
          </Text>
          <View style={s.dlInfoBox}>
            <Text style={s.dlInfoTxt}>📦 Size: {MODEL_SIZE_LABEL}</Text>
            <Text style={s.dlInfoTxt}>🌐 WiFi use பண்ணுங்க</Text>
            <Text style={s.dlInfoTxt}>📱 One-time download மட்டும்</Text>
          </View>
          <TouchableOpacity style={s.dlBtn} onPress={startDownload}>
            <Text style={s.dlBtnTxt}>⬇️ Download & Install</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnTxt}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Downloading screen ─────────────────────────────────────────
  if (screen === 'downloading') {
    const pct = dlProgress ? Math.round(dlProgress.progress * 100) : 0;
    const mb = dlProgress ? (dlProgress.bytesWritten / 1_000_000).toFixed(0) : '0';
    const total = dlProgress && dlProgress.totalBytes > 0
      ? (dlProgress.totalBytes / 1_000_000).toFixed(0) : '?';
    return (
      <SafeAreaView style={s.root}>
        <Stack.Screen options={{
          title: 'Downloading AI...',
          headerStyle: { backgroundColor: '#FF6F00' },
          headerTintColor: '#fff',
        }} />
        <View style={s.center}>
          <Text style={s.dlIcon}>⬇️</Text>
          <Text style={s.dlTitle}>Download ஆகுது...</Text>
          <Text style={s.dlSub}>{mb} MB / {total} MB</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={s.pctTxt}>{pct}%</Text>
          <Text style={s.dlNote}>App close பண்ணாதீங்க! 🙏</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error screen ───────────────────────────────────────────────
  if (screen === 'error') {
    return (
      <SafeAreaView style={s.root}>
        <Stack.Screen options={{
          title: 'Error',
          headerStyle: { backgroundColor: '#FF6F00' },
          headerTintColor: '#fff',
        }} />
        <View style={s.center}>
          <Text style={s.dlIcon}>❌</Text>
          <Text style={s.dlTitle}>Error வந்துச்சு</Text>
          <Text style={s.dlDesc}>{errorMsg}</Text>
          <TouchableOpacity style={s.dlBtn} onPress={() => setScreen('need-download')}>
            <Text style={s.dlBtnTxt}>மீண்டும் Try பண்ணு</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnTxt}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Chat screen (ready) ────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <Stack.Screen options={{
        title: `${personaName} 🤖`,
        headerStyle: { backgroundColor: '#FF6F00' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={{ marginRight: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13 }}>🗑 Model</Text>
          </TouchableOpacity>
        ),
      }} />

      <View style={s.aiBanner}>
        <Text style={s.aiBannerTxt}>🤖 Offline AI — Device-ல் run ஆகுது</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMsg}
        contentContainerStyle={s.list}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {typing && (
        <View style={s.typingRow}>
          <ActivityIndicator size="small" color="#FF6F00" style={{ marginRight: 6 }} />
          <Text style={s.typingTxt}>{personaName} யோசிக்கிறா...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message..."
            placeholderTextColor="#aaa"
            onSubmitEditing={send}
            returnKeyType="send"
            editable={!typing}
          />
          <TouchableOpacity style={[s.sendBtn, typing && s.sendDisabled]} onPress={send} disabled={typing}>
            <Text style={s.sendTxt}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Delete model confirm modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <Pressable style={s.modalBg} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={s.modalBox}>
            <Text style={s.modalTitle}>🗑 Model Delete பண்ணட்டுமா?</Text>
            <Text style={s.modalDesc}>
              Device-ல் இருக்க AI model delete ஆகும்.{'\n'}
              மீண்டும் use பண்ண download வேணும் ({MODEL_SIZE_LABEL}).
            </Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowDeleteModal(false)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalDelete} onPress={handleDeleteModel}>
                <Text style={s.modalDeleteTxt}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ECE5DD' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerTxt: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  centerSub: { fontSize: 14, color: '#888', marginTop: 6 },
  aiBanner: { backgroundColor: '#FF6F00', paddingVertical: 5, alignItems: 'center' },
  aiBannerTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  list: { padding: 10, paddingBottom: 8 },
  bubble: {
    maxWidth: '80%', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 8, marginBottom: 8,
  },
  userBubble: { backgroundColor: '#DCF8C6', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  botBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  bubbleTxt: { fontSize: 15, lineHeight: 21 },
  userTxt: { color: '#000' },
  botTxt: { color: '#000' },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  typingTxt: { color: '#888', fontSize: 13, fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 8, borderTopWidth: 1, borderTopColor: '#ddd',
  },
  input: {
    flex: 1, backgroundColor: '#f0f0f0', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 8, fontSize: 15, color: '#000',
  },
  sendBtn: {
    marginLeft: 8, backgroundColor: '#FF6F00',
    borderRadius: 24, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  sendDisabled: { backgroundColor: '#ccc' },
  sendTxt: { color: '#fff', fontSize: 18 },
  // Download screens
  dlIcon: { fontSize: 56, marginBottom: 12 },
  dlTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 8, textAlign: 'center' },
  dlDesc: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  dlInfoBox: {
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 16,
    marginBottom: 24, width: '100%', gap: 6,
  },
  dlInfoTxt: { fontSize: 14, color: '#444' },
  dlBtn: {
    backgroundColor: '#FF6F00', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12,
  },
  dlBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
  backBtn: { paddingVertical: 10 },
  backBtnTxt: { color: '#888', fontSize: 15 },
  dlSub: { fontSize: 14, color: '#666', marginBottom: 12 },
  progressBar: {
    width: '85%', height: 14, backgroundColor: '#ddd',
    borderRadius: 7, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#FF6F00', borderRadius: 7 },
  pctTxt: { fontSize: 20, fontWeight: '800', color: '#FF6F00', marginBottom: 8 },
  dlNote: { fontSize: 13, color: '#888', marginTop: 8 },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '82%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 10 },
  modalDesc: { fontSize: 14, color: '#555', lineHeight: 21, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', padding: 12, alignItems: 'center' },
  modalCancelTxt: { color: '#555', fontWeight: '600' },
  modalDelete: { flex: 1, borderRadius: 10, backgroundColor: '#E53935', padding: 12, alignItems: 'center' },
  modalDeleteTxt: { color: '#fff', fontWeight: '700' },
});
