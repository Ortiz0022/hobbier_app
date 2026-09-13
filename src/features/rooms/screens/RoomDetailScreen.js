import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';

import { useRoomDetails } from '../hooks/useRoomDetails';
import { useRoomChat } from '../hooks/useRoomChat';
import { useEvidenceUploader } from '../hooks/useEvidenceUploader';
import { useRoomActions } from '../hooks/useRoomActions';
import { useAuth } from '../../../context/AuthContext';

import { RoomMessageBubble } from '../components/RoomMessageBubble';
import { RoomRankingItem } from '../components/RoomRankingItem';
import { colors, spacing, fonts, radii, primaryButton } from '../../../theme';
import { useSignedUrl } from '../hooks/useSignedUrl';
import { isRoomClosed as getIsRoomClosed } from '../utils/roomHelpers';

export const RoomDetailScreen = ({ roomId, onBack }) => {
  const { user } = useAuth();
  const { room, ranking, loading: detailsLoading, error: detailsError, refetch } = useRoomDetails(roomId);
  const { messages, loading: chatLoading, hasMore, fetchMoreMessages, sendMessage } = useRoomChat(roomId);
  const { submitEvidence, uploading: evidenceUploading } = useEvidenceUploader(roomId);
  const { closeRoom, deleteRoom, uploadCover, loading: actionLoading } = useRoomActions();
  
  const { url: coverUrl } = useSignedUrl('room-images', room?.image_path);

  const [activeTab, setActiveTab] = useState('RETO'); // 'RETO', 'CHAT', 'RANKING'
  const [textMessage, setTextMessage] = useState('');

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

  const handleSendText = async () => {
    if (!textMessage.trim() || isClosed) return;
    try {
      await sendMessage(textMessage);
      setTextMessage('');
    } catch (e) {
      alert(e.message || 'Error enviando mensaje');
    }
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
          <Text style={styles.pointsPillText}>+{room.challenge?.points_awarded || 0} pts por avance</Text>
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

      {isOwner && (
        <View style={styles.adminActions}>
          <Text style={styles.sectionTitle}>Administración</Text>
          {!isClosed && (
            <TouchableOpacity style={styles.closeBtn} onPress={confirmClose} disabled={actionLoading}>
              <Text style={styles.closeBtnText}>Cerrar Reto</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} disabled={actionLoading}>
            <Text style={styles.deleteBtnText}>Eliminar Sala</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderChatTab = () => (
    <KeyboardAvoidingView 
      style={styles.chatContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.chatListContent}
        onEndReached={fetchMoreMessages}
        onEndReachedThreshold={0.5}
        ListFooterComponent={chatLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 20 }} /> : null}
        renderItem={({ item }) => (
          <RoomMessageBubble message={item} isMe={item.sender?.id === user?.id} />
        )}
        ListEmptyComponent={
          !chatLoading ? (
            <View style={styles.emptyChatContainer}>
              <Text style={styles.emptyChatText}>No hay mensajes aún.</Text>
            </View>
          ) : null
        }
      />
      {!isClosed ? (
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Escribe un mensaje..."
            value={textMessage}
            onChangeText={setTextMessage}
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleSendText}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !textMessage.trim() && { opacity: 0.5 }]} 
            onPress={handleSendText}
            disabled={!textMessage.trim()}
          >
            <Feather name="send" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.chatClosedBanner}>
          <Text style={styles.chatClosedText}>El reto finalizó. Chat en modo solo lectura.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
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
        <View style={{ width: 24 }} />
      </View>
      
      {renderTabs()}

      <View style={styles.contentArea}>
        {activeTab === 'RETO' && renderRetoTab()}
        {activeTab === 'CHAT' && renderChatTab()}
        {activeTab === 'RANKING' && renderRankingTab()}
      </View>
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
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
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
    backgroundColor: colors.accentSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pointsPillText: {
    color: colors.danger,
    fontWeight: 'bold',
    fontSize: 12,
  },
  submitEvidenceBtn: {
    ...primaryButton,
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
  chatContainer: {
    flex: 1,
  },
  chatListContent: {
    padding: spacing.md,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scaleY: -1 }], // Ya que la lista es inverted, invertimos el texto
  },
  emptyChatText: {
    color: colors.textMuted,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatClosedBanner: {
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.textFaint,
  },
  chatClosedText: {
    color: colors.textFaint,
    fontWeight: '600',
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
  }
});
