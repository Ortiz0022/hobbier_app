import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

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

export const ActivityCard = ({ item, isPending, onAction, currentUserId }) => {
  const activity = item.activity || {};
  const category = getCategoryStyle(activity.category, activity.title);
  const repetitions = Math.max(item.posts?.length || 0, isPending ? 0 : 1);
  const points = activity.points_awarded || 10;
  const actionLabel = isPending ? 'Continuar' : 'Repetir';
  const isMine = currentUserId && activity.created_by === currentUserId;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.categoryGroup}>
          <View style={styles.iconBox}>
            <Feather name={category.icon} size={14} color={colors.primary} />
          </View>
          <Text style={styles.categoryText}>{category.name}</Text>
          {isMine && (
            <View style={styles.myActivityPill}>
              <Text style={styles.myActivityText}>Mi actividad</Text>
            </View>
          )}
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
            name={isPending ? 'clock' : 'check-circle'}
            size={11}
            color={isPending ? colors.textMuted : colors.primary}
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
          <Feather name="arrow-up-right" size={13} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 8,
    elevation: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 2px rgba(0,0,0,0.02)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  categoryGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    color: colors.textFaint,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pointsText: {
    color: colors.text,
    fontSize: 8.5,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  description: {
    color: colors.textFaint,
    fontSize: 9.5,
    lineHeight: 13.5,
    marginTop: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    flex: 1,
    color: colors.textFaint,
    fontSize: 8.5,
    lineHeight: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  actionText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '600',
  },
});
