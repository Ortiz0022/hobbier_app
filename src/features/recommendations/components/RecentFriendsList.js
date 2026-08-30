import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

const placeholderColors = [colors.salmonSoft, '#BDECF3', '#FFE2C2'];

const formatRelativeTime = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Hace poco';

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'Ayer' : `Hace ${days} días`;
};

export const RecentFriendsList = ({ recentFriendPosts = [], onNavigateToFeed }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeaderRow}>
      <View style={styles.headingCopy}>
        <Text style={styles.sectionTitle}>La comunidad se mueve</Text>
        <Text style={styles.sectionSubtitle}>Pequeños logros que también inspiran.</Text>
      </View>
      <TouchableOpacity
        onPress={onNavigateToFeed}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Ver toda la actividad de la comunidad"
      >
        <Text style={styles.seeAllLink}>Ver todo</Text>
      </TouchableOpacity>
    </View>

    {recentFriendPosts.length === 0 ? (
      <TouchableOpacity
        style={styles.emptyCard}
        onPress={onNavigateToFeed}
        activeOpacity={0.9}
        accessibilityRole="button"
      >
        <View style={styles.emptyAvatars}>
          <View style={[styles.miniAvatar, styles.miniAvatarBack]} />
          <View style={[styles.miniAvatar, styles.miniAvatarFront]}>
            <Feather name="users" size={18} color={colors.primary} />
          </View>
        </View>
        <View style={styles.emptyCopy}>
          <Text style={styles.emptyTitle}>Inspírense juntos</Text>
          <Text style={styles.emptyText}>Agrega amigos y celebren cada hobby que prueben.</Text>
        </View>
        <Feather name="arrow-up-right" size={18} color={colors.primary} />
      </TouchableOpacity>
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {recentFriendPosts.map((post, index) => {
          const authorName = post.author?.full_name || post.author?.username || 'Alguien';
          const activityTitle = post.activityTitle
            || post.user_activity?.activity?.title
            || 'una actividad nueva';

          return (
            <TouchableOpacity
              key={post.id}
              style={styles.activityCard}
              onPress={onNavigateToFeed}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`${authorName} completó ${activityTitle}`}
            >
              <View style={styles.mediaContainer}>
                {post.image_url ? (
                  <Image
                    source={{ uri: post.image_url }}
                    style={styles.activityImage}
                    resizeMode="cover"
                    accessibilityLabel={`Evidencia de ${activityTitle}`}
                  />
                ) : (
                  <View
                    style={[
                      styles.imagePlaceholder,
                      { backgroundColor: placeholderColors[index % placeholderColors.length] },
                    ]}
                  >
                    <Feather name="camera" size={30} color={colors.primaryDark} />
                    <Text style={styles.placeholderText}>Momento Hobbier</Text>
                  </View>
                )}

                <View style={styles.pointsPill}>
                  <Feather name="star" size={11} color={colors.accentDark} />
                  <Text style={styles.pointsPillText}>+{post.pointsAwarded || 20}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.authorRow}>
                  {post.author?.avatar_url ? (
                    <Image source={{ uri: post.author.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>{authorName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
                </View>

                <Text style={styles.activityTitle} numberOfLines={2}>{activityTitle}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.timeAgo}>{formatRelativeTime(post.created_at)}</Text>
                  <Feather name="arrow-right" size={14} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    )}
  </View>
);

const styles = StyleSheet.create({
  sectionContainer: { marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 14,
  },
  headingCopy: { flex: 1, paddingRight: 12 },
  sectionTitle: {
    color: colors.text, fontSize: 19, lineHeight: 25,
    fontWeight: '500', letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2,
  },
  seeAllLink: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  horizontalList: { gap: 12, paddingRight: 2 },
  activityCard: {
    width: 178, backgroundColor: colors.surface, borderRadius: 22,
    borderWidth: 1, borderColor: colors.surfaceMuted, overflow: 'hidden',
  },
  mediaContainer: {
    height: 132, backgroundColor: colors.surfaceMuted, position: 'relative',
  },
  activityImage: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  placeholderText: { color: colors.primaryDark, fontSize: 11 },
  pointsPill: {
    position: 'absolute', top: 10, right: 10, flexDirection: 'row',
    alignItems: 'center', gap: 3, backgroundColor: '#FFF5EA',
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5,
  },
  pointsPillText: { color: colors.accentDark, fontSize: 10, fontWeight: '600' },
  cardBody: { padding: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatar: {
    width: 25, height: 25, borderRadius: 13,
    borderWidth: 1, borderColor: colors.salmonSoft,
  },
  avatarPlaceholder: {
    width: 25, height: 25, borderRadius: 13, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: colors.primary, fontSize: 10, fontWeight: '600' },
  authorName: {
    flex: 1, color: colors.textFaint, fontSize: 11, fontWeight: '500',
  },
  activityTitle: {
    minHeight: 38, color: colors.text, fontSize: 14, lineHeight: 19,
    fontWeight: '500', marginTop: 9,
  },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 8,
  },
  timeAgo: { color: colors.textMuted, fontSize: 10 },
  emptyCard: {
    minHeight: 106, flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: colors.surfaceAccent, borderRadius: 24, padding: 17,
  },
  emptyAvatars: { width: 55, height: 50, position: 'relative' },
  miniAvatar: {
    position: 'absolute', width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: colors.onPrimary,
  },
  miniAvatarBack: { top: 0, right: 0, backgroundColor: colors.salmonSoft },
  miniAvatarFront: {
    bottom: 0, left: 0, backgroundColor: '#D7F3F7',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
  emptyText: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: 3 },
});
