import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config';

export default function RequestDetailScreen({ route, navigation }) {
  const { id, master } = route.params;
  const [req, setReq]                     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadRequest(); }, []);

  const loadRequest = async () => {
    try {
      const res  = await fetch(`${API_URL}/requests/${id}`);
      const data = await res.json();
      setReq(data);
    } catch (e) {
      alert('Ошибка загрузки заявки');
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (action) => {
    setActionLoading(true);
    try {
      const body = action === 'take' ? { master_id: master.id } : {};
      const res  = await fetch(`${API_URL}/requests/${id}/${action}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        await loadRequest();
      } else {
        Alert.alert('Ошибка', data.error);
      }
    } catch (e) {
      alert('Ошибка запроса');
    } finally {
      setActionLoading(false);
    }
  };

  const pickAndUploadPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { alert('Нужен доступ к галерее'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      // ✅ FIX: используем MediaType вместо устаревшего MediaTypeOptions
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    setActionLoading(true);
    const formData = new FormData();
    result.assets.forEach((asset, i) => {
      formData.append('photos', {
        uri:  asset.uri,
        name: `photo_${i}.jpg`,
        type: 'image/jpeg',
      });
    });

    try {
      await fetch(`${API_URL}/requests/${id}/photos`, {
        method: 'POST',
        body:   formData,
      });
      await loadRequest();
    } catch (e) {
      alert('Ошибка загрузки фото');
    } finally {
      setActionLoading(false);
    }
  };

  const fmtDate  = (d) => d ? new Date(d).toLocaleString('ru-RU')     : '—';
  const fmtShort = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!req) {
    return (
      <View style={s.center}>
        <Text style={{ color: '#64748b' }}>Заявка не найдена</Text>
      </View>
    );
  }

  const isMine = req.master_id === master?.id;

  const statusBg   = { free: '#f0fdf4', taken: '#fefce8', done: '#f0fdf4' };
  const statusDot  = { free: '#4ade80', taken: '#fbbf24', done: '#4ade80' };
  const statusText = {
    free:  'Свободна — мастер не назначен',
    taken: `В работе у ${req.master_name || '...'}`,
    done:  `Выполнено · ${req.master_name}`,
  };

  const fields = [
    ['Категория',        req.category],
    ['Адрес',            req.address],
    ['Филиал',           req.branch],
    ['Контактное лицо',  req.contact_person],
    ['Диспетчер',        req.dispatcher],
    ['Дата поступления', fmtDate(req.date_received)],
    ['Срок выполнения',  fmtShort(req.deadline)],
  ];

  return (
    <ScrollView style={s.container}>

      {/* Статус */}
      <View style={[s.statusBar, { backgroundColor: statusBg[req.status] }]}>
        <View style={[s.statusDot, { backgroundColor: statusDot[req.status] }]} />
        <Text style={s.statusText}>{statusText[req.status]}</Text>
      </View>

      {/* Поля */}
      {fields.map(([label, val]) => (
        <View key={label} style={s.field}>
          <Text style={s.fieldLabel}>{label}</Text>
          <Text style={s.fieldVal}>{val || '—'}</Text>
        </View>
      ))}

      {/* Содержание */}
      <View style={s.descBox}>
        <Text style={s.descText}>{req.content}</Text>
      </View>

      {/* Исполнитель */}
      {req.status !== 'free' && (
        <View style={[s.workerBox, req.status === 'done' && s.workerBoxDone]}>
          <Text style={s.workerLabel}>Исполнитель</Text>
          <Text style={s.workerName}>{req.master_name}</Text>
          {req.taken_at && (
            <Text style={s.workerMeta}>Взято: {fmtDate(req.taken_at)}</Text>
          )}
          {req.done_at && (
            <Text style={s.workerMeta}>Выполнено: {fmtDate(req.done_at)}</Text>
          )}
        </View>
      )}

      {/* Фотоотчёт */}
      {req.status !== 'free' && (
        <View style={s.photoSection}>
          <Text style={s.photoLabel}>Фотоотчёт</Text>
          <View style={s.photoRow}>
            {req.photos && req.photos.map(p => (
              <Image
                key={p.id}
                source={{ uri: `${API_URL.replace('/api', '')}/uploads/${p.filename}` }}
                style={s.photoThumb}
              />
            ))}
            {isMine && req.status === 'taken' && (
              <TouchableOpacity style={s.photoAdd} onPress={pickAndUploadPhoto}>
                <Text style={s.photoAddText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Кнопки */}
      <View style={s.actions}>

        {/* Свободная — взять */}
        {req.status === 'free' && (
          <TouchableOpacity
            style={[s.btnMain, actionLoading && { opacity: 0.6 }]}
            disabled={actionLoading}
            onPress={() =>
              Alert.alert('Взять заявку?', req.content, [
                { text: 'Отмена' },
                { text: 'Взять', onPress: () => doAction('take') },
              ])
            }
          >
            <Text style={s.btnMainText}>
              {actionLoading ? 'Загрузка...' : 'Принять в работу'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Моя и в работе — выполнить или вернуть */}
        {isMine && req.status === 'taken' && (
          <>
            <TouchableOpacity
              style={[s.btnSuccess, actionLoading && { opacity: 0.6 }]}
              disabled={actionLoading}
              onPress={() =>
                Alert.alert('Выполнено?', 'Отметить заявку выполненной?', [
                  { text: 'Отмена' },
                  { text: 'Да, выполнено', onPress: () => doAction('done') },
                ])
              }
            >
              <Text style={s.btnSuccessText}>Отметить выполненным</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnOutline, actionLoading && { opacity: 0.6 }]}
              disabled={actionLoading}
              onPress={() =>
                Alert.alert('Вернуть?', 'Вернуть заявку в общий список?', [
                  { text: 'Отмена' },
                  { text: 'Вернуть', style: 'destructive', onPress: () => doAction('return') },
                ])
              }
            >
              <Text style={s.btnOutlineText}>Вернуть в буфер</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f1f5f9' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBar:      {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  statusText:     { fontSize: 12, fontWeight: '500', color: '#374151' },
  field:          {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9',
  },
  fieldLabel:     {
    fontSize: 9, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fieldVal:       { fontSize: 13, color: '#0f172a', fontWeight: '500', marginTop: 2 },
  descBox:        {
    margin: 12, backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderWidth: 0.5, borderColor: '#e2e8f0',
  },
  descText:       { fontSize: 13, color: '#374151', lineHeight: 20 },
  workerBox:      {
    margin: 12, marginTop: 0, backgroundColor: '#fefce8',
    borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: '#fde68a',
  },
  workerBoxDone:  { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  workerLabel:    {
    fontSize: 9, color: '#92400e',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  workerName:     { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 3 },
  workerMeta:     { fontSize: 11, color: '#64748b', marginTop: 2 },
  photoSection:   { marginHorizontal: 12, marginBottom: 8 },
  photoLabel:     {
    fontSize: 9, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  photoRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoThumb:     { width: 70, height: 70, borderRadius: 8 },
  photoAdd:       {
    width: 70, height: 70, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAddText:   { fontSize: 28, color: '#94a3b8' },
  actions:        { margin: 12, gap: 8 },
  btnMain:        {
    backgroundColor: '#0f172a', borderRadius: 12,
    padding: 15, alignItems: 'center',
  },
  btnMainText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSuccess:     {
    backgroundColor: '#15803d', borderRadius: 12,
    padding: 15, alignItems: 'center',
  },
  btnSuccessText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnOutline:     {
    borderRadius: 12, padding: 13, alignItems: 'center',
    borderWidth: 1, borderColor: '#ef4444',
  },
  btnOutlineText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});