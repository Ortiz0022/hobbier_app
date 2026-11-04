import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Image, Modal, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '../../components/scaledText';
import { RefreshControl } from '../../components/refrescoArrastrando';
import { ReactionStarIcon } from '../../components/StarReactionButton';
import { UserProfileModal } from '../../components/UserProfileModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeValues } from '../../context/ThemeContext';
import { createThemeStyles } from '../../theme/themeRuntime';
import { formatTimeAgo } from '../../utils/dateFormat';
import { useReceivedLikes } from './hooks/useReceivedLikes';

export const ReceivedLikesScreen = ({ onBack, onOpenChat }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { colors, styles } = useThemeValues(getReceivedLikesTheme);
  const { reactions, loading, loadingMore, hasMore, error, moreError, refetch, loadMore } = useReceivedLikes(user?.id);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedUser) { setSelectedUser(null); return true; }
      if (selectedPost) { setSelectedPost(null); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [selectedUser, selectedPost]);

  const retry = (message, action) => (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{message}</Text>
      <TouchableOpacity style={styles.retry} onPress={action} accessibilityRole="button">
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const person = item.liker;
    const name = person?.username ? `@${person.username}` : person?.full_name || t('received_likes.unknown_user');
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.person}
          activeOpacity={0.7}
          disabled={!person?.id}
          onPress={() => setSelectedUser(person)}
          accessibilityRole="button"
          accessibilityLabel={name}
        >
          {person?.avatar_url ? (
            <Image source={{ uri: person.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.initial}>{(person?.username || person?.full_name || '?')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.copy}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.description}>{t('received_likes.liked_post')}</Text>
            <Text style={styles.time}>{formatTimeAgo(item.created_at, language)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.thumbnailButton}
          onPress={() => setSelectedPost(item.post)}
          disabled={!item.post?.image_url}
          accessibilityRole="button"
          accessibilityLabel={t('received_likes.view_post')}
        >
          {item.post?.image_url && <Image source={{ uri: item.post.image_url }} style={styles.thumbnail} resizeMode="cover" />}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('received_likes.title')}</Text>
        <View style={styles.headerButton}>
          <ReactionStarIcon size={24} color={colors.accent} />
        </View>
      </View>
      <Text style={styles.subtitle}>{t('received_likes.subtitle')}</Text>
      {loading && reactions.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={reactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          extraData={language}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
          onEndReached={() => { if (hasMore && !moreError) loadMore(); }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={error && reactions.length > 0 ? retry(t('received_likes.load_error'), refetch) : null}
          ListEmptyComponent={error ? retry(t('received_likes.load_error'), refetch) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><ReactionStarIcon size={34} color={colors.accent} /></View>
              <Text style={styles.emptyTitle}>{t('received_likes.empty_title')}</Text>
              <Text style={styles.emptyHint}>{t('received_likes.empty_hint')}</Text>
            </View>
          )}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : moreError ? retry(t('received_likes.more_error'), loadMore) : null}
        />
      )}
      <UserProfileModal
        visible={!!selectedUser}
        userProfile={selectedUser}
        onClose={() => setSelectedUser(null)}
        onSendMessage={(friend) => { setSelectedUser(null); onOpenChat(friend); }}
      />
      <Modal visible={!!selectedPost} transparent animationType="fade" onRequestClose={() => setSelectedPost(null)}>
        <SafeAreaView style={styles.preview}>
          <View style={styles.previewHeader}>
            <TouchableOpacity style={styles.headerButton} onPress={() => setSelectedPost(null)} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Feather name="x" size={25} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {selectedPost?.image_url && <Image source={{ uri: selectedPost.image_url }} style={styles.previewImage} resizeMode="contain" />}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export const getReceivedLikesTheme = createThemeStyles((theme) => {
  const { colors } = theme;
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 8 },
    headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1, color: colors.text, fontSize: 23, fontWeight: '700' },
    subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, paddingHorizontal: 22, paddingBottom: 18 },
    list: { flexGrow: 1, paddingBottom: 24 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 12 },
    person: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    initial: { color: colors.primary, fontSize: 18, fontWeight: '600' },
    copy: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontSize: 14, fontWeight: '600' },
    description: { color: colors.text, fontSize: 12, lineHeight: 17, marginTop: 3 },
    time: { color: colors.textMuted, fontSize: 11, marginTop: 5 },
    thumbnailButton: { width: 48, height: 60, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
    thumbnail: { width: '100%', height: '100%' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingVertical: 48 },
    emptyIcon: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, marginBottom: 20 },
    emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '600', textAlign: 'center' },
    emptyHint: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
    notice: { padding: 24, alignItems: 'center' },
    noticeText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
    retry: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.primarySoft, marginTop: 12 },
    retryText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
    spinner: { padding: 20 },
    preview: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    previewHeader: { alignItems: 'flex-end', padding: 12 },
    previewImage: { flex: 1, width: '100%', marginBottom: 20 },
  });
  return { colors, styles };
});
