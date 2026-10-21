import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';


export const ActivitiesHeader = ({ profile, onAddActivity }) => {
  const { theme, colors, styles } = useThemeValues(getActivitiesHeaderTheme);

  const points = profile?.points || 0;

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>hobbier.</Text>

        <View style={styles.rightActions}>
          {onAddActivity && (
            <TouchableOpacity onPress={onAddActivity} style={styles.addBtn}>
              <Feather name="plus" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
          )}
          <View style={styles.pointsPill}>
            <Feather name="star" size={13} color={colors.accent} />
            <Text style={styles.pointsText}>{points} pts</Text>
          </View>
        </View>
      </View>
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getActivitiesHeaderTheme = createThemeStyles((theme) => {
const { colors } = theme;
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
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.color('#E5F6F8', 'card'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.color('#FFF5EA', 'card'), borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 7,
  },
  pointsText: { color: theme.color(colors.accentDark, 'onAccent'), fontSize: 12, fontWeight: '500' },
});
  return { theme, colors, styles };
});
