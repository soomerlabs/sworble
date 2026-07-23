// DEV TOOLS — testing should be a breeze. Reachable from the home gear
// (__DEV__ builds only). Restart today, wipe everything, see what's loaded.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import engine from '@sworbl/engine';

import { BG_DARK } from '@/game/palette';
import { resetDay } from '@/game/persist';
import { isFullDictionary, dict } from '@/game/dict';
import { TUNING } from '@/game/tuning';

function Btn({ label, danger, onPress }: { label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, danger && styles.btnDanger, pressed && styles.btnDown]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export default function DevScreen() {
  const dayKey = engine.core.dayKey(new Date());
  const [msg, setMsg] = useState('');
  const [armWipe, setArmWipe] = useState(false);

  const restartToday = () => {
    resetDay(dayKey);
    setMsg(`day ${dayKey} wiped — fresh contest`);
    setTimeout(() => router.replace('/'), 600);
  };

  const wipeAll = () => {
    if (!armWipe) {
      setArmWipe(true);
      setMsg('tap again to wipe EVERYTHING');
      return;
    }
    for (const k of engine.store.keys()) engine.store.remove(k);
    setArmWipe(false);
    setMsg('all storage wiped');
    setTimeout(() => router.replace('/'), 600);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>dev tools</Text>
        <Text style={styles.line}>day {dayKey} · fuel {TUNING.BASE_SECS}s→{TUNING.CAP_SECS}s · dict{' '}
          {isFullDictionary() ? `full (${dict().size.toLocaleString()})` : `starter (${dict().size.toLocaleString()})`}
        </Text>

        <View style={styles.stack}>
          <Btn label="restart today's sworbl" onPress={restartToday} />
          <Btn label={armWipe ? 'CONFIRM: wipe all data' : 'wipe ALL data'} danger onPress={wipeAll} />
          <Btn label="‹ back" onPress={() => router.back()} />
        </View>

        {!!msg && <Text style={styles.msg}>{msg}</Text>}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DARK },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { fontFamily: 'Fredoka_600SemiBold', fontSize: 24, color: '#EDEFF7' },
  line: { fontFamily: 'Fredoka_500Medium', fontSize: 12.5, color: '#9DA2B3' },
  stack: { gap: 10, marginTop: 14, width: 260 },
  btn: {
    backgroundColor: '#33333E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    boxShadow: '0 3px 0 #22222A',
  },
  btnDanger: { backgroundColor: '#6E4046', boxShadow: '0 3px 0 #4A272C' },
  btnDown: { transform: [{ translateY: 2 }] },
  btnText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 14, color: '#EDEFF7' },
  msg: { fontFamily: 'Fredoka_600SemiBold', fontSize: 13, color: '#F5B84A', marginTop: 8 },
});
