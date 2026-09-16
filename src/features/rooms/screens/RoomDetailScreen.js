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

import { useRoomDetails } from '../hooks/useRoomDetails';
import { useRoomChat } from '../hooks/useRoomChat';
import { useEvidenceUploader } from '../hooks/useEvidenceUploader';
import { useRoomActions } from '../hooks/useRoomActions';
import { useAuth } from '../../../context/AuthContext';

import { ChatThread } from '../components/ChatThread';
import { RoomRankingItem } from '../components/RoomRankingItem';
import { colors, spacing, fonts, radii, primaryButton } from '../../../theme';
import { useSignedUrl } from '../hooks/useSignedUrl';
import { isRoomClosed as getIsRoomClosed } from '../utils/roomHelpers';

export const RoomDetailScreen = ({ roomId, onBack }) => {
  const { user } = useAuth();
  const { room, ranking, loading: detailsLoading, error: detailsError, refetch } = useRoomDetails(roomId);
  const { messages, loading: chatLoading, hasMore, fetchMoreMessages, sendMessage, retryMessage, discardMessage } = useRoomChat(roomId);
  const { submitEvidence, uploading: evidenceUploading } = useEvidenceUploader(roomId);
  const { closeRoom, deleteRoom, uploadCover, loading: actionLoading } = useRoomActions();
  
  const { url: coverUrl } = useSignedUrl('room-images', room?.image_path);

  const [activeTab, setActiveTab] = useState('RETO'); // 'RETO', 'CHAT', 'RANKING'
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
        refetch(); // Reload ranking and details
        setActiveTab('CHAT'); // Vamos al chat para verla
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
        refetch(); // recargar para mostrar la nueva portada
      } catch (err) {
        alert(err.message || 'Error actualizando portada');
      }
    }
  };

  const confirmClose = () => {
    if (Platform.OS === 'web') {
      if(window.confirm('¿Estás seguro de cerrar la sala? Ya no se podrán subir avances ni chatear.')) {
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
      if(window.confirm('¿Eliminar la sala? Esta acción no se puede deshacer.')) {
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
      {['RETO', 'CHAT', 'RANKING'].map(tab => (
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

  const renderRetoTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.coverContainer}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Feather name="image" size={48} color={colors.primarySoft} />
            {isOwner && <Text style={{ color: colors.primaryDark, marginTop: 8 }}>Toca para añadir portada</Text>}
          </View>
        )}
        
        {isOwner && (
          <TouchableOpacity 
            style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: coverUrl ? 'rgba(0,0,0,0.3)' : 'transparent' }]}
            onPress={handlePickCover}
            disabled={actionLoading}
          >
            {coverUrl && <Feather name="edit-2" size={32} color="#FFF" style={{opacity: 0.8}} />}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.roomName}>{room.name}</Text>
      
      <View style={[styles.statusBadge, isClosed && styles.statusBadgeClosed]}>
        <Feather name={isClosed ? 'check-circle' : 'activity'} size={14} color={isClosed ? colors.textFaint : colors.primaryDark} />
        <Text style={[styles.statusText, isClosed && styles.statusTextClosed]}>{getStatusText()}</Text>
      </View>

      <View style={styles.challengeBox}>
        <Text style={styles.sectionTitle}>Reto seleccionado</Text>
        <Text style={styles.challengeTitle}>{room.challenge?.title}</Text>
        {room.challenge?.description && (
          <Text style={styles.challengeDesc}>{room.challenge?.description}</Text>
        )}
        <View style={styles.pointsPill}>
          <Feather name="star" size={12} color={colors.primaryDark} style={{ marginRight: 4 }} />
          <Text style={styles.pointsPillText}>+{room.challenge?.points_awarded || 0} pts</Text>
        </View>
      </View>

      {!isClosed && (
        <TouchableOpacity 
          style={[styles.submitEvidenceBtn, evidenceUploading && { opacity: 0.7 }]}
          onPress={handlePickEvidence}
          disabled={evidenceUploading}
        >
          {evidenceUploading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Feather name="camera" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.submitEvidenceBtnText}>Registrar avance</Text>
            </>
          )}
        </TouchableOpacity>
      )}


    </ScrollView>
  );

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
        <Text style={styles.headerTitle} numberOfLines={1}>{room.name}</Text>
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
        {activeTab === 'RETO' && renderRetoTab()}
        {activeTab === 'CHAT' && renderChatTab()}
        {activeTab === 'RANKING' && renderRankingTab()}
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
                <Feather name="x-circle" size={18} color={colors.text} style={{marginRight: 10}} />
                <Text style={styles.modalActionText}>Cerrar Reto</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.modalActionBtn, styles.modalDeleteBtn]} 
              onPress={() => { setAdminModalVisible(false); confirmDelete(); }} 
              disabled={actionLoading}
            >
              <Feather name="trash-2" size={18} color={colors.danger} style={{marginRight: 10}} />
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
  coverContainer: {
    width: '100%',
    height: 180,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.md,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  statusBadgeClosed: {
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  statusTextClosed: {
    color: colors.textFaint,
  },
  challengeBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  challengeDesc: {
    fontSize: 14,
    color: colors.textFaint,
    marginBottom: spacing.md,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  pointsPillText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 12,
  },
  submitEvidenceBtn: {
    ...primaryButton,
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: 'row',
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
    borderRadius: 999, // Pill shape
    marginBottom: 12,
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalDeleteBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.05)', // pastel salmon
    borderColor: 'rgba(255, 59, 48, 0.3)', // subtle red border
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  }
});
