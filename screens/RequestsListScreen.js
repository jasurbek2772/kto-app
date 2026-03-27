import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase'; // Путь к твоему конфигу Supabase
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

  // Настройка заголовка (смена мастера)
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() =>
            Alert.alert('Смена мастера', `Выйти из профиля ${master?.full_name}?`, [
              { text: 'Отмена' },
              { text: 'Выйти', style: 'destructive', onPress: async () => {
                await AsyncStorage.removeItem('master');
                navigation.replace('SelectMaster');
              }},
            ])
          }
        >
          <Text style={{ color: '#60a5fa', fontSize: 13, fontWeight: '600' }}>
            {master?.full_name.split(' ')[0]} ✕
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, master]);

  // Авто-обновление при нахождении на экране
  useFocusEffect(
    useCallback(() => {
      loadRequests();
      autoRefreshRef.current = setInterval(loadRequests, 30000);
      return () => {
        if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      };
    }, [filter, sort]) // Перезагружаем при смене фильтра/сортировки
  );

  const loadRequests = async () => {
    try {
      let query = supabase.from('orders').select('*');

      // 1. Применяем фильтры Supabase
      if (filter === 'free') {
        query = query.eq('status', 'Новая').is('id_master', null);
      } else if (filter === 'mine') {
        query = query.eq('id_master', master.id).neq('status', 'Выполнена');
      } else if (filter === 'done') {
        query = query.eq('status', 'Выполнена').eq('id_master', master.id);
      }

      // 2. Сортировка Supabase
      if (sort === 'date_desc')    query = query.order('date_created', { ascending: false });
      if (sort === 'date_asc')     query = query.order('date_created', { ascending: true });
      if (sort === 'deadline_asc') query = query.order('deadline', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      console.error('Ошибка загрузки:', e.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  // Фильтрация по строке поиска (в памяти)
  const getFilteredData = () => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter(r => 
      (r.num_1c?.toLowerCase().includes(q)) || 
      (r.address?.toLowerCase().includes(q)) ||
      (r.content?.toLowerCase().includes(q)) ||
      (r.contact_name?.toLowerCase().includes(q))
    );
  };

  const filtered = getFilteredData();

  const renderItem = ({ item }) => (
    <RequestCard
      item={{
        ...item,
        // Адаптация под RequestCard, если он ждет старые имена полей
        number_1c: item.num_1c, 
        category: item.address, // В карточке обычно выводим адрес как основное
      }}
      onPress={() => navigation.navigate('RequestDetail', {
  number: item.number, // Передаем именно number
  master: master
})}
    />
  );

  return (
    <View style={s.container}>
      {/* Поиск */}
      <View style={s.searchBox}>
        <TextInput
          style={s.searchInput}
          placeholder="🔍 Поиск по номеру или адресу..."
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

      {/* Фильтры и Сортировка */}
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

      {/* Выбор сортировки */}
      {showSort && (
        <View style={s.sortDropdown}>
          {SORTS.map(sItem => (
            <TouchableOpacity
              key={sItem.key}
              style={[s.sortItem, sort === sItem.key && s.sortItemActive]}
              onPress={() => { setSort(sItem.key); setShowSort(false); }}
            >
              <Text style={[s.sortItemText, sort === sItem.key && { color: '#f1f5f9' }]}>
                {sItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Список */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.number}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>
              {search ? 'Ничего не найдено' : 'Заявок в этой категории нет'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f1f5f9' },
  searchBox:       {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  searchInput:     { flex: 1, fontSize: 14, color: '#0f172a' },
  searchClear:     { padding: 4 },
  filterBar:       {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  filters:         { flex: 1, flexDirection: 'row', gap: 6 },
  filterBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterActive:    { backgroundColor: '#0f172a' },
  filterText:      { fontSize: 12, color: '#64748b' },
  filterTextActive:{ color: '#fff', fontWeight: '600' },
  sortBtn:         {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 0.5, borderColor: '#e2e8f0',
  },
  sortBtnText:     { fontSize: 12, color: '#64748b' },
  sortDropdown:    {
    backgroundColor: '#fff', borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0', flexDirection: 'row',
    flexWrap: 'wrap', padding: 10, gap: 8,
  },
  sortItem:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f8fafc' },
  sortItemActive:  { backgroundColor: '#3b82f6' },
  sortItemText:    { fontSize: 12, color: '#64748b' },
  emptyBox:        { alignItems: 'center', marginTop: 100 },
  emptyText:       { color: '#94a3b8', fontSize: 15 },
});