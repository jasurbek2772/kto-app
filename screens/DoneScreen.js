import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';

export default function DoneScreen({ navigation, route }) {
  const master = route.params?.master;
  const [requests, setRequests]     = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => { loadDone(); }, [])
  );

  const loadDone = async () => {
    try {
      const res  = await fetch(`${API_URL}/requests?status=done`);
      const data = await res.json();
      // Показываем только выполненные этим мастером
      const mine = data.filter(r => r.master_id === master?.id);
      setRequests(mine);
    } catch (e) {
      alert('Ошибка загрузки');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDone();
    setRefreshing(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() =>
        navigation.navigate('RequestDetail', {
          id: item.id, number: item.number_1c, master,
        })
      }
    >
      <View style={s.cardHead}>
        <Text style={s.cardCat}>{item.category || 'Прочее'}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>Выполнено</Text>
        </View>
      </View>

      <Text style={s.cardAddr}>📍 {item.address}</Text>
      <Text style={s.cardDesc} numberOfLines={2}>{item.content}</Text>

      <View style={s.cardFoot}>
        <Text style={s.cardNum}>#{item.number_1c}</Text>
        <Text style={s.cardDate}>
          {item.done_at ? `Выполнено: ${fmtDate(item.done_at)}` : `Срок: ${fmtDate(item.deadline)}`}
        </Text>
      </View>

      {/* Показываем первое фото если есть */}
      {item.photos && item.photos.length > 0 && (
        <View style={s.photoRow}>
          {item.photos.slice(0, 3).map(p => (
            <Image
              key={p.id}
              source={{ uri: `${API_URL.replace('/api', '')}/uploads/${p.filename}` }}
              style={s.photoThumb}
            />
          ))}
          {item.photos.length > 3 && (
            <View style={s.photoMore}>
              <Text style={s.photoMoreText}>+{item.photos.length - 3}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Мои выполненные</Text>
        <Text style={s.headerSub}>{requests.length} заявок</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={i => i.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>✓</Text>
            <Text style={s.emptyText}>Выполненных заявок пока нет</Text>
            <Text style={s.emptySub}>Здесь будут заявки которые ты выполнил</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f1f5f9' },
  header:        {
    backgroundColor: '#fff', padding: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  headerSub:     { fontSize: 12, color: '#64748b', marginTop: 2 },
  card:          {
    backgroundColor: '#fff', marginHorizontal: 10, marginTop: 8,
    borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: '#e2e8f0',
  },
  cardHead:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardCat:       { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  badge:         { backgroundColor: '#d1fae522', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText:     { fontSize: 10, fontWeight: '600', color: '#4ade80' },
  cardAddr:      { fontSize: 11, color: '#3b82f6', marginBottom: 4 },
  cardDesc:      { fontSize: 11, color: '#64748b', lineHeight: 16, marginBottom: 8 },
  cardFoot:      { flexDirection: 'row', justifyContent: 'space-between' },
  cardNum:       { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  cardDate:      { fontSize: 10, color: '#4ade80' },
  photoRow:      { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  photoThumb:    { width: 56, height: 56, borderRadius: 8 },
  photoMore:     {
    width: 56, height: 56, borderRadius: 8,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },
  photoMoreText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  emptyBox:      { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon:     { fontSize: 48, color: '#4ade80', marginBottom: 12 },
  emptyText:     { fontSize: 16, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySub:      { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
});