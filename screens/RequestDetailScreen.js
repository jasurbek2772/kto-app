import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Image, ActivityIndicator,
  TextInput, Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';


export default function RequestDetailScreen({ route, navigation }) {
  const { number, master } = route.params;
  const [req, setReq]                     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadStatus, setUploadStatus]   = useState('');
  const [masterComment, setMasterComment] = useState(''); 
  const [executorName, setExecutorName] = useState('');
  useEffect(() => { loadRequest(); }, []);

  const loadRequest = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        master:masters!id_master (
          full_name
        )
      `)
      .eq('number', number)
      .single();

    if (error) throw error;

    setReq(data);
    setMasterComment(data.describe_from_master || '');

    // Получаем имя реального исполнителя из связанной таблицы
    const executor = data.master?.full_name || '';
    setExecutorName(executor);

    navigation.setOptions({ title: `Заявка #${data.number}` });
  } catch (e) {
    console.error(e);
    Alert.alert('Ошибка', 'Не удалось загрузить заявку');
  } finally {
    setLoading(false);
  }
};

  const doAction = async (action) => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      let updateData = {};

      if (action === 'take') {
        updateData = {
          status: 'В работе',
          id_master: String(master.id), 
          taken_at: new Date().toISOString(),
        };
      } else if (action === 'done') {
        // ИСПРАВЛЕНИЕ: Сохраняем комментарий вместе с завершением заявки
        updateData = {
          status: 'Выполнена',
          completed_at: new Date().toISOString(),
          describe_from_master: masterComment, 
        };
      } else if (action === 'return') {
        // ИСПРАВЛЕНИЕ: Очищаем комментарий при возврате заявки
        updateData = {
          status: 'Новая',
          id_master: null,
          taken_at: null,
          completed_at: null,
          photos: [],
          describe_from_master: null, 
        };
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('number', number);

      if (error) throw error;
      await loadRequest();
    } catch (e) {
      Alert.alert('Ошибка', `Не удалось обновить: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Функция saveComment удалена, так как больше не нужна

  const uploadPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Ошибка', 'Нужен доступ к галерее'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: false,
      base64: true, 
    });

    if (result.canceled) return;

    setActionLoading(true);
    setUploadStatus('Загружаем фото...');

    try {
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('Нет данных base64');

      const ext = asset.uri.split('.').pop().toLowerCase() || 'jpg';
      const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      const buffer = Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0));

      const safeName = String(number).replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `${safeName}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, buffer, { contentType: mimeType, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
      const newPhotos = [...(req.photos || []), urlData.publicUrl];

      const { error: updateError } = await supabase
        .from('orders')
        .update({ photos: newPhotos })
        .eq('number', number);

      if (updateError) throw updateError;

      await loadRequest();
      Alert.alert('Готово', 'Фото добавлено!');
    } catch (e) {
      console.error('Ошибка загрузки фото:', e);
      Alert.alert('Ошибка', e.message || 'Не удалось загрузить фото');
    } finally {
      setUploadStatus('');
      setActionLoading(false);
    }
  };
  
  const fmtDate = (d) => d ? new Date(d).toLocaleString('ru-RU') : '—';

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  );

  if (!req) return (
    <View style={s.center}><Text style={{ color: '#64748b' }}>Заявка не найдена</Text></View>
  );

  const isMine = String(req?.id_master) === String(master?.id);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'Новая':    return { bg: '#f0fdf4', dot: '#4ade80', text: 'Свободна — можно взять' };
      case 'В работе': return { bg: '#fefce8', dot: '#fbbf24', text: `В работе` };
      case 'Выполнена':return { bg: '#f1f5f9', dot: '#64748b', text: 'Выполнена' };
      default:         return { bg: '#fff',    dot: '#ccc',    text: status };
    }
  };

  const sInfo = getStatusInfo(req.status);

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      {/* Статус */}
      <View style={[s.statusBar, { backgroundColor: sInfo.bg }]}>
        <View style={[s.statusDot, { backgroundColor: sInfo.dot }]} />
        <Text style={s.statusText}>{sInfo.text}</Text>
      </View>

      {/* Поля */}
      <View style={s.field}><Text style={s.fieldLabel}>Адрес</Text><Text style={s.fieldVal}>{req.address || '—'}</Text></View>
      <View style={s.field}><Text style={s.fieldLabel}>Контакт</Text><Text style={s.fieldVal}>{req.contact_name || '—'}</Text></View>
      <View style={s.field}><Text style={s.fieldLabel}>Создана</Text><Text style={s.fieldVal}>{fmtDate(req.date_created)}</Text></View>
      <View style={s.field}><Text style={s.fieldLabel}>Срок</Text><Text style={s.fieldVal}>{fmtDate(req.deadline)}</Text></View>

      {/* Содержание */}
      <View style={s.descBox}>
        <Text style={s.fieldLabel}>Содержание работ</Text>
        <Text style={s.descText}>{req.content || '—'}</Text>
      </View>

      {/* Комментарий мастера */}
      {isMine && req.status === 'В работе' ? (
        <View style={s.commentBox}>
          <Text style={s.fieldLabel}>Ваш комментарий</Text>
          <TextInput
            style={s.textInput}
            value={masterComment}
            onChangeText={setMasterComment}
            placeholder="Опишите выполненные работы (сохранится при завершении)"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
          {/* Кнопка сохранения удалена */}
        </View>
      ) : req.describe_from_master ? (
        <View style={[s.descBox, { borderColor: '#fde68a', backgroundColor: '#fefce8' }]}>
          <Text style={[s.fieldLabel, { color: '#92400e' }]}>Комментарий мастера</Text>
          <Text style={s.descText}>{req.describe_from_master}</Text>
        </View>
      ) : null}

      {/* Исполнитель */}
      {req.status !== 'Новая' && (
        <View style={[s.workerBox, req.status === 'Выполнена' && s.workerBoxDone]}>
          <Text style={s.workerLabel}>Исполнитель</Text>
          <Text style={s.workerName}>
            {executorName || '—'}
          </Text>
          
          {req.taken_at && (
            <Text style={s.workerMeta}>Взято: {fmtDate(req.taken_at)}</Text>
          )}
          {req.completed_at && (
            <Text style={s.workerMeta}>Выполнено: {fmtDate(req.completed_at)}</Text>
          )}
        </View>
      )}

      {/* Фото */}
      {req.photos && req.photos.length > 0 && (
        <View style={s.photoSection}>
          <Text style={s.photoLabel}>Фотоотчёт ({req.photos.length})</Text>
          <View style={s.photoRow}>
            {req.photos.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={s.photoThumb} />
            ))}
          </View>
        </View>
      )}

      {/* Статус загрузки */}
      {uploadStatus ? (
        <View style={{ padding: 12, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={{ color: '#3b82f6', fontSize: 12, marginTop: 4 }}>{uploadStatus}</Text>
        </View>
      ) : null}

      {/* Действия */}
      <View style={s.actions}>

        {req.status === 'Новая' && (
          <TouchableOpacity
            style={[s.btnMain, actionLoading && { opacity: 0.6 }]}
            onPress={() => Alert.alert('Взять заявку?', req.content, [
              { text: 'Отмена' },
              { text: 'Взять', onPress: () => doAction('take') },
            ])}
            disabled={actionLoading}
          >
            <Text style={s.btnMainText}>
              {actionLoading ? 'Загрузка...' : 'Принять в работу'}
            </Text>
          </TouchableOpacity>
        )}

        {isMine && req.status === 'В работе' && (
          <>
            <TouchableOpacity
              style={[s.photoAddBtn, actionLoading && { opacity: 0.6 }]}
              onPress={uploadPhoto}
              disabled={actionLoading}
            >
              <Text style={{ color: '#3b82f6', fontWeight: '600' }}>📷 Добавить фото</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnSuccess, actionLoading && { opacity: 0.6 }]}
              onPress={() => Alert.alert('Выполнено?', 'Отметить заявку выполненной?', [
                { text: 'Отмена' },
                { text: 'Да', onPress: () => doAction('done') },
              ])}
              disabled={actionLoading}
            >
              <Text style={s.btnSuccessText}>Отметить выполненным</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnOutline, actionLoading && { opacity: 0.6 }]}
              onPress={() => Alert.alert('Вернуть?', 'Вернуть заявку в общий список?', [
                { text: 'Отмена' },
                { text: 'Вернуть', style: 'destructive', onPress: () => doAction('return') },
              ])}
              disabled={actionLoading}
            >
              <Text style={s.btnOutlineText}>Вернуть в список</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f1f5f9' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  statusText:    { fontSize: 13, fontWeight: '600', color: '#374151' },
  field:         { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  fieldLabel:    { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldVal:      { fontSize: 13, color: '#0f172a', fontWeight: '500', marginTop: 2 },
  descBox:       { margin: 12, backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: '#e2e8f0' },
  descText:      { fontSize: 13, color: '#374151', lineHeight: 20, marginTop: 4 },
  commentBox:    { margin: 12, backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#3b82f6' },
  textInput:     { minHeight: 80, fontSize: 14, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginTop: 8, textAlignVertical: 'top', backgroundColor: '#f8fafc' },
  // Стили кнопки сохранения удалены
  workerBox:     { margin: 12, marginTop: 0, backgroundColor: '#fefce8', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#fde68a' },
  workerBoxDone: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  workerLabel:   { fontSize: 9, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 },
  workerName:    { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 3 },
  workerMeta:    { fontSize: 11, color: '#64748b', marginTop: 2 },
  photoSection:  { marginHorizontal: 12, marginBottom: 8 },
  photoLabel:    { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  photoRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoThumb:    { width: 90, height: 90, borderRadius: 8, backgroundColor: '#e2e8f0' },
  actions:       { margin: 12, gap: 10 },
  btnMain:       { backgroundColor: '#0f172a', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnMainText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSuccess:    { backgroundColor: '#15803d', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnSuccessText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  btnOutline:    { borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  btnOutlineText:{ color: '#ef4444', fontSize: 13, fontWeight: '600' },
  photoAddBtn:   { padding: 14, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', borderStyle: 'dashed' },
});