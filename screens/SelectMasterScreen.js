import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image, Alert, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export default function SelectMasterScreen({ navigation }) {
  const [masters,  setMasters]  = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);

  // PIN модал
  const [pinMaster,  setPinMaster]  = useState(null); // мастер для которого вводим PIN
  const [pin,        setPin]        = useState('');
  const [pinError,   setPinError]   = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      // Проверяем сохранённую сессию
      const saved = await AsyncStorage.getItem('master');
      if (saved) {
        const master = JSON.parse(saved);
        navigation.replace('RequestsList', { master });
        return;
      }

      const res  = await fetch(`${API_URL}/masters`);
      const data = await res.json();
      setMasters(data);
      setFiltered(data);
    } catch (e) {
      alert('Ошибка подключения. Проверь интернет.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    setFiltered(
      masters.filter(m => m.full_name.toLowerCase().includes(text.toLowerCase()))
    );
  };

  // Нажали на мастера — открываем PIN модал
  const handleSelectMaster = (master) => {
    setPinMaster(master);
    setPin('');
    setPinError('');
  };

  // Нажали цифру PIN
  const handlePinPress = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) verifyPin(newPin);
  };

  const handlePinDelete = () => setPin(p => p.slice(0, -1));

  const verifyPin = async (enteredPin) => {
    setPinLoading(true);
    setPinError('');
    try {
      const res  = await fetch(`${API_URL}/masters/${pinMaster.id}/verify-pin`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin: enteredPin }),
      });
      const data = await res.json();

      if (res.ok) {
        // PIN верный — сохраняем и входим
        await AsyncStorage.setItem('master', JSON.stringify(pinMaster));
        setPinMaster(null);
        navigation.replace('RequestsList', { master: pinMaster });
      } else {
        setPinError(data.error || 'Неверный PIN');
        setPin('');
      }
    } catch (e) {
      setPinError('Ошибка сети');
      setPin('');
    } finally {
      setPinLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={s.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Выберите мастера</Text>
      <Text style={s.subtitle}>Найдено: {filtered.length}</Text>

      <TextInput
        style={s.search}
        placeholder="Поиск по имени..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={handleSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.row}
            onPress={() => handleSelectMaster(item)}
          >
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={s.avatarImg} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {item.full_name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                </Text>
              </View>
            )}
            <Text style={s.name}>{item.full_name}</Text>
            <Text style={{ color: '#334155', fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        )}
      />

      {/* ── PIN модал ── */}
      <Modal
        visible={!!pinMaster}
        transparent
        animationType="slide"
        onRequestClose={() => setPinMaster(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {/* Аватар мастера */}
            <View style={s.pinAvatar}>
              {pinMaster?.photo_url ? (
                <Image source={{ uri: pinMaster.photo_url }} style={s.pinAvatarImg} />
              ) : (
                <View style={s.pinAvatarCircle}>
                  <Text style={s.pinAvatarText}>
                    {pinMaster?.full_name.split(' ').slice(0, 2).map(w => w[0]).join('')}
                  </Text>
                </View>
              )}
            </View>

            <Text style={s.pinName}>{pinMaster?.full_name}</Text>
            <Text style={s.pinSubtitle}>Введите PIN-код</Text>

            {/* Точки PIN */}
            <View style={s.pinDots}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[s.pinDot, pin.length > i && s.pinDotFilled]} />
              ))}
            </View>

            {/* Ошибка */}
            {pinError ? <Text style={s.pinError}>{pinError}</Text> : null}

            {/* Загрузка */}
            {pinLoading ? (
              <ActivityIndicator color="#3b82f6" style={{ marginVertical: 16 }} />
            ) : (
              /* Цифровая клавиатура */
              <View style={s.keypad}>
                {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
                  <View key={ri} style={s.keyRow}>
                    {row.map((key, ki) => (
                      <TouchableOpacity
                        key={ki}
                        style={[s.key, key === '' && { opacity: 0 }]}
                        onPress={() => key === '⌫' ? handlePinDelete() : key !== '' ? handlePinPress(key) : null}
                        disabled={key === ''}
                      >
                        <Text style={s.keyText}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={s.cancelBtn} onPress={() => setPinMaster(null)}>
              <Text style={s.cancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0f172a' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  loadingText:    { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  title:          { color: '#f1f5f9', fontSize: 20, fontWeight: '700', padding: 20, paddingBottom: 4 },
  subtitle:       { color: '#64748b', fontSize: 12, paddingHorizontal: 20, marginBottom: 12 },
  search:         {
    margin: 12, marginTop: 0, backgroundColor: '#1e293b', borderRadius: 10,
    padding: 12, color: '#f1f5f9', fontSize: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  row:            {
    flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 20,
    borderBottomWidth: 0.5, borderBottomColor: '#1e293b',
  },
  avatarImg:      { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  avatar:         {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1d4ed8',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText:     { color: '#fff', fontSize: 12, fontWeight: '700' },
  name:           { flex: 1, color: '#e2e8f0', fontSize: 14 },

  // PIN модал
  modalOverlay:   {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard:      {
    backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 40, alignItems: 'center',
  },
  pinAvatar:      { marginBottom: 12 },
  pinAvatarImg:   { width: 72, height: 72, borderRadius: 36 },
  pinAvatarCircle:{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  pinAvatarText:  { color: '#fff', fontSize: 22, fontWeight: '700' },
  pinName:        { color: '#f1f5f9', fontSize: 17, fontWeight: '600', marginBottom: 4 },
  pinSubtitle:    { color: '#64748b', fontSize: 13, marginBottom: 20 },
  pinDots:        { flexDirection: 'row', gap: 16, marginBottom: 8 },
  pinDot:         { width: 14, height: 14, borderRadius: 7, backgroundColor: '#334155', borderWidth: 1.5, borderColor: '#475569' },
  pinDotFilled:   { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  pinError:       { color: '#f87171', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  keypad:         { width: '100%', marginTop: 8 },
  keyRow:         { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  key:            {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center',
  },
  keyText:        { color: '#f1f5f9', fontSize: 24, fontWeight: '500' },
  cancelBtn:      { marginTop: 16, padding: 12 },
  cancelText:     { color: '#64748b', fontSize: 14 },
});