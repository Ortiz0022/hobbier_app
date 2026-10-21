import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { radii, spacing, fonts } from "../../../theme";
import { usePresence } from '../../../context/PresenceContext';



export const RoomRankingItem = ({ user, position, isFinal }) => {
  const { theme, colors, styles } = useThemeValues(getRoomRankingItemTheme);

  const { isUserOnline } = usePresence();
  const isOnline = isUserOnline(user.id);

  const isFirst = position === 1;
  const isSecond = position === 2;
  const isThird = position === 3;
  const isTop3 = position <= 3;

  const getContainerStyle = () => {
    if (isFirst) return [styles.container, styles.firstPlaceContainer];
    if (isSecond || isThird) return [styles.container, styles.podiumContainer];
    return [styles.container, styles.defaultContainer];
  };

  const getAvatarStyle = () => {
    if (isFirst) return [styles.avatar, { borderWidth: 2, borderColor: theme.color(colors.accent, 'border') }];
    if (isSecond) return [styles.avatar, { borderWidth: 2, borderColor: theme.color(colors.primaryDark, 'border') }];
    return styles.avatar;
  };

  return (
    <View style={getContainerStyle()}>
      <View style={styles.positionContainer}>
        {isFirst ? (
          <View style={styles.firstPlaceMedal}>
            <Feather name="star" size={12} color={colors.accent} style={{ marginRight: 2 }} />
            <Text style={[styles.medalText, { color: colors.accent }]}>1</Text>
          </View>
        ) : isTop3 ? (
          <View style={[styles.medal, isSecond ? styles.secondMedal : styles.thirdMedal]}>
            <Text style={[styles.medalText, { color: isSecond ? colors.primaryDark : colors.textMuted }]}>{position}</Text>
          </View>
        ) : (
          <Text style={styles.positionText}>{position}</Text>
        )}
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={getAvatarStyle()} />
          ) : (
            <View style={[styles.avatarPlaceholder, getAvatarStyle()]}>
              <Text style={styles.avatarPlaceholderText}>
                {user.username?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>{user.full_name || user.username}</Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      <View style={styles.pointsContainer}>
        <View style={[styles.pointsBadge, isFirst ? styles.pointsBadgeFirst : isSecond ? styles.pointsBadgeSecond : styles.pointsBadgeDefault]}>
          <Text style={[styles.pointsBadgeText, isFirst ? styles.pointsTextFirst : isSecond ? styles.pointsTextSecond : styles.pointsTextDefault]}>
            +{user.total_points} pts
          </Text>
        </View>
      </View>
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getRoomRankingItemTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  firstPlaceContainer: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    paddingVertical: 18, 
    elevation: 4,
    borderWidth: 0,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  podiumContainer: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    elevation: 2,
    borderWidth: 0,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  defaultContainer: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
    elevation: 0,
  },
  positionContainer: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  firstPlaceMedal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color(colors.accent, 'border'),
    backgroundColor: theme.color('#FFFFFF', 'card'),
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondMedal: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderColor: theme.color(colors.primaryDark, 'border'),
  },
  thirdMedal: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderColor: theme.color(colors.textMuted, 'border'),
  },
  medalText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.heading,
    color: colors.text,
  },
  username: {
    fontSize: 12,
    marginTop: 2,
    color: colors.textMuted,
  },
  pointsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pointsBadgeFirst: {
    backgroundColor: colors.accent,
  },
  pointsBadgeSecond: {
    backgroundColor: colors.primarySoft,
  },
  pointsBadgeDefault: {
    backgroundColor: colors.surfaceMuted,
  },
  pointsBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pointsTextFirst: {
    color: theme.color('#FFFFFF', 'text'),
  },
  pointsTextSecond: {
    color: colors.primaryDark,
  },
  pointsTextDefault: {
    color: colors.text,
  },
  avatarWrapper: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.color('#4CAF50', 'card'),
    borderWidth: 2,
    borderColor: theme.color('#FFFFFF', 'border'),
  }
});
  return { theme, colors, styles };
});
