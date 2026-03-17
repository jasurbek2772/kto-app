import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const STATUS_LABEL = { free: 'Свободна', taken: 'В работе', done: 'Выполнено' };
const STATUS_COLOR = { free: '#4ade80', taken: '#fbbf24', done: '#94a3b8' };

export default function RequestCard({ item, onPress }) {
  const isDone   = item.status === 'done';
  const isTaken  = item.status === 'taken';
  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  return (
    <TouchableOpacity
      style={[s.card, isDone && s.cardDone, isTaken && s.cardTaken]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Цветная полоска слева по статусу */}
      <View style={[s.stripe, { backgroundColor: STATUS_COLOR[item.status] }]} />

      <View style={s.body}>
        {/* Шапка: категория + бейдж статуса */}
        <View style={s.head}>
          <Text style={[s.cat, isDone && s.catDone]}>
            {item.category || 'Прочее'}
          </Text>
          <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
            <Text style={[s.badgeText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        {/* Адрес */}
        <Text style={[s.addr, isDone && s.addrDone]} numberOfLines={1}>
          📍 {item.address || '—'}
        </Text>

        {/* Содержание */}
        <Text style={s.desc} numberOfLines={2}>
          {item.content}
        </Text>

        {/* Футер: номер + срок */}
        <View style={s.foot}>
          <Text style={s.num}>#{item.number_1c}</Text>
          <Text style={s.deadline}>Срок: {fmtDate(item.deadline)}</Text>
        </View>

        {/* Мастер (если назначен) */}
        {item.master_name && (
          <Text style={s.master}>👷 {item.master_name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardDone: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  cardTaken: {
    borderColor: '#fde68a',
  },
  stripe: {
    width: 4,
    borderRadius: 0,
  },
  body: {
    flex: 1,
    padding: 12,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cat: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  catDone: {
    color: '#94a3b8',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addr: {
    fontSize: 11,
    color: '#3b82f6',
    marginBottom: 4,
  },
  addrDone: {
    color: '#94a3b8',
  },
  desc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 8,
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  num: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  deadline: {
    fontSize: 10,
    color: '#94a3b8',
  },
  master: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
});