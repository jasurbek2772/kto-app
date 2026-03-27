import React, { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase'; 

export default function RequestDetailScreen({ route, navigation }) {
  const { number, master } = route.params; 
  const [req, setReq] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadStatus, setUploadStatus]   = useState('');

  useEffect(() => { loadRequest(); }, []);

  const loadRequest = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('number', number) // Используем number из параметров
      .single();

    if (error) throw error;
    setReq(data);
    
    // Обновляем заголовок, чтобы не было undefined
    navigation.setOptions({ title: `Заявка #${data.number}` });
  } catch (e) {
    console.error(e);
    Alert.alert('Ошибка', 'Заявка не найдена');
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
        id_master: master.id, // UUID мастера
        taken_at: new Date().toISOString() // Соответствует полю в SQL
      };
    } else if (action === 'done') {
      updateData = { 
        status: 'Выполнена',
        completed_at: new Date().toISOString() // Соответствует полю в SQL
      };
    } else if (action === 'return') {
      updateData = { 
        status: 'Новая', 
        id_master: null,
        taken_at: null,
        completed_at: null 
      };
    }

    // Логируем для проверки в консоли
    console.log('Update number:', number);
    console.log('Payload:', updateData);

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('number', number)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error('Заявка не найдена в базе');
    }

    await loadRequest();

  } catch (e) {
    console.error('Full Error:', e);
    Alert.alert('Ошибка', `Не удалось обновить: ${e.message}`);
  } finally {
    setActionLoading(false);
  }
};

      const uploadPhoto = async () => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { alert('Нужен доступ к галерее'); return; }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.6,
  });

  if (result.canceled) return;

  setActionLoading(true);
  setUploadStatus('Загрузка фото...');

  try {
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop();
    
    // --- 1. Безопасное имя папки ---
    const safeFolderName = String(number).replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${safeFolderName}/${Date.now()}.${ext}`;

    // --- 2. Чтение файла (исправлено: используем строку 'base64') ---
    // Используем FileSystem для чтения файла
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: 'base64', // Используем строку напрямую, а не FileSystem.EncodingType.Base64
    });

    // --- 3. Преобразование Base64 в ArrayBuffer (бинарные данные) ---
    // Это нужно, чтобы файл не был 0кб
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const arrayBuffer = byteArray.buffer;

    // --- 4. Загрузка в Supabase ---
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // --- 5. Обновление ссылки в БД ---
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    const newPhotos = [...(req.photos || []), urlData.publicUrl];

    const { error: updateError } = await supabase
      .from('orders')
      .update({ photos: newPhotos })
      .eq('number', number);

    if (updateError) throw updateError;

    await loadRequest();
    Alert.alert('Успешно', 'Фотография добавлена');
    
  } catch (e) {
    console.error('Ошибка загрузки фото:', e);
    Alert.alert('Ошибка', `Не удалось сохранить фото: ${e.message || 'неизвестная ошибка'}`);
  } finally {
    setUploadStatus('');
    setActionLoading(false);
  }
};

  const fmtDate = (d) => d ? new Date(d).toLocaleString('ru-RU') : '—';

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  );

  const isMine = req?.id_master === master?.id;

  // Маппинг статусов под твою базу
  const getStatusInfo = (status) => {
    switch(status) {
      case 'Новая': return { bg: '#f0fdf4', dot: '#4ade80', text: 'Свободна' };
      case 'В работе': return { bg: '#fefce8', dot: '#fbbf24', text: `В работе` };
      case 'Выполнена': return { bg: '#f1f5f9', dot: '#64748b', text: 'Выполнена' };
      default: return { bg: '#fff', dot: '#ccc', text: status };
    }
  };

  const sInfo = getStatusInfo(req.status);

  // ... (предыдущий код)

  return (
    <ScrollView style={s.container}>
      <View style={[s.statusBar, { backgroundColor: sInfo.bg }]}>
        <View style={[s.statusDot, { backgroundColor: sInfo.dot }]} />
        <Text style={s.statusText}>{sInfo.text}</Text>
      </View>

      <View style={s.field}><Text style={s.fieldLabel}>Адрес</Text><Text style={s.fieldVal}>{req.address}</Text></View>
      <View style={s.field}><Text style={s.fieldLabel}>Контакт</Text><Text style={s.fieldVal}>{req.contact_name} {req.contact_phone ? `(${req.contact_phone})` : ''}</Text></View>
      <View style={s.field}><Text style={s.fieldLabel}>Создана</Text><Text style={s.fieldVal}>{fmtDate(req.date_created)}</Text></View>
      <View style={s.field}><Text style={s.fieldLabel}>Срок</Text><Text style={s.fieldVal}>{fmtDate(req.deadline)}</Text></View>

      <View style={s.descBox}>
        <Text style={s.fieldLabel}>Содержание работ</Text>
        <Text style={s.descText}>{req.content}</Text>
      </View>

      {/* Информация об исполнителе и времени */}
      {req.status !== 'Новая' && (
        <View style={[s.workerBox, req.status === 'Выполнена' && s.workerBoxDone]}>
          <Text style={s.workerLabel}>Исполнитель</Text>
          {/* Если в объекте req нет имени мастера, берем из текущего master */}
          <Text style={s.workerName}>{req.master_name || master.full_name}</Text>
          
          {req.taken_at && (
            <Text style={s.workerMeta}>Взято в работу: {fmtDate(req.taken_at)}</Text>
          )}
          {req.completed_at && (
            <Text style={s.workerMeta}>Завершено: {fmtDate(req.completed_at)}</Text>
          )}
        </View>
      )}

      {req.photos && req.photos.length > 0 && (
        <View style={s.photoSection}>
          <Text style={s.photoLabel}>Фотоотчёт</Text>
          <View style={s.photoRow}>
            {req.photos.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={s.photoThumb} />
            ))}
          </View>
        </View>
      )}

      <View style={s.actions}>
        {req.status === 'Новая' && (
          <TouchableOpacity 
            style={[s.btnMain, actionLoading && { opacity: 0.6 }]} 
            onPress={() => doAction('take')} 
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
              style={[s.photoAddFull, actionLoading && { opacity: 0.6 }]} 
              onPress={uploadPhoto} 
              disabled={actionLoading}
            >
              <Text style={{color: '#3b82f6'}}>+ Добавить фото</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[s.btnSuccess, actionLoading && { opacity: 0.6 }]} 
              onPress={() => doAction('done')} 
              disabled={actionLoading}
            >
              <Text style={s.btnSuccessText}>Отметить выполненным</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.btnOutline, actionLoading && { opacity: 0.6 }]} 
              onPress={() => doAction('return')} 
              disabled={actionLoading}
            >
              <Text style={s.btnOutlineText}>Вернуть в общий список</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  field: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  fieldLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' },
  fieldVal: { fontSize: 14, color: '#0f172a', marginTop: 2 },
  descBox: { margin: 12, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#e2e8f0' },
  descText: { fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 4 },
  photoSection: { paddingHorizontal: 12 },
  photoLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 },
  photoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoThumb: { width: 100, height: 100, borderRadius: 8 },
  photoAddFull: { padding: 15, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#3b82f6', borderStyle: 'dashed' },
  actions: { padding: 12, gap: 10 },
  btnMain: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnMainText: { color: '#fff', fontWeight: '700' },
  btnSuccess: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnSuccessText: { color: '#fff', fontWeight: '700' },
  btnOutline: { padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444', borderRadius: 12 },
  btnOutlineText: { color: '#ef4444', fontWeight: '600' },
});