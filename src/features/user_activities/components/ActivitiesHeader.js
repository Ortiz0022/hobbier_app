import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

export const ActivitiesHeader = ({ profile }) => {
  const points = profile?.points || 0;

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>hobbier.</Text>

        <View style={styles.pointsPill}>
          <Feather name="star" size={13} color={colors.accent} />
          <Text style={styles.pointsText}>{points} pts</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: 12 },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: 'DynaPuff', fontSize: 23,
    color: colors.primaryDark, letterSpacing: -0.6,
  },
  pointsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF5EA', borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 7,
  },
  pointsText: { color: colors.accentDark, fontSize: 12, fontWeight: '500' },
});
