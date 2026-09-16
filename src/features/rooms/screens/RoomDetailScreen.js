import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  FlatList,
  Alert,
  Platform,
  Modal,
  Pressable
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { useRoomDetails } from '../hooks/useRoomDetails';
import { useRoomChat } from '../hooks/useRoomChat';
import { useEvidenceUploader } from '../hooks/useEvidenceUploader';
import { useRoomActions } from '../hooks/useRoomActions';
import { useAuth } from '../../../context/AuthContext';

import { ChatThread } from '../components/ChatThread';
import { RoomRankingItem } from '../components/RoomRankingItem';
import { colors, spacing, fonts, radii } from '../../../theme';
import { useSignedUrl } from '../hooks/useSignedUrl';
import { isRoomClosed as getIsRoomClosed } from '../utils/roomHelpers';

export const RoomDetailScreen = ({ roomId, onBack }) => {
  const { user } = useAuth();
  const { room, ranking, loading: detailsLoading, error: detailsError, refetch } = useRoomDetails(roomId);
  const { messages, loading: chatLoading, hasMore, fetchMoreMessages, sendMessage, retryMessage, discardMessage } = useRoomChat(roomId);
  const { submitEvidence, uploading: evidenceUploading } = useEvidenceUploader(roomId);
  const { closeRoom, deleteRoom, uploadCover, loading: actionLoading } = useRoomActions();

  const { url: coverUrl } = useSignedUrl('room-images', room?.image_path);

  const [activeTab, setActiveTab] = useState('Reto'); // 'RETO', 'CHAT', 'RANKING'
  const [adminModalVisible, setAdminModalVisible] = useState(false);

  if (detailsLoading && !room) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (detailsError || !room) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorText}>No se pudo cargar la sala.</Text>
        <TouchableOpacity style={styles.backBtnError} onPress={onBack}>
          <Text style={styles.backBtnErrorText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = room.owner_id === user?.id;
  const isClosed = getIsRoomClosed(room);
  const isActiveWithoutDeadline = room.status === 'ACTIVE' && !room.end_at;

  const getStatusText = () => {
    if (isClosed) return 'Reto finalizado';
    if (isActiveWithoutDeadline) return 'Reto activo · Sin fecha límite';
    return `Reto activo · Finaliza el ${new Date(room.end_at).toLocaleDateString()}`;
  };

  const handlePickEvidence = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      try {
        await submitEvidence(result.assets[0].uri);
        refetch();
        setActiveTab('CHAT');
      } catch (err) {
        alert(err.message || 'Error registrando evidencia');
      }
    }
  };

  const handlePickCover = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      try {
        await uploadCover(roomId, result.assets[0].uri);
        refetch();
      } catch (err) {
        alert(err.message || 'Error actualizando portada');
      }
    }
  };

  const confirmClose = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de cerrar la sala? Ya no se podrán subir avances ni chatear.')) {
        closeRoom(roomId).then(refetch);
      }
    } else {
      Alert.alert('Cerrar sala', '¿Estás seguro de cerrar la sala? Ya no se podrán subir avances ni chatear.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sala', style: 'destructive', onPress: () => closeRoom(roomId).then(refetch) }
      ]);
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar la sala? Esta acción no se puede deshacer.')) {
        deleteRoom(roomId).then(onBack);
      }
    } else {
      Alert.alert('Eliminar sala', '¿Eliminar la sala? Esta acción no se puede deshacer.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteRoom(roomId).then(onBack) }
      ]);
    }
  };

  const alert = (msg) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Aviso', msg);
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['Reto', 'Chat', 'Ranking'].map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRetoTab = () => {
    const ownerMember = room.members?.find((m) => m.role === 'OWNER' || m.profile?.id === room.owner_id);
    const ownerName = ownerMember?.profile?.full_name || (ownerMember?.profile?.username ? `@${ownerMember.profile.username}` : 'Anfitrión');

    return (
      <View style={styles.retoTabWrapper}>
        <ScrollView contentContainerStyle={styles.lobbyScrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {/* 1. HERO LOBBY BANNER */}
          <View style={styles.lobbyHero}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.lobbyHeroImage} resizeMode="cover" />
            ) : (
              <View style={[styles.lobbyHeroImage, { backgroundColor: colors.primaryDark }]} />
            )}

            <View style={styles.lobbyHeroOverlay}>
              {isOwner && (
                <TouchableOpacity style={styles.coverEditBtn} onPress={handlePickCover} disabled={actionLoading}>
                  <Feather name="camera" size={16} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.lobbyContent}>
            {/* INFO DE LA SALA (FUERA DE LA IMAGEN) */}
            <View style={styles.headerInfoContainer}>
              <View style={[styles.statusBadgeInline, isClosed && styles.statusBadgeInlineClosed]}>
                <View style={[styles.statusDot, isClosed && { backgroundColor: colors.textFaint }]} />
                <Text style={[styles.statusText, isClosed && styles.statusTextClosed]}>{getStatusText()}</Text>
              </View>
              <Text style={styles.lobbyTitleDark}>{room.name}</Text>
              <Text style={styles.lobbySubtitleDark}>Anfitrión: {ownerName}</Text>
            </View>
            {/* 2. FACEPILE MEMBERS */}
            <View style={styles.membersRow}>
              <View style={styles.membersFacepile}>
                {ranking?.slice(0, 5).map((m, i) => (
                  <View key={m.user_id || i} style={[styles.avatarCircle, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -14 }]}>
                    {m.avatar_url ? (
                      <Image source={{ uri: m.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{m.username?.charAt(0)?.toUpperCase() || 'H'}</Text>
                    )}
                  </View>
                ))}
                {ranking?.length > 5 && (
                  <View style={[styles.avatarCircle, { zIndex: 0, marginLeft: -14, backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[styles.avatarText, { color: colors.text }]}>+{ranking.length - 5}</Text>
                  </View>
                )}
                {(!ranking || ranking.length === 0) && (
                  <View style={[styles.avatarCircle, { zIndex: 10 }]}>
                    <Text style={styles.avatarText}>H</Text>
                  </View>
                )}
              </View>
              <Text style={styles.membersCountText}>{ranking?.length || 1} Hobbiers en sala</Text>
            </View>

            {/* 3. MISSION BOX */}
            <View style={styles.missionBox}>
              <View style={styles.missionHeaderRow}>
                <View style={styles.missionEyebrow}>
                  <Feather name="target" size={14} color={colors.primary} />
                  <Text style={styles.missionEyebrowText}>MISIÓN ACTUAL</Text>
                </View>
                <View style={styles.pointsPill}>
                  <Feather name="star" size={12} color="#C2530A" style={{ marginRight: 4 }} />
                  <Text style={styles.pointsPillText}>+{room.challenge?.points_awarded || 0} pts</Text>
                </View>
              </View>

              <Text style={styles.missionTitle}>{room.challenge?.title || 'Reto de la sala'}</Text>

              {room.challenge?.description ? (
                <Text style={styles.missionDesc}>{room.challenge?.description}</Text>
              ) : null}
            </View>
          </View>
        </ScrollView>

        {/* 4. STICKY FOOTER PARA REGISTRAR AVANCE */}
        {!isClosed && (
          <View style={styles.stickyFooterContainer}>
            <TouchableOpacity
              style={[styles.submitEvidenceBtn, evidenceUploading && { opacity: 0.7 }]}
              onPress={handlePickEvidence}
              disabled={evidenceUploading}
              activeOpacity={0.85}
            >
              {evidenceUploading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Feather name="camera" size={19} color={colors.onPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.submitEvidenceBtnText}>Registrar avance</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderChatTab = () => (
    <ChatThread
      messages={messages}
      loading={chatLoading}
      onLoadOlder={fetchMoreMessages}
      currentUserId={user?.id}
      onSend={sendMessage}
      onRetry={retryMessage}
      onDiscard={discardMessage}
      readOnly={isClosed}
      readOnlyText="El reto finalizó. Chat en modo solo lectura."
    />
  );

  const renderRankingTab = () => (
    <FlatList
      data={ranking}
      keyExtractor={item => item.user_id}
      contentContainerStyle={styles.tabContent}
      ListHeaderComponent={
        isClosed ? (
          <View style={styles.rankingFinalBanner}>
            <Feather name="award" size={24} color={colors.accent} />
            <Text style={styles.rankingFinalText}>Ranking Final</Text>
          </View>
        ) : null
      }
      renderItem={({ item, index }) => (
        <RoomRankingItem user={item} position={index + 1} isFinal={isClosed} />
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No hay miembros en el ranking aún.</Text>
      }
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Sala de Reto</Text>
        {isOwner ? (
          <TouchableOpacity onPress={() => setAdminModalVisible(true)} style={{ width: 24, alignItems: 'center' }}>
            <Feather name="more-horizontal" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {renderTabs()}

      <View style={styles.contentArea}>
        {activeTab === 'Reto' && renderRetoTab()}
        {activeTab === 'Chat' && renderChatTab()}
        {activeTab === 'Ranking' && renderRankingTab()}
      </View>

      <Modal
        visible={adminModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAdminModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAdminModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Administración de Sala</Text>

            {!isClosed && (
              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => { setAdminModalVisible(false); confirmClose(); }}
                disabled={actionLoading}
              >
                <Feather name="x-circle" size={18} color={colors.text} style={{ marginRight: 10 }} />
                <Text style={styles.modalActionText}>Cerrar Reto</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.modalActionBtn, styles.modalDeleteBtn]}
              onPress={() => { setAdminModalVisible(false); confirmDelete(); }}
              disabled={actionLoading}
            >
              <Feather name="trash-2" size={18} color={colors.danger} style={{ marginRight: 10 }} />
              <Text style={styles.modalDeleteText}>Eliminar Sala</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  backBtnError: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
  },
  backBtnErrorText: {
    color: colors.text,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceMuted,
    borderRadius: 17, padding: 4, marginHorizontal: 16, marginBottom: 8, marginTop: 8,
  },
  tabButton: {
    flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderRadius: 13,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    color: colors.textMuted, fontSize: 13, fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  contentArea: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 3,
  },
  retoTabWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  lobbyScrollContent: {
    paddingBottom: 28,
  },
  lobbyHero: {
    width: '100%',
    height: 140,
    backgroundColor: colors.primaryDark,
    position: 'relative',
  },
  lobbyHeroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  lobbyHeroOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  coverEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfoContainer: {
    marginBottom: 20,
  },
  statusBadgeInline: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F6F8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    marginBottom: 12,
  },
  statusBadgeInlineClosed: {
    backgroundColor: colors.surfaceMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  statusTextClosed: {
    color: colors.textFaint,
  },
  lobbyTitleDark: {
    fontSize: 22,
    fontFamily: fonts.heading,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  lobbySubtitleDark: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  lobbyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  membersFacepile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  membersCountText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  missionBox: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  missionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  missionEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionEyebrowText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEEDD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pointsPillText: {
    color: '#C2530A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  missionTitle: {
    fontSize: 17,
    fontFamily: fonts.heading,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  missionDesc: {
    fontSize: 14,
    color: colors.textFaint,
    lineHeight: 20,
  },
  stickyFooterContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 16 : 14,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F5',
  },
  submitEvidenceBtn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(12, 138, 166, 0.35)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
    }),
  },
  submitEvidenceBtnText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  adminActions: {
    marginTop: spacing.xl * 2,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    paddingTop: spacing.lg,
  },
  closeBtn: {
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  closeBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.input,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  rankingFinalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    padding: spacing.md,
    borderRadius: radii.card,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  rankingFinalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginLeft: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalGrabber: {
    width: 40,
    height: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: fonts.heading,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: 999,
    marginBottom: 12,
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalDeleteBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  }
});
