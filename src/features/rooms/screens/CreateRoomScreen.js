import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  Switch
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { useRoomActions } from '../hooks/useRoomActions';
import { supabase } from '../../../config/supabase';
import { getFriendsList } from '../../../services/socialService';
import { useAuth } from '../../../context/AuthContext';
import { colors, spacing, fonts, radii, input, primaryButton, card } from '../../../theme';

export const CreateRoomScreen = ({ onBack, onRoomCreated }) => {
  const { user } = useAuth();
  const { createRoom, uploadCover, inviteFriend } = useRoomActions();
  
  const [name, setName] = useState('');
  const [coverUri, setCoverUri] = useState(null);
  
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  
  const [hasDeadline, setHasDeadline] = useState(false);
  // daysToAdd can be 7, 14, 30, or 'custom'
  const [daysToAdd, setDaysToAdd] = useState(7); 
  const [customDateStr, setCustomDateStr] = useState(''); // YYYY-MM-DD
  
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      // Cargar actividades globales
      const { data: actData } = await supabase.from('activities').select('*');
      setActivities(actData || []);
      
      // Cargar amigos
      const { friends: friendsData } = await getFriendsList(user.id);
      setFriends(friendsData || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingData(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const toggleFriend = (friendId) => {
    const newSet = new Set(selectedFriends);
    if (newSet.has(friendId)) newSet.delete(friendId);
    else newSet.add(friendId);
    setSelectedFriends(newSet);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return alert('Debes ingresar un nombre para la sala.');
    if (!selectedActivityId) return alert('Debes seleccionar un reto.');
    
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      let endAt = null;
      if (hasDeadline) {
        if (daysToAdd === 'custom') {
          const parsed = new Date(customDateStr);
          if (isNaN(parsed.getTime()) || parsed <= new Date()) {
            return alert('Por favor ingresa una fecha futura válida (YYYY-MM-DD).');
          }
          endAt = parsed.toISOString();
        } else {
          const d = new Date();
          d.setDate(d.getDate() + daysToAdd);
          endAt = d.toISOString();
        }
      }

      // 1. Crear sala
      const roomId = await createRoom({
        name: name.trim(),
        activityId: selectedActivityId,
        endAt,
      });

      let coverUploadError = false;
      // 2. Subir portada si hay
      if (coverUri) {
        try {
          await uploadCover(roomId, coverUri);
        } catch (uploadErr) {
          console.error("Error subiendo portada:", uploadErr);
          coverUploadError = true;
        }
      }

      // 3. Enviar invitaciones
      for (const friendId of selectedFriends) {
        try {
          await inviteFriend(roomId, friendId);
        } catch (inviteErr) {
          console.error(`Error invitando al amigo ${friendId}:`, inviteErr);
        }
      }

      // 4. Finalizar
      if (coverUploadError) {
        if (Platform.OS !== 'web') {
          Alert.alert('Aviso', 'La sala fue creada, pero no pudimos subir la portada. Podrás reintentarlo después.', [
            { text: 'Aceptar', onPress: () => onRoomCreated(roomId) }
          ]);
        } else {
          window.alert('La sala fue creada, pero no pudimos subir la portada. Podrás reintentarlo después.');
          onRoomCreated(roomId);
        }
      } else {
        onRoomCreated(roomId);
      }

    } catch (err) {
      console.error(err);
      alert(err.message || 'Ocurrió un error al crear la sala.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const alert = (msg) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Aviso', msg);
  };

  if (loadingData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Sala</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Nombre */}
        <Text style={styles.sectionTitle}>Nombre de la sala</Text>
        <TextInput 
          style={styles.textInput}
          placeholder="Ej: Reto Verano 2026"
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.textMuted}
        />

        {/* Portada */}
        <Text style={styles.sectionTitle}>Portada (Opcional)</Text>
        <TouchableOpacity style={styles.coverButton} onPress={pickImage}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Feather name="camera" size={24} color={colors.primary} />
              <Text style={styles.coverPlaceholderText}>Añadir foto de portada</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Reto */}
        <Text style={styles.sectionTitle}>Selecciona un Reto</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {activities.map(act => (
            <TouchableOpacity 
              key={act.id} 
              style={[styles.activityItem, selectedActivityId === act.id && styles.activityItemSelected]}
              onPress={() => setSelectedActivityId(act.id)}
            >
              <Text style={[styles.activityItemText, selectedActivityId === act.id && styles.activityItemTextSelected]}>
                {act.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Duración */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.sectionTitleSwitch}>Establecer fecha límite</Text>
            <Text style={styles.subtitleSwitch}>El reto finalizará automáticamente</Text>
          </View>
          <Switch 
            value={hasDeadline} 
            onValueChange={setHasDeadline} 
            trackColor={{ false: colors.surfaceMuted, true: colors.primarySoft }}
            thumbColor={hasDeadline ? colors.primary : '#f4f3f4'}
          />
        </View>

        {hasDeadline && (
          <View>
            <View style={styles.daysSelectorRow}>
              {[7, 14, 30].map(days => (
                <TouchableOpacity 
                  key={days} 
                  style={[styles.dayOption, daysToAdd === days && styles.dayOptionSelected]}
                  onPress={() => setDaysToAdd(days)}
                >
                  <Text style={[styles.dayOptionText, daysToAdd === days && styles.dayOptionTextSelected]}>
                    {days} días
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                  style={[styles.dayOption, daysToAdd === 'custom' && styles.dayOptionSelected]}
                  onPress={() => setDaysToAdd('custom')}
                >
                  <Text style={[styles.dayOptionText, daysToAdd === 'custom' && styles.dayOptionTextSelected]}>
                    Otra
                  </Text>
              </TouchableOpacity>
            </View>
            
            {daysToAdd === 'custom' && (
              <TextInput 
                style={[styles.textInput, { marginTop: spacing.md }]}
                placeholder="AAAA-MM-DD (Ej: 2026-12-31)"
                value={customDateStr}
                onChangeText={setCustomDateStr}
                placeholderTextColor={colors.textMuted}
              />
            )}
          </View>
        )}

        {/* Amigos */}
        <Text style={styles.sectionTitle}>Invitar Amigos</Text>
        {friends.length === 0 ? (
          <Text style={styles.emptyText}>No tienes amigos agregados aún.</Text>
        ) : (
          friends.map((item, index) => {
            const friend = item.profile;
            if (!friend) return null;
            const isSelected = selectedFriends.has(friend.id);
            return (
              <TouchableOpacity 
                key={item.friendshipId || `${friend.id}-${index}`} 
                style={[styles.friendItem, isSelected && styles.friendItemSelected]}
                onPress={() => toggleFriend(friend.id)}
              >
                {friend.avatar_url ? (
                  <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                ) : (
                  <View style={styles.friendAvatarPlaceholder}>
                    <Text style={styles.friendAvatarInitials}>
                      {friend.username?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.friendName}>{friend.full_name || friend.username}</Text>
                {isSelected && <Feather name="check-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} 
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>Crear Sala</Text>
          )}
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  textInput: {
    ...input,
    height: 50,
  },
  coverButton: {
    width: '100%',
    height: 150,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm,
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
  },
  coverPlaceholderText: {
    marginTop: spacing.sm,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  activityItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
  },
  activityItemSelected: {
    backgroundColor: colors.primary,
  },
  activityItemText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  activityItemTextSelected: {
    color: colors.onPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  sectionTitleSwitch: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitleSwitch: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  daysSelectorRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    justifyContent: 'space-between',
  },
  dayOption: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  dayOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  dayOptionText: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  dayOptionTextSelected: {
    color: colors.primaryDark,
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.input,
    marginBottom: 4,
  },
  friendItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  friendAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  friendAvatarInitials: {
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  submitButton: {
    ...primaryButton,
  },
  submitButtonText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
