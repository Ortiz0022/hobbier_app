import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Switch,
  BackHandler,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRoomActions } from '../hooks/useRoomActions';
import { supabase } from '../../../config/supabase';
import { getFriendsList } from '../../../services/socialService';
import { createActivityAdmin } from '../../../services/adminService';
import { fetchActivityCategories, fetchAllCatalogs } from '../../../services/catalogService';
import { moderateActivityContent } from '../../../services/activityService';
import { OPCIONES_PUNTOS, normalizarNombre } from '../../../components/CreateActivityModal';
import { capitalizarTitulo } from '../../../utils/titleCase';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';
import { spacing, fonts, radii } from "../../../theme";
import { CalendarDateField } from '../../../components/CalendarDateField';
import { toISODate } from '../../auth/validation';
import { formatLongDate } from '../../../utils/dateFormat';

export const CreateRoomScreen = ({ onBack, onRoomCreated }) => {
  const { theme, colors, input, primaryButton, card, styles } = useThemeValues(getCreateRoomScreenTheme);

  const { user } = useAuth();
  const { notify } = useNotify();
  const { language, t } = useLanguage();
  const { createRoom, uploadCover, inviteFriend } = useRoomActions();
  
  const [name, setName] = useState('');
  const [coverUri, setCoverUri] = useState(null);
  
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [challengeQuery, setChallengeQuery] = useState('');

  // Campos para cuando la persona crea su propia actividad en el mismo input
  const [customDescription, setCustomDescription] = useState('');
  const [customPoints, setCustomPoints] = useState('20');
  const [categories, setCategories] = useState([]);
  const [likes, setLikes] = useState([]);
  const [customLikeId, setCustomLikeId] = useState(null);
  const [likeOpen, setLikeOpen] = useState(false);
  const [moderationError, setModerationError] = useState('');
  
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  
  const [hasDeadline, setHasDeadline] = useState(false);
  // daysToAdd can be 7, 14, 30, or 'custom'
  const [daysToAdd, setDaysToAdd] = useState(7); 
  const [customDateStr, setCustomDateStr] = useState(''); // YYYY-MM-DD
  
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Retroceso físico / gestual en creación de sala
  useEffect(() => {
    const onBackPress = () => {
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBack]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [{ data: actData }, { friends: friendsData }, { categories: catList }, { likes: likesList }] =
        await Promise.all([
          supabase.from('activities').select('*').eq('is_active', true),
          getFriendsList(user.id),
          fetchActivityCategories(),
          fetchAllCatalogs(),
        ]);
      setActivities(actData || []);
      setFriends(friendsData || []);
      setCategories(catList || []);
      setLikes(likesList || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingData(false);
    }
  };

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) || null,
    [activities, selectedActivityId]
  );

  // Filtra actividades de la base mientras la persona escribe
  const matchingActivities = useMemo(() => {
    const q = normalizarNombre(challengeQuery);
    if (!q) return activities.slice(0, 12);
    return activities
      .filter((act) => {
        const titleNorm = normalizarNombre(act.title);
        const descNorm = normalizarNombre(act.description);
        return titleNorm.includes(q) || descNorm.includes(q);
      })
      .slice(0, 6);
  }, [activities, challengeQuery]);

  const likeSeleccionado = useMemo(
    () => likes.find((l) => l.id === customLikeId) || null,
    [likes, customLikeId]
  );

  const nombreDeGusto = (nombre) => {
    const clave = `likes.${(nombre || '').toLowerCase()}`;
    const traducido = t(clave);
    return capitalizarTitulo(traducido === clave ? nombre : traducido);
  };

  const customCategoryId = useMemo(() => {
    if (!likeSeleccionado) return null;
    const gusto = normalizarNombre(likeSeleccionado.name);
    const cat = categories.find((c) => normalizarNombre(c.name).split(' y ')[0] === gusto);
    return cat ? cat.id : null;
  }, [likeSeleccionado, categories]);

  const handleChallengeTextChange = (text) => {
    setChallengeQuery(text);
    setModerationError('');
    if (selectedActivityId) {
      setSelectedActivityId(null);
    }
  };

  const handleSelectExistingActivity = (act) => {
    setSelectedActivityId(act.id);
    setChallengeQuery(act.title || '');
    setModerationError('');
  };

  const handleClearChallenge = () => {
    setSelectedActivityId(null);
    setChallengeQuery('');
    setModerationError('');
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

  const filteredFriends = useMemo(() => {
    const q = friendSearchQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((item) => {
      const fname = (item.profile?.full_name || '').toLowerCase();
      const uname = (item.profile?.username || '').toLowerCase();
      return fname.includes(q) || uname.includes(q);
    });
  }, [friends, friendSearchQuery]);

  const handleSubmit = async () => {
    if (!name.trim()) return alert(t('rooms.name_required') || 'Debes ingresar un nombre para la sala.');

    const trimmedCustomTitle = challengeQuery.trim();
    if (!selectedActivityId && !trimmedCustomTitle) {
      return alert(t('rooms.activity_required') || 'Debes seleccionar o escribir un reto.');
    }

    if (!selectedActivityId && !customDescription.trim()) {
      return notify(
        t('create_activity.required_fields') || 'Por favor completa el título y la descripción.',
        { type: 'warning', title: t('create_activity.warning') || 'Campos requeridos' }
      );
    }
    
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setModerationError('');
      
      let endAt = null;
      if (hasDeadline) {
        if (daysToAdd === 'custom') {
          const iso = toISODate(customDateStr);
          const parsed = iso ? new Date(`${iso}T23:59:59`) : null;
          if (!parsed || parsed <= new Date()) {
            setIsSubmitting(false);
            return alert(t('rooms.future_date_required') || 'Elige en el calendario una fecha futura.');
          }
          endAt = parsed.toISOString();
        } else {
          const d = new Date();
          d.setDate(d.getDate() + daysToAdd);
          endAt = d.toISOString();
        }
      }

      let finalActivityId = selectedActivityId;

      // Si no seleccionó una actividad existente de la base, creamos su actividad propia
      // pasando primero por la moderación de IA y usando los puntos cerrados.
      if (!finalActivityId) {
        const { isSafe, reason } = await moderateActivityContent(
          trimmedCustomTitle,
          customDescription.trim(),
          language
        );
        if (!isSafe) {
          setIsSubmitting(false);
          setModerationError(
            reason || 'El contenido de la actividad no está permitido según nuestras reglas de comunidad.'
          );
          return;
        }

        const { activity: createdAct, error: createActErr } = await createActivityAdmin({
          title: trimmedCustomTitle,
          description: customDescription.trim(),
          pointsAwarded: customPoints,
          minAge: '',
          maxAge: '',
          categoryId: customCategoryId,
          likeId: customLikeId,
          createdBy: user?.id,
        });

        if (createActErr || !createdAct?.id) {
          throw createActErr || new Error(t('create_activity.error_create') || 'Error al crear la actividad.');
        }

        finalActivityId = createdAct.id;
      }

      // 1. Crear sala
      const roomId = await createRoom({
        name: name.trim(),
        activityId: finalActivityId,
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
        notify(t('rooms.cover_error') || 'La sala fue creada, pero no pudimos subir la portada. Podrás reintentarlo después.', {
          type: 'warning',
          title: 'Aviso',
        });
      }
      onRoomCreated(roomId);

    } catch (err) {
      console.error(err);
      alert(err.message || t('rooms.create_error') || 'Ocurrió un error al crear la sala.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const alert = (msg) => notify(msg, { type: 'error', title: 'Aviso' });

  // Día de cierre en el idioma de la app, para 7/14/30 días o fecha elegida
  const deadlinePreview = (() => {
    if (!hasDeadline) return '';
    if (daysToAdd === 'custom') {
      const iso = toISODate(customDateStr);
      return iso ? formatLongDate(`${iso}T12:00:00`, language) : '';
    }
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    return formatLongDate(d, language);
  })();

  if (loadingData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isCreatingCustom = !selectedActivityId && challengeQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rooms.new_room') || 'Nueva Sala'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Nombre */}
        <Text style={styles.sectionTitle}>{t('rooms.room_name') || 'Nombre de la Sala'}</Text>
        <TextInput {...theme.textInputProps}
          style={styles.textInput}
          placeholder={t('rooms.room_name_placeholder') || "Ej: Reto Verano 2026"}
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.textMuted}
        />

        {/* Portada */}
        <Text style={styles.sectionTitle}>{t('rooms.cover_optional') || 'Portada (Opcional)'}</Text>
        <TouchableOpacity style={styles.coverButton} onPress={pickImage}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Feather name="camera" size={24} color={colors.primary} />
              <Text style={styles.coverPlaceholderText}>{t('rooms.add_cover_photo') || 'Añadir foto de portada'}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Reto: Búsqueda de existentes o creación propia en el mismo input */}
        <Text style={styles.sectionTitle}>{t('rooms.choose_challenge') || 'Selecciona un Reto'}</Text>
        <View style={styles.challengeInputWrapper}>
          <Feather
            name={selectedActivityId ? 'check-circle' : 'search'}
            size={18}
            color={selectedActivityId ? colors.primary : colors.textMuted}
            style={styles.challengeInputIcon}
          />
          <TextInput
            {...theme.textInputProps}
            style={styles.challengeTextInput}
            placeholder={
              t('rooms.challenge_input_placeholder') ||
              'Escribe tu propio reto o busca uno existente...'
            }
            value={challengeQuery}
            onChangeText={handleChallengeTextChange}
            placeholderTextColor={colors.textMuted}
          />
          {challengeQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearChallenge}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Si seleccionó una actividad de la base, mostrar ficha de confirmación */}
        {selectedActivity ? (
          <View style={styles.selectedChallengeCard}>
            <View style={styles.selectedChallengeHeader}>
              <View style={styles.selectedChallengeBadge}>
                <Feather name="bookmark" size={13} color={colors.primary} />
                <Text style={styles.selectedChallengeBadgeText}>
                  {t('rooms.catalog_challenge_badge') || 'Reto del catálogo seleccionado'}
                </Text>
              </View>
              <View style={styles.pointsBadgeSmall}>
                <Feather name="star" size={11} color={colors.primary} />
                <Text style={styles.pointsBadgeSmallText}>
                  +{selectedActivity.points_awarded || 20} {t('common.points_abbr') || 'pts'}
                </Text>
              </View>
            </View>
            <Text style={styles.selectedChallengeTitle}>{selectedActivity.title}</Text>
            {!!selectedActivity.description && (
              <Text style={styles.selectedChallengeDesc}>{selectedActivity.description}</Text>
            )}
          </View>
        ) : (
          <>
            {/* Sugerencias en vivo de actividades que ya existen en la base */}
            {matchingActivities.length > 0 && (
              <View style={styles.suggestionsBlock}>
                <Text style={styles.suggestionsLabel}>
                  {t('rooms.matching_activities') || 'Retos sugeridos del catálogo'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {matchingActivities.map((act) => (
                    <TouchableOpacity
                      key={act.id}
                      style={[
                        styles.activityItem,
                        selectedActivityId === act.id && styles.activityItemSelected,
                      ]}
                      onPress={() => handleSelectExistingActivity(act)}
                    >
                      <Text
                        style={[
                          styles.activityItemText,
                          selectedActivityId === act.id && styles.activityItemTextSelected,
                        ]}
                      >
                        {act.title}
                      </Text>
                      <Text style={styles.activityItemPoints}>
                        +{act.points_awarded || 20} {t('common.points_abbr') || 'pts'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Si escribió en el input y no seleccionó ninguna de la base: formulario de reto propio */}
            {isCreatingCustom && (
              <View style={styles.customChallengeCard}>
                <View style={styles.customChallengeHeader}>
                  <Feather name="edit-3" size={14} color={colors.primary} />
                  <Text style={styles.customChallengeBadgeText}>
                    {t('rooms.custom_challenge_badge') || 'Nuevo reto personalizado'}
                  </Text>
                </View>

                {moderationError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerTitle}>
                      {t('create_activity.inappropriate_content') ||
                        (language === 'en' ? 'Inappropriate Content' : 'Contenido Inapropiado')}
                    </Text>
                    <Text style={styles.errorBannerText}>{moderationError}</Text>
                  </View>
                ) : null}

                <Text style={styles.customFieldLabel}>
                  {t('create_activity.description') || 'Descripción'}
                </Text>
                <TextInput
                  {...theme.textInputProps}
                  style={[styles.textInput, styles.customMultilineInput]}
                  placeholder={
                    t('create_activity.placeholder_desc_personal') ||
                    'Describe de qué trata tu reto personal...'
                  }
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={customDescription}
                  onChangeText={(val) => {
                    setCustomDescription(val);
                    if (moderationError) setModerationError('');
                  }}
                />

                <Text style={styles.customFieldLabel}>
                  {t('create_activity.what_like') || '¿A qué gusto corresponde?'}
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setLikeOpen(!likeOpen)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !likeSeleccionado && styles.dropdownPlaceholder,
                    ]}
                  >
                    {likeSeleccionado
                      ? nombreDeGusto(likeSeleccionado.name)
                      : t('create_activity.no_like_assigned') || 'Sin gusto asignado'}
                  </Text>
                  {likeOpen ? (
                    <ChevronUp size={16} color={colors.textMuted} />
                  ) : (
                    <ChevronDown size={16} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {likeOpen && (
                  <View style={styles.dropdownList}>
                    <TouchableOpacity
                      style={styles.dropdownOption}
                      onPress={() => {
                        setCustomLikeId(null);
                        setLikeOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          customLikeId === null && styles.dropdownOptionActive,
                        ]}
                      >
                        {t('create_activity.no_like_assigned') || 'Sin gusto asignado'}
                      </Text>
                    </TouchableOpacity>

                    {likes.map((l) => (
                      <TouchableOpacity
                        key={l.id}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setCustomLikeId(l.id);
                          setLikeOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            customLikeId === l.id && styles.dropdownOptionActive,
                          ]}
                        >
                          {nombreDeGusto(l.name)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.customFieldLabel}>
                  {t('create_activity.points') || 'Puntos'}
                </Text>
                <View style={styles.pointsOptionsRow}>
                  {OPCIONES_PUNTOS.map((opcion) => {
                    const activo = customPoints === opcion;
                    return (
                      <TouchableOpacity
                        key={opcion}
                        style={[styles.pointChip, activo && styles.pointChipActive]}
                        onPress={() => setCustomPoints(opcion)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[styles.pointChipText, activo && styles.pointChipTextActive]}
                        >
                          {opcion} {t('common.points_abbr') || 'pts'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}

        {/* Duración */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.sectionTitleSwitch}>{t('rooms.set_deadline') || 'Establecer fecha límite'}</Text>
            <Text style={styles.subtitleSwitch}>{t('rooms.deadline_subtitle') || 'El reto finalizará automáticamente'}</Text>
          </View>
          <Switch 
            value={hasDeadline} 
            onValueChange={setHasDeadline} 
            trackColor={{ false: colors.surfaceMuted, true: colors.primarySoft }}
            thumbColor={hasDeadline ? colors.primary : theme.color('#f4f3f4', 'text')}
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
                    {days} {t('rooms.days') || 'días'}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                  style={[styles.dayOption, daysToAdd === 'custom' && styles.dayOptionSelected]}
                  onPress={() => setDaysToAdd('custom')}
                >
                  <Text style={[styles.dayOptionText, daysToAdd === 'custom' && styles.dayOptionTextSelected]}>
                    {t('rooms.other') || 'Otra'}
                  </Text>
              </TouchableOpacity>
            </View>
            
            {daysToAdd === 'custom' && (
              <View style={{ marginTop: spacing.md }}>
                <CalendarDateField
                  value={customDateStr}
                  onChange={setCustomDateStr}
                  minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                />
              </View>
            )}

            {/* Fecha de cierre en palabras: confirma qué día termina el reto */}
            {deadlinePreview ? (
              <Text style={styles.deadlinePreview}>{t('rooms.ends_on', { date: deadlinePreview }) || `Finaliza el ${deadlinePreview}`}</Text>
            ) : null}
          </View>
        )}

        {/* Amigos */}
        <Text style={styles.sectionTitle}>{t('rooms.invite_friends') || 'Invitar Amigos'}</Text>
        {friends.length > 0 && (
          <View style={[styles.challengeInputWrapper, { marginBottom: spacing.sm }]}>
            <Feather
              name="search"
              size={18}
              color={colors.textMuted}
              style={styles.challengeInputIcon}
            />
            <TextInput
              {...theme.textInputProps}
              style={styles.challengeTextInput}
              placeholder={t('friends.search_friends_placeholder') || 'Buscar amigos...'}
              value={friendSearchQuery}
              onChangeText={setFriendSearchQuery}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            {friendSearchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setFriendSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
        {friends.length === 0 ? (
          <Text style={styles.emptyText}>{t('rooms.no_friends_yet') || 'No tienes amigos agregados aún.'}</Text>
        ) : filteredFriends.length === 0 ? (
          <Text style={styles.emptyText}>{t('friends.no_matches') || 'Ningún amigo coincide con la búsqueda.'}</Text>
        ) : (
          filteredFriends.map((item, index) => {
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{friend.full_name || friend.username}</Text>
                  {!!friend.username && (
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>@{friend.username}</Text>
                  )}
                </View>
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
            <Text style={styles.submitButtonText}>{t('rooms.create_room_btn') || 'Crear Sala'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getCreateRoomScreenTheme = createThemeStyles((theme) => {
const { colors, input, primaryButton, card } = theme;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color(colors.background, 'background'),
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
    borderBottomColor: theme.color(colors.surfaceMuted, 'border'),
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
  challengeInputWrapper: {
    ...input,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  challengeInputIcon: {
    marginRight: spacing.sm,
  },
  challengeTextInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    height: '100%',
  },
  suggestionsBlock: {
    marginTop: spacing.sm,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  selectedChallengeCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: theme.color(colors.primarySoft, 'selected'),
    borderWidth: 1,
    borderColor: theme.color(colors.primary, 'primary'),
  },
  selectedChallengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  selectedChallengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedChallengeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pointsBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  pointsBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  selectedChallengeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  selectedChallengeDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  customChallengeCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
  },
  customChallengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  customChallengeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  customFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  customMultilineInput: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  dropdown: {
    ...input,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownPlaceholder: {
    color: colors.textMuted,
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.color(colors.surfaceMuted, 'border'),
  },
  dropdownOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownOptionActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  pointsOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pointChip: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointChipActive: {
    borderColor: colors.primary,
    backgroundColor: theme.color(colors.primarySoft, 'selected'),
  },
  pointChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pointChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: theme.color('#FEF2F2', 'surface'),
    borderColor: theme.color('#F87171', 'danger'),
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: spacing.sm,
  },
  errorBannerTitle: {
    color: theme.color('#B91C1C', 'danger'),
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  errorBannerText: {
    color: theme.color('#991B1B', 'text'),
    fontSize: 12.5,
    lineHeight: 18,
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
    marginBottom: spacing.xs,
  },
  activityItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityItemSelected: {
    backgroundColor: theme.color(colors.primary, 'selected'),
  },
  activityItemText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  activityItemTextSelected: {
    color: theme.color(colors.onPrimary, 'text'),
  },
  activityItemPoints: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
    backgroundColor: theme.color(colors.primarySoft, 'selected'),
    borderColor: theme.color(colors.primary, "primary"),
    borderWidth: 1,
  },
  dayOptionText: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  dayOptionTextSelected: {
    color: colors.primaryDark,
  },
  deadlinePreview: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
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
    backgroundColor: theme.color(colors.primarySoft, 'selected'),
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
    borderTopColor: theme.color(colors.surfaceMuted, 'border'),
  },
  submitButton: {
    ...primaryButton,
  },
  submitButtonText: {
    color: theme.color(colors.onPrimary, 'onAccent'),
    fontWeight: 'bold',
    fontSize: 16,
  },
});
  return { theme, colors, input, primaryButton, card, styles };
});
