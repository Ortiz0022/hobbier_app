import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Pressable,
} from 'react-native';
import { Text } from './scaledText';
import Feather from '@expo/vector-icons/Feather';
import { getUserPosts } from '../services/socialService';
import { getUserActivities } from '../services/activityService';
import { getCategoryLabel } from '../utils/category';

export const UserProfileModal = ({ visible, userProfile, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ points: 0, completedCount: 0 });
  const [posts, setPosts] = useState([]);
  const [viewerImage, setViewerImage] = useState(null);

  useEffect(() => {
    if (visible && userProfile?.id) {
      loadUserData(userProfile.id);
    } else {
      setPosts([]);
      setStats({ points: 0, completedCount: 0 });
    }
  }, [visible, userProfile?.id]);

  const loadUserData = async (userId) => {
    setLoading(true);
    try {
      const [actRes, postRes] = await Promise.all([
        getUserActivities(userId),
        getUserPosts(userId),
      ]);

      const completed = (actRes.activities || []).filter((a) => a.status === 'COMPLETED').length;
      setStats({
        points: userProfile.points || 0,
        completedCount: completed,
      });
      setPosts(postRes.posts || []);
    } catch (err) {
      console.error('Error cargando perfil de usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* ENCABEZADO DE MODAL */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Perfil de Hobbier</Text>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={20} color="#08333D" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* CABECERA DE PERFIL */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarRingLarge}>
              {userProfile.avatar_url ? (
                <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImageLarge} />
              ) : (
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarTextLarge}>
                    {(userProfile.full_name || userProfile.username || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.profileName}>{userProfile.full_name || `@${userProfile.username}`}</Text>
            <Text style={styles.profileUsername}>@{userProfile.username}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>✨ {stats.points} puntos</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>
                  {loading ? '…' : `🎨 ${stats.completedCount} actividades`}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionHeaderTitle}>PUBLICACIONES Y EVIDENCIA</Text>

          {loading ? (
            <ActivityIndicator color="#00DBFF" style={{ marginTop: 24 }} />
          ) : posts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="image" size={32} color="#8A908B" style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>Sin publicaciones</Text>
              <Text style={styles.emptyText}>
                Este usuario aún no ha compartido evidencia de sus actividades.
              </Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {posts.map((post, index) => {
                const title = post.user_activity?.activity?.title || 'Actividad completada';
                // Sin categoria se muestra "Libre": es un estado valido, no un vacio.
                const category = getCategoryLabel(post.user_activity?.activity?.category);
                const big = index === 0;
                return (
                  <TouchableOpacity
                    key={post.id}
                    activeOpacity={0.85}
                    onPress={() => setViewerImage({ uri: post.image_url, title, category })}
                    style={[styles.photoCard, big ? styles.photoCardBig : styles.photoCardSmall]}
                  >
                    <View style={styles.photoImageWrap}>
                      <Image
                        source={{ uri: post.image_url }}
                        style={[styles.photoImage, big ? styles.photoImageBig : styles.photoImageSmall]}
                      />
                      <View style={styles.photoOverlayContent}>
                        {(
                          <View style={styles.photoCategoryBadge}>
                            <Text style={styles.photoCategoryBadgeText} numberOfLines={1}>
                              {category}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.photoCardTitleOverlay} numberOfLines={1}>
                          {title}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* MODAL VISOR DE FOTO */}
        <Modal
          visible={!!viewerImage}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerImage(null)}
        >
          <Pressable style={styles.viewerOverlay} onPress={() => setViewerImage(null)}>
            {viewerImage && (
              <Pressable style={styles.viewerCard} onPress={() => {}}>
                <View style={styles.viewerImageWrap}>
                  <Image
                    source={{ uri: viewerImage.uri }}
                    style={styles.viewerImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.viewerCloseBtn}
                    onPress={() => setViewerImage(null)}
                  >
                    <Feather name="x" size={18} color="#08333D" />
                  </TouchableOpacity>
                </View>
                {(viewerImage.title || viewerImage.category) && (
                  <View style={styles.viewerCaption}>
                    {(
                      <View style={styles.viewerCategoryBadge}>
                        <Text style={styles.viewerCategoryBadgeText}>
                          {viewerImage.category || 'Libre'}
                        </Text>
                      </View>
                    )}
                    {viewerImage.title && (
                      <Text style={styles.viewerTitle}>{viewerImage.title}</Text>
                    )}
                  </View>
                )}
              </Pressable>
            )}
          </Pressable>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F5',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#08333D',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarRingLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#00DBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0C8AA6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: '#FFFFFF',
    fontSize: 34,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#121B22',
  },
  profileUsername: {
    fontSize: 14,
    color: '#8A908B',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statChip: {
    backgroundColor: '#FFEEDD',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  statChipText: {
    color: '#C2530A',
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '600',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#121B22',
    letterSpacing: 0.8,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    marginTop: 16,
  },
  emptyIcon: {
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#121B22',
    marginBottom: 4,
  },
  emptyText: {
    color: '#727773',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  photoCard: {
    marginBottom: 2,
  },
  photoCardBig: {
    width: '100%',
  },
  photoCardSmall: {
    width: '47%',
  },
  photoImageWrap: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F0F3F5',
  },
  photoImage: {
    width: '100%',
  },
  photoImageBig: {
    height: 170,
  },
  photoImageSmall: {
    height: 140,
  },
  photoOverlayContent: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    alignItems: 'flex-start',
    gap: 4,
  },
  photoCategoryBadge: {
    backgroundColor: 'rgba(0, 219, 255, 0.85)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  photoCategoryBadgeText: {
    color: '#08333D',
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  photoCardTitleOverlay: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewerCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  viewerImageWrap: {
    position: 'relative',
    width: '100%',
    height: 380,
    backgroundColor: '#000000',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCaption: {
    padding: 16,
  },
  viewerCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F3F5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  viewerCategoryBadgeText: {
    color: '#08333D',
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  viewerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#121B22',
  },
});
