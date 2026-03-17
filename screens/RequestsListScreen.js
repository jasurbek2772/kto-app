import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';
import RequestCard from '../components/RequestCard';

const FILTERS = [
  { key: 'all',  label: 'Все' },
  { key: 'free', label: 'Свободные' },
  { key: 'mine', label: 'Мои' },
  { key: 'done', label: 'Выполненные' },
];

export default function RequestsListScreen({ navigation, route }) {
  const master = route.params?.master;
  const [requests, setRequests]     = useState([]);
  const [filter, setFilter]         = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // ✅ FIX: setOptions перенесён в useEffect — не вызывается во время рендера
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() =>
            Alert.alert('Смена мастера', 'Сменить мастера?', [
              { text: 'Отмена' },
              {
                text: 'Да', onPress: () => {
                  AsyncStorage.removeItem('master');
                  navigation.replace('SelectMaster');
                }
              },
            ])
          }
        >
          <Text style={{ color: '#60a5fa', fontSize: 13 }}>
            {master?.full_name.split(' ')[0]} ✕
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, master]);

  // Перезагружаем список каждый раз когда возвращаемся на экран
  useFocusEffect(
    useCallback(() => { loadRequests(); }, [])
  );

  const loadRequests = async () => {
    try {
      const res  = await fetch(`${API_URL}/requests`);
      const data = await res.json();
      setRequests(data);
    } catch (e) {
      alert('Ошибка загрузки заявок');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const getFiltered = () => {
    if (filter === 'free') return requests.filter(r => r.status === 'free');
    if (filter === 'mine') return requests.filter(r => r.master_id === master?.id);
    if (filter === 'done') return requests.filter(r => r.status === 'done');
    return requests;
  };

  const renderItem = ({ item }) => (
    <RequestCard
      item={item}
      onPress={() =>
        navigation.navigate('RequestDetail', {
          id:     item.id,
          number: item.number_1c,
          master,
        })
      }
    />
  );

  return (
    <View style={s.container}>

      {/* Фильтры */}
      <View style={s.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterBtn, filter === f.key && s.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFiltered()}
        keyExtractor={i => i.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={s.empty}>Заявок нет</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f1f5f9' },
  filters:          {
    flexDirection: 'row', padding: 10, gap: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  filterBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterActive:     { backgroundColor: '#0f172a' },
  filterText:       { fontSize: 12, color: '#64748b' },
  filterTextActive: { color: '#fff' },
  empty:            { textAlign: 'center', marginTop: 60, color: '#94a3b8', fontSize: 14 },
});