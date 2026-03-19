import React, { useState, useEffect } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Image } from 'react-native';

export default function SelectMasterScreen({ navigation }) {
  const [masters, setMasters] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('master');
      if (saved) setSelected(JSON.parse(saved));

      const res = await fetch(`${API_URL}/masters`);
      const data = await res.json();
      setMasters(data);
      setFiltered(data);
    } catch (e) {
      alert('Ошибка подключения. Проверь IP в config.js и что сервер запущен.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    setFiltered(
      masters.filter(m =>
        m.full_name.toLowerCase().includes(text.toLowerCase())
      )
    );
  };

  const handleSelect = async (master) => {
    setSelected(master);
    await AsyncStorage.setItem('master', JSON.stringify(master));
  };

  const handleConfirm = () => {
    if (!selected) { alert('Выберите мастера из списка'); return; }
    navigation.replace('RequestsList', { master: selected });
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={s.loadingText}>Загрузка мастеров...</Text>
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
            style={[s.row, selected?.id === item.id && s.rowSelected]}
            onPress={() => handleSelect(item)}
          >
            {item.photo_url ? (
  <Image
    source={{ uri: item.photo_url }}
    style={s.avatarImg}
  />
) : (
  <View style={s.avatar}>
    <Text style={s.avatarText}>
      {item.full_name.split(' ').slice(0,2).map(w => w[0]).join('')}
    </Text>
  </View>
)}
            <Text style={s.name}>{item.full_name}</Text>
            {selected?.id === item.id && (
              <Text style={s.check}>✓</Text>
            )}
          </TouchableOpacity>
        )}
      />

      {selected && (
        <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
          <Text style={s.confirmText}>
            Войти как {selected.full_name.split(' ')[0]}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0f172a' },
  avatarImg: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  title:       { color: '#f1f5f9', fontSize: 20, fontWeight: '700', padding: 20, paddingBottom: 4 },
  subtitle:    { color: '#64748b', fontSize: 12, paddingHorizontal: 20, marginBottom: 12 },
  search:      {
    margin: 12, marginTop: 0, backgroundColor: '#1e293b', borderRadius: 10,
    padding: 12, color: '#f1f5f9', fontSize: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  row:         {
    flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 20,
    borderBottomWidth: 0.5, borderBottomColor: '#1e293b',
  },
  rowSelected: { backgroundColor: '#1e293b' },
  avatar:      {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1d4ed8',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  name:        { flex: 1, color: '#e2e8f0', fontSize: 14 },
  check:       { color: '#4ade80', fontSize: 18, fontWeight: '700' },
  confirmBtn:  {
    margin: 16, backgroundColor: '#3b82f6',
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});