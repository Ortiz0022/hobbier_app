import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

const missionPalettes = [
  {
    background: colors.primarySoft,
    iconBackground: '#D2F0F5',
    accent: colors.primary,
  },
  {
    background: '#FFF1E3',
    iconBackground: '#FFDFBC',
    accent: colors.accentDark,
  },
  {
    background: '#FBEFEB',
    iconBackground: '#F3D5CE',
    accent: '#B86F60',
  },
];

const getCategoryStyle = (categoryObj, title = '') => {
  const categoryName = categoryObj?.name || '';
  const searchKey = `${categoryName} ${title}`.toLowerCase();

  if (searchKey.includes('arte') || searchKey.includes('pint') || searchKey.includes('cerám')) {
    return { name: categoryName || 'Arte', icon: 'edit-2' };
  }
  if (searchKey.includes('tecno') || searchKey.includes('python') || searchKey.includes('program')) {
    return { name: categoryName || 'Tecnología', icon: 'monitor' };
  }
  if (searchKey.includes('natura') || searchKey.includes('deport') || searchKey.includes('camin')) {
    return { name: categoryName || 'Naturaleza', icon: 'map' };
  }
  if (searchKey.includes('músic') || searchKey.includes('instrum')) {
    return { name: categoryName || 'Música', icon: 'music' };
  }
  if (searchKey.includes('juego') || searchKey.includes('ajedrez')) {
    return { name: categoryName || 'Juegos', icon: 'award' };
  }
  if (searchKey.includes('leer') || searchKey.includes('libro')) {
    return { name: categoryName || 'Lectura', icon: 'book-open' };
  }
  return { name: categoryName || 'Hobby', icon: 'compass' };
};

export const ActivityCard = ({ item, isPending, index = 0, onAction }) => {
  const activity = item.activity || {};
  const category = getCategoryStyle(activity.category, activity.title);
  const palette = missionPalettes[index % missionPalettes.length];
  const repetitions = Math.max(item.posts?.length || 0, isPending ? 0 : 1);
  const points = activity.points_awarded || 10;
  const actionLabel = isPending ? 'Continuar' : 'Repetir';

  return (
    <View style={[styles.card, { backgroundColor: palette.background }]}>
      <View style={styles.topRow}>
        <View style={styles.categoryGroup}>
          <View style={[styles.iconBox, { backgroundColor: palette.iconBackground }]}>
            <Feather name={category.icon} size={14} color={palette.accent} />
          </View>
          <Text style={styles.categoryText}>{category.name}</Text>
        </View>

        <View style={styles.pointsPill}>
          <Feather name="star" size={10} color={colors.accent} />
          <Text style={styles.pointsText}>+{points} pts</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{activity.title || 'Misión'}</Text>
      {activity.description ? (
        <Text style={styles.description} numberOfLines={2}>{activity.description}</Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.statusRow}>
          <Feather
            name={isPending ? 'zap' : 'check-circle'}
            size={11}
            color={palette.accent}
          />
          <Text style={styles.statusText}>
            {isPending
              ? 'Lista para cuando quieras'
              : `${repetitions} ${repetitions === 1 ? 'avance' : 'avances'}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${activity.title || 'misión'}`}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Feather name="arrow-up-right" size={13} color={palette.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, paddingHorizontal: 12,
    paddingVertical: 10, marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8, marginBottom: 6,
  },
  categoryGroup: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  iconBox: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryText: {
    flex: 1, color: colors.primaryDark,
    fontSize: 8, fontWeight: '600', letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pointsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4,
  },
  pointsText: { color: colors.accentDark, fontSize: 8.5, fontWeight: '600' },
  title: {
    color: colors.text, fontSize: 14.5, lineHeight: 19,
    fontWeight: '600', letterSpacing: -0.2, paddingRight: 10,
  },
  description: {
    color: colors.textFaint, fontSize: 9,
    lineHeight: 13, marginTop: 3, paddingRight: 10,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 7, marginTop: 8,
  },
  statusRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  statusText: { flex: 1, color: colors.textFaint, fontSize: 8.5, lineHeight: 12 },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  actionText: { color: colors.primaryDark, fontSize: 9, fontWeight: '600' },
});
