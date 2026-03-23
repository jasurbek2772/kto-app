import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, TextInput,
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

const SORTS = [
  { key: 'date_desc',     label: 'Новые' },
  { key: 'date_asc',      label: 'Старые' },
  { key: 'deadline_asc',  label: 'Срок ↑' },
  { key: 'deadline_desc', label: 'Срок ↓' },
];

export default function RequestsListScreen({ navigation, route }) {
  const master = route.params?.master;
  const [requests, setRequests]     = useState([]);
  const [filter, setFilter]         = useState('all');
  const [sort, setSort]             = useState('date_desc');
  const [search, setSearch]         = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSort, setShowSort]     = useState(false);
  const autoRefreshRef              = useRef(null);

  // Заголовок
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() =>
            Alert.alert('Смена мастера', 'Сменить мастера?', [
              { text: 'Отмена' },
              { text: 'Да', onPress: () => {
                AsyncStorage.removeItem('master');
                navigation.replace('SelectMaster');
              }},
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

  // Авто-обновление каждые 30 секунд
  useFocusEffect(
    useCallback(() => {
      loadRequests();
      autoRefreshRef.current = setInterval(loadRequests, 30000);
      return () => {
        if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      };
    }, [])
  );

  const loadRequests = async () => {
    try {
      const res  = await fetch(`${API_URL}/requests`);
      const data = await res.json();
      setRequests(data);
    } catch (e) {
      // тихо — авто-обновление не должно показывать ошибки
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const getFiltered = () => {
    let data = requests;

    // Фильтр по статусу
    if (filter === 'free') data = data.filter(r => r.status === 'free');
    else if (filter === 'mine') data = data.filter(r => r.master_id === master?.id);
    else if (filter === 'done') data = data.filter(r => r.status === 'done');

    // Поиск
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        (r.number_1c   || '').toLowerCase().includes(q) ||
        (r.address     || '').toLowerCase().includes(q) ||
        (r.category    || '').toLowerCase().includes(q) ||
        (r.content     || '').toLowerCase().includes(q) ||
        (r.master_name || '').toLowerCase().includes(q)
      );
    }

    // Сортировка
    data = [...data].sort((a, b) => {
      if (sort === 'date_desc')     return new Date(b.date_received) - new Date(a.date_received);
      if (sort === 'date_asc')      return new Date(a.date_received) - new Date(b.date_received);
      if (sort === 'deadline_asc')  return new Date(a.deadline || '9999') - new Date(b.deadline || '9999');
      if (sort === 'deadline_desc') return new Date(b.deadline || '0') - new Date(a.deadline || '0');
      return 0;
    });

    return data;
  };

  const filtered = getFiltered();

  const renderItem = ({ item }) => (
    <RequestCard
      item={item}
      onPress={() => navigation.navigate('RequestDetail', {
        id: item.id, number: item.number_1c, master,
      })}
    />
  );

  return (
    <View style={s.container}>

      {/* Поиск */}
      <View style={s.searchBox}>
        <TextInput
          style={s.searchInput}
          placeholder="🔍 Поиск по номеру, адресу, категории..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={s.searchClear}>
            <Text style={{ color: '#64748b', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Фильтры + Сортировка */}
      <View style={s.filterBar}>
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
        <TouchableOpacity style={s.sortBtn} onPress={() => setShowSort(!showSort)}>
          <Text style={s.sortBtnText}>⇅ {SORTS.find(s => s.key === sort)?.label}</Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown сортировки */}
      {showSort && (
        <View style={s.sortDropdown}>
          {SORTS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[s.sortItem, sort === s.key && s.sortItemActive]}
              onPress={() => { setSort(s.key); setShowSort(false); }}
            >
              <Text style={[s.sortItemText, sort === s.key && { color: '#f1f5f9' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Счётчик результатов */}
      {(search || filter !== 'all') && (
        <View style={s.resultCount}>
          <Text style={s.resultCountText}>
            Найдено: {filtered.length}
            {search ? ` по запросу "${search}"` : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={i => i.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>
              {search ? 'Ничего не найдено' : 'Заявок нет'}
            </Text>
            {search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={s.emptyClear}>Очистить поиск</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f1f5f9' },
  searchBox:       {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6,
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  searchInput:     { flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 6 },
  searchClear:     { padding: 4 },
  filterBar:       {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 10, paddingBottom: 8, paddingTop: 4,
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  filters:         { flex: 1, flexDirection: 'row', gap: 4 },
  filterBtn:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterActive:    { backgroundColor: '#0f172a' },
  filterText:      { fontSize: 11, color: '#64748b' },
  filterTextActive:{ color: '#fff' },
  sortBtn:         {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 0.5, borderColor: '#e2e8f0',
  },
  sortBtnText:     { fontSize: 11, color: '#64748b' },
  sortDropdown:    {
    backgroundColor: '#fff', borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0', flexDirection: 'row',
    flexWrap: 'wrap', padding: 8, gap: 6,
  },
  sortItem:        {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#f1f5f9',
  },
  sortItemActive:  { backgroundColor: '#0f172a' },
  sortItemText:    { fontSize: 11, color: '#64748b' },
  resultCount:     { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#eff6ff' },
  resultCountText: { fontSize: 11, color: '#1d4ed8' },
  emptyBox:        { alignItems: 'center', marginTop: 60 },
  emptyText:       { color: '#94a3b8', fontSize: 14, marginBottom: 8 },
  emptyClear:      { color: '#3b82f6', fontSize: 12 },
});