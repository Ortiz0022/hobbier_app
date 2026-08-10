import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const ActivitiesHeader = ({ profile, onFilterPress }) => {
  const username = profile?.username ? `@${profile.username}` : 'Mi progreso';
  const points = profile?.points || 0;

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerRow}>
        {/* TÍTULO Y USERNAME DE LA PANTALLA */}
        <View style={styles.titleCol}>
          <Text style={styles.mainTitle}>Mis actividades</Text>
          <Text style={styles.userHandleText}>{username}</Text>
        </View>

        {/* ACCIONES DE LA DERECHA: PUNTOS, NOTIFICACIONES Y FILTRO */}
        <View style={styles.actionsRow}>
          <View style={styles.pointsPill}>
            <Feather name="target" size={12} color="#865046" />
            <Text style={styles.pointsText}>{points} pts</Text>
          </View>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
            <Feather name="bell" size={18} color="#386756" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={onFilterPress} activeOpacity={0.8}>
            <Feather name="sliders" size={18} color="#4A607D" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C201D',
    letterSpacing: -0.4,
  },
  userHandleText: {
    fontSize: 13,
    color: '#8A908B',
    fontWeight: '500',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEEEA',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#865046',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAE8E4',
  },
});
