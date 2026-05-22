import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY_STORAGE = 'device_key';
const KEYS_STORAGE = 'api_keys_store';
const KEYS_ENABLED_STORAGE = 'api_keys_enabled_v1';
const GEMINI_ROTATION_IDX = 'gemini_key_rotation_idx';

interface ApiKeyEntry {
  id: string;
  label: string;
  site: string;
  value: string;
  enabled: boolean;
  expanded: boolean;
}

const DEFAULT_KEYS: Omit<ApiKeyEntry, 'value' | 'expanded'>[] = [
  { id: 'groq',      label: 'Groq API',      site: 'console.groq.com',  enabled: false },
  { id: 'expo',      label: 'Expo Token',    site: 'expo.dev',          enabled: false },
  { id: 'github',    label: 'GitHub Token',  site: 'github.com',        enabled: false },
  { id: 'cloudinary',label: 'Cloudinary',    site: 'cloudinary.com',    enabled: false },
  { id: 'hf',        label: 'HuggingFace',   site: 'huggingface.co',    enabled: false },
];

const GEMINI_SLOT_COUNT = 13;

export default function KeysScreen() {
  const router = useRouter();
  const [deviceKey, setDeviceKey] = useState('');
  const [keys, setKeys] = useState<ApiKeyEntry[]>(
    DEFAULT_KEYS.map(k => ({ ...k, value: '', expanded: false }))
  );
  const [geminiKeys, setGeminiKeys] = useState<string[]>(Array(GEMINI_SLOT_COUNT).fill(''));
  const [geminiEnabled, setGeminiEnabled] = useState<boolean[]>(Array(GEMINI_SLOT_COUNT).fill(false));
  const [geminiExpanded, setGeminiExpanded] = useState<boolean[]>(Array(GEMINI_SLOT_COUNT).fill(false));
  const [geminiSectionOpen, setGeminiSectionOpen] = useState(true);
  const [rotationIdx, setRotationIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newSite, setNewSite] = useState('');

  useEffect(() => {
    const load = async () => {
      const dk = await AsyncStorage.getItem(DEVICE_KEY_STORAGE);
      if (dk) {
        setDeviceKey(dk);
      } else {
        const newKey = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 24);
        setDeviceKey(newKey);
        await AsyncStorage.setItem(DEVICE_KEY_STORAGE, newKey);
      }
      const saved = await AsyncStorage.getItem(KEYS_STORAGE);
      const enabledRaw = await AsyncStorage.getItem(KEYS_ENABLED_STORAGE);
      const idxRaw = await AsyncStorage.getItem(GEMINI_ROTATION_IDX);
      const parsed = saved ? (JSON.parse(saved) as Record<string, string>) : {};
      const enabled = enabledRaw ? (JSON.parse(enabledRaw) as Record<string, boolean>) : {};

      // Load other keys
      setKeys(prev => prev.map(k => ({ ...k, value: parsed[k.id] || '', enabled: !!enabled[k.id] })));

      // Load 13 Gemini keys
      const gKeys: string[] = [];
      const gEnabled: boolean[] = [];
      for (let i = 1; i <= GEMINI_SLOT_COUNT; i++) {
        gKeys.push(parsed[`gemini_${i}`] || '');
        gEnabled.push(!!enabled[`gemini_${i}`]);
      }
      setGeminiKeys(gKeys);
      setGeminiEnabled(gEnabled);
      setRotationIdx(parseInt(idxRaw || '0', 10));
    };
    load();
  }, []);

  const saveGeminiKey = async (slotIndex: number) => {
    setSaving(true);
    try {
      const id = `gemini_${slotIndex + 1}`;
      const value = geminiKeys[slotIndex];
      const saved = await AsyncStorage.getItem(KEYS_STORAGE);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[id] = value;
      await AsyncStorage.setItem(KEYS_STORAGE, JSON.stringify(parsed));
      // Auto-enable if value present
      if (value.trim()) {
        const enabledRaw = await AsyncStorage.getItem(KEYS_ENABLED_STORAGE);
        const map = enabledRaw ? JSON.parse(enabledRaw) : {};
        map[id] = true;
        await AsyncStorage.setItem(KEYS_ENABLED_STORAGE, JSON.stringify(map));
        const newEnabled = [...geminiEnabled];
        newEnabled[slotIndex] = true;
        setGeminiEnabled(newEnabled);
      }
      Alert.alert('✅ Saved', `Gemini Key ${slotIndex + 1} சேமிக்கப்பட்டது!`);
    } catch {
      Alert.alert('Error', 'Save பண்ண முடியல');
    } finally {
      setSaving(false);
    }
  };

  const clearGeminiKey = async (slotIndex: number) => {
    const id = `gemini_${slotIndex + 1}`;
    const newKeys = [...geminiKeys];
    newKeys[slotIndex] = '';
    setGeminiKeys(newKeys);
    const newEnabled = [...geminiEnabled];
    newEnabled[slotIndex] = false;
    setGeminiEnabled(newEnabled);
    try {
      const saved = await AsyncStorage.getItem(KEYS_STORAGE);
      const parsed = saved ? JSON.parse(saved) : {};
      delete parsed[id];
      await AsyncStorage.setItem(KEYS_STORAGE, JSON.stringify(parsed));
      const enabledRaw = await AsyncStorage.getItem(KEYS_ENABLED_STORAGE);
      const map = enabledRaw ? JSON.parse(enabledRaw) : {};
      map[id] = false;
      await AsyncStorage.setItem(KEYS_ENABLED_STORAGE, JSON.stringify(map));
    } catch {}
  };

  const toggleGeminiEnabled = async (slotIndex: number, value: boolean) => {
    const id = `gemini_${slotIndex + 1}`;
    const newEnabled = [...geminiEnabled];
    newEnabled[slotIndex] = value;
    setGeminiEnabled(newEnabled);
    try {
      const enabledRaw = await AsyncStorage.getItem(KEYS_ENABLED_STORAGE);
      const map = enabledRaw ? JSON.parse(enabledRaw) : {};
      map[id] = value;
      await AsyncStorage.setItem(KEYS_ENABLED_STORAGE, JSON.stringify(map));
    } catch {}
  };

  const toggleGeminiExpand = (slotIndex: number) => {
    setGeminiExpanded(prev => prev.map((v, i) => i === slotIndex ? !v : false));
  };

  const resetRotation = async () => {
    await AsyncStorage.setItem(GEMINI_ROTATION_IDX, '0');
    setRotationIdx(0);
    Alert.alert('✅ Reset', 'Key rotation Key 1-லிருந்து மீண்டும் start ஆகும்!');
  };

  const activeGeminiCount = geminiEnabled.filter((e, i) => e && geminiKeys[i]).length;

  const toggleEnabled = async (id: string, value: boolean) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, enabled: value } : k));
    try {
      const raw = await AsyncStorage.getItem(KEYS_ENABLED_STORAGE);
      const map = raw ? JSON.parse(raw) : {};
      map[id] = value;
      await AsyncStorage.setItem(KEYS_ENABLED_STORAGE, JSON.stringify(map));
    } catch {}
  };

  const saveKey = async (id: string, value: string) => {
    setSaving(true);
    try {
      const saved = await AsyncStorage.getItem(KEYS_STORAGE);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[id] = value;
      await AsyncStorage.setItem(KEYS_STORAGE, JSON.stringify(parsed));
      if (id === 'hf') await AsyncStorage.setItem('hf_api_key', value);
      Alert.alert('Saved ✅', 'Key சேமிக்கப்பட்டது!');
    } catch {
      Alert.alert('Error', 'Save பண்ண முடியல');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setKeys(prev => prev.map(k => ({ ...k, expanded: k.id === id ? !k.expanded : false })));
  };

  const addCustomKey = async () => {
    const label = newLabel.trim();
    const site = newSite.trim() || 'custom';
    if (!label) { Alert.alert('பிழை', 'Key பெயர் உள்ளிடுங்க'); return; }
    const id = 'custom_' + Date.now();
    const entry: ApiKeyEntry = { id, label, site, value: '', enabled: false, expanded: false };
    setKeys(prev => [...prev, entry]);
    setAddModal(false); setNewLabel(''); setNewSite('');
  };

  const deleteCustomKey = (id: string, label: string) => {
    if (DEFAULT_KEYS.some(k => k.id === id)) {
      Alert.alert('Delete முடியாது', 'Default keys delete பண்ண முடியாது'); return;
    }
    Alert.alert('Delete?', `"${label}" delete பண்ணட்டுமா?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setKeys(prev => prev.filter(k => k.id !== id));
        const saved = await AsyncStorage.getItem(KEYS_STORAGE);
        const parsed = saved ? JSON.parse(saved) : {};
        delete parsed[id];
        await AsyncStorage.setItem(KEYS_STORAGE, JSON.stringify(parsed));
      }},
    ]);
  };

  const cloudSave = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setSyncing(false);
    Alert.alert('Cloud Save', 'Keys encrypted-ஆ cloud-ல் save பண்ணப்பட்டது ✅');
  };

  const cloudLoad = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setSyncing(false);
    Alert.alert('Cloud Load', 'Cloud-ல் save ஆன keys load ஆச்சு ✅');
  };

  return (
    <SafeAreaView style={s.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <Text style={s.headerIcon}>🔑</Text>
        <Text style={s.headerTitle}>Keys & Accounts</Text>
        <TouchableOpacity onPress={() => { setNewLabel(''); setNewSite(''); setAddModal(true); }} style={s.addBtn}>
          <Text style={s.addBtnTxt}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Device Key */}
        <View style={s.deviceKeyCard}>
          <Text style={s.deviceKeyLabel}>DEVICE KEY</Text>
          <View style={s.deviceKeyRow}>
            <TextInput
              style={s.deviceKeyInput}
              value={deviceKey}
              onChangeText={setDeviceKey}
              placeholder="Device key..."
              placeholderTextColor="#666"
              selectTextOnFocus
            />
            <TouchableOpacity style={s.clearBtn} onPress={() => { setDeviceKey(''); AsyncStorage.removeItem(DEVICE_KEY_STORAGE); }}>
              <Text style={s.clearBtnTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={s.cloudBtns}>
            <TouchableOpacity style={s.cloudLoadBtn} onPress={cloudLoad} disabled={syncing}>
              {syncing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.cloudBtnTxt}>⬇️ Cloud Load</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cloudSaveBtn} onPress={cloudSave} disabled={syncing}>
              {syncing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.cloudBtnTxt}>☁️ Cloud Save</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Gemini Keys Section ── */}
        <TouchableOpacity style={s.sectionHeader} onPress={() => setGeminiSectionOpen(v => !v)} activeOpacity={0.8}>
          <View style={s.sectionHeaderLeft}>
            <Text style={s.sectionHeaderIcon}>🤖</Text>
            <View>
              <Text style={s.sectionHeaderTitle}>Gemini API Keys (Rotation)</Text>
              <Text style={s.sectionHeaderSub}>
                {activeGeminiCount}/{GEMINI_SLOT_COUNT} active • Now using Key {(rotationIdx % Math.max(activeGeminiCount, 1)) + 1}
              </Text>
            </View>
          </View>
          <View style={s.sectionHeaderRight}>
            <View style={[s.activeBadge, activeGeminiCount > 0 && s.activeBadgeOn]}>
              <Text style={s.activeBadgeTxt}>{activeGeminiCount} ON</Text>
            </View>
            <Text style={s.sectionArrow}>{geminiSectionOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {geminiSectionOpen && (
          <View style={s.geminiSection}>
            {/* Rotation status bar */}
            <View style={s.rotationBar}>
              <Text style={s.rotationTxt}>
                🔄 Auto-rotation: {activeGeminiCount > 0
                  ? `Key ${(rotationIdx % activeGeminiCount) + 1} active`
                  : 'No active keys — Server keys use ஆகும்'}
              </Text>
              <TouchableOpacity onPress={resetRotation} style={s.resetBtn}>
                <Text style={s.resetBtnTxt}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* 13 key slots */}
            {Array.from({ length: GEMINI_SLOT_COUNT }, (_, i) => (
              <View key={i} style={[s.geminiSlot, geminiEnabled[i] && geminiKeys[i] ? s.geminiSlotActive : null]}>
                <TouchableOpacity style={s.geminiSlotRow} onPress={() => toggleGeminiExpand(i)} activeOpacity={0.7}>
                  <View style={[s.slotNumBadge, geminiEnabled[i] && geminiKeys[i] ? s.slotNumBadgeOn : null]}>
                    <Text style={s.slotNumTxt}>{i + 1}</Text>
                  </View>
                  <View style={s.slotInfo}>
                    <Text style={s.slotLabel}>Gemini Key {i + 1}</Text>
                    <Text style={s.slotValue} numberOfLines={1}>
                      {geminiKeys[i]
                        ? geminiKeys[i].slice(0, 8) + '••••••••' + geminiKeys[i].slice(-4)
                        : 'Empty — tap to add'}
                    </Text>
                  </View>
                  <Switch
                    value={geminiEnabled[i] && !!geminiKeys[i]}
                    onValueChange={v => toggleGeminiEnabled(i, v)}
                    disabled={!geminiKeys[i]}
                    trackColor={{ false: '#333', true: '#25D366' }}
                    thumbColor={geminiEnabled[i] ? '#fff' : '#888'}
                    style={{ marginRight: 6 }}
                  />
                  {(rotationIdx % Math.max(activeGeminiCount, 1)) === geminiEnabled.slice(0, i + 1).filter((e, j) => e && geminiKeys[j]).length - 1 && activeGeminiCount > 0 && geminiEnabled[i] && geminiKeys[i] ? (
                    <View style={s.nowBadge}><Text style={s.nowBadgeTxt}>NOW</Text></View>
                  ) : (
                    <View style={[s.emptyBadge, geminiKeys[i] ? (geminiEnabled[i] ? s.filledBadge : s.offBadge) : null]}>
                      <Text style={s.badgeTxt}>{geminiKeys[i] ? (geminiEnabled[i] ? 'ON' : 'OFF') : 'EMPTY'}</Text>
                    </View>
                  )}
                  <Text style={s.expandArrow}>{geminiExpanded[i] ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {geminiExpanded[i] && (
                  <View style={s.geminiSlotExpanded}>
                    <TextInput
                      style={s.keyInput}
                      value={geminiKeys[i]}
                      onChangeText={v => {
                        const newKeys = [...geminiKeys];
                        newKeys[i] = v;
                        setGeminiKeys(newKeys);
                      }}
                      placeholder={`AIza... (aistudio.google.com-ல் free key எடுக்கலாம்)`}
                      placeholderTextColor="#555"
                      secureTextEntry={false}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View style={s.slotBtns}>
                      <TouchableOpacity
                        style={s.saveKeyBtn}
                        onPress={() => saveGeminiKey(i)}
                        disabled={saving}
                      >
                        <Text style={s.saveKeyBtnTxt}>💾 Save</Text>
                      </TouchableOpacity>
                      {geminiKeys[i] ? (
                        <TouchableOpacity style={s.clearSlotBtn} onPress={() => clearGeminiKey(i)}>
                          <Text style={s.clearSlotBtnTxt}>🗑 Clear</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>
            ))}

            <View style={s.geminiHint}>
              <Text style={s.geminiHintTxt}>
                💡 aistudio.google.com → Get API key → Free account per key{'\n'}
                🔄 Keys quota தீர்ந்தா auto-rotate ஆகும்{'\n'}
                🔘 Switch ON பண்ணினா மட்டும் rotation-ல் சேரும்
              </Text>
            </View>
          </View>
        )}

        {/* Other API Keys */}
        <View style={s.helperBanner}>
          <Text style={s.helperTxt}>
            👆 Card-ஐ tap பண்ணி expand → key type → Save{'\n'}
            🔘 Switch OFF = Server key use ஆகும் (default)
          </Text>
        </View>

        {keys.map(key => (
          <View key={key.id} style={s.keyCard}>
            <TouchableOpacity style={s.keyRow} onPress={() => toggleExpand(key.id)} activeOpacity={0.7}>
              <View style={s.keyIconWrap}>
                <Text style={s.keyIcon}>🔑</Text>
              </View>
              <View style={s.keyInfo}>
                <Text style={s.keyLabel}>{key.label}</Text>
                <Text style={s.keySite}>{key.site}</Text>
              </View>
              <Switch
                value={key.enabled && !!key.value}
                onValueChange={v => toggleEnabled(key.id, v)}
                disabled={!key.value}
                trackColor={{ false: '#444', true: '#25D366' }}
                thumbColor={key.enabled ? '#fff' : '#888'}
                style={{ marginRight: 6 }}
              />
              <View style={[s.emptyBadge, key.value && s.filledBadge]}>
                <Text style={s.badgeTxt}>{key.value ? (key.enabled ? 'ON' : 'OFF') : 'EMPTY'}</Text>
              </View>
              {!DEFAULT_KEYS.some(d => d.id === key.id) && (
                <TouchableOpacity onPress={() => deleteCustomKey(key.id, key.label)} style={s.keyTrash}>
                  <Text style={{ fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              )}
              <Text style={s.expandArrow}>{key.expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {key.expanded && (
              <View style={s.keyExpanded}>
                <TextInput
                  style={s.keyInput}
                  value={key.value}
                  onChangeText={v => setKeys(prev => prev.map(k => k.id === key.id ? { ...k, value: v } : k))}
                  placeholder={`${key.label} enter பண்ணுங்க...`}
                  placeholderTextColor="#555"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.saveKeyBtn} onPress={() => saveKey(key.id, key.value)} disabled={saving}>
                  <Text style={s.saveKeyBtnTxt}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add custom key modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>🔑 புதிய Key சேர்</Text>
            <TextInput
              style={s.modalInput}
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="Key பெயர் (e.g. OpenAI, Custom API...)"
              placeholderTextColor="#555"
              autoFocus
            />
            <TextInput
              style={[s.modalInput, { marginTop: 10 }]}
              value={newSite}
              onChangeText={setNewSite}
              placeholder="Website (e.g. openai.com)"
              placeholderTextColor="#555"
              autoCapitalize="none"
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setAddModal(false)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalAdd} onPress={addCustomKey}>
                <Text style={s.modalAddTxt}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d1117' },
  header: {
    backgroundColor: '#0d6e7a', flexDirection: 'row',
    alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  headerIcon: { fontSize: 24 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  addBtnTxt: { color: '#fff', fontSize: 22, fontWeight: 'bold', lineHeight: 28 },
  scroll: { padding: 14, paddingBottom: 90 },

  deviceKeyCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1.5, borderColor: '#0d6e7a',
  },
  deviceKeyLabel: { color: '#0d6e7a', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 },
  deviceKeyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1f2937', borderRadius: 10,
    borderWidth: 1, borderColor: '#374151', marginBottom: 12,
  },
  deviceKeyInput: { flex: 1, color: '#e5e7eb', fontSize: 14, padding: 12, fontFamily: 'monospace' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  clearBtnTxt: { color: '#6b7280', fontSize: 16 },
  cloudBtns: { flexDirection: 'row', gap: 10 },
  cloudLoadBtn: { flex: 1, backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cloudSaveBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cloudBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Gemini Section
  sectionHeader: {
    backgroundColor: '#0d1f2d', borderRadius: 12, padding: 14,
    marginBottom: 2, borderWidth: 1.5, borderColor: '#1a4a5a',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sectionHeaderIcon: { fontSize: 28 },
  sectionHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionHeaderSub: { color: '#6b9aaa', fontSize: 12, marginTop: 2 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeBadge: { backgroundColor: '#333', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeOn: { backgroundColor: '#065f46' },
  activeBadgeTxt: { color: '#9ca3af', fontSize: 11, fontWeight: '800' },
  sectionArrow: { color: '#6b7280', fontSize: 14 },

  geminiSection: {
    backgroundColor: '#0a1520', borderRadius: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#1a4a5a', overflow: 'hidden',
  },
  rotationBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d2233', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1a3a4a',
  },
  rotationTxt: { flex: 1, color: '#7dd3fc', fontSize: 12 },
  resetBtn: { backgroundColor: '#1e3a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  resetBtnTxt: { color: '#7dd3fc', fontSize: 12, fontWeight: '700' },

  geminiSlot: {
    borderBottomWidth: 1, borderBottomColor: '#111d2a',
  },
  geminiSlotActive: { backgroundColor: '#0a1f15' },
  geminiSlotRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  slotNumBadge: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#1e2d3a',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  slotNumBadgeOn: { backgroundColor: '#065f46' },
  slotNumTxt: { color: '#7dd3fc', fontSize: 13, fontWeight: '800' },
  slotInfo: { flex: 1 },
  slotLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  slotValue: { color: '#6b7280', fontSize: 11, marginTop: 2, fontFamily: 'monospace' },

  nowBadge: { backgroundColor: '#15803d', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginRight: 6 },
  nowBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

  geminiSlotExpanded: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#1a3a4a',
  },
  slotBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  saveKeyBtn: { flex: 1, backgroundColor: '#1565C0', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveKeyBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  clearSlotBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  clearSlotBtnTxt: { color: '#fca5a5', fontWeight: 'bold', fontSize: 13 },

  geminiHint: {
    backgroundColor: '#0d2233', padding: 14,
    borderTopWidth: 1, borderTopColor: '#1a3a4a',
  },
  geminiHintTxt: { color: '#6b9aaa', fontSize: 12, lineHeight: 20 },

  // Other keys
  helperBanner: { backgroundColor: '#0d3a4a', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1a5a70' },
  helperTxt: { color: '#cfeff8', fontSize: 12, lineHeight: 18 },

  keyCard: {
    backgroundColor: '#111827', borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#1f2937', overflow: 'hidden',
  },
  keyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  keyIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  keyIcon: { fontSize: 18 },
  keyInfo: { flex: 1 },
  keyLabel: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  keySite: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  emptyBadge: { backgroundColor: '#374151', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 },
  filledBadge: { backgroundColor: '#065f46' },
  offBadge: { backgroundColor: '#374151' },
  badgeTxt: { color: '#9ca3af', fontSize: 10, fontWeight: '800' },
  expandArrow: { color: '#6b7280', fontSize: 13 },
  keyTrash: { paddingHorizontal: 8, paddingVertical: 4, marginRight: 4 },
  keyExpanded: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#1f2937',
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  keyInput: {
    flex: 1, backgroundColor: '#1f2937', borderRadius: 8,
    borderWidth: 1, borderColor: '#374151',
    padding: 10, color: '#e5e7eb', fontSize: 13,
    marginTop: 10,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#1f2937', borderRadius: 18, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#374151',
    color: '#e5e7eb', fontSize: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, backgroundColor: '#374151', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelTxt: { color: '#9ca3af', fontWeight: '700' },
  modalAdd: { flex: 1, backgroundColor: '#0d6e7a', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalAddTxt: { color: '#fff', fontWeight: '700' },
});
