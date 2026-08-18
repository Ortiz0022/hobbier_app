import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../../components/scaledText';
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

        {/* ACCIONES DE LA DERECHA: MARCADOR DORADO DE PUNTOS, NOTIFICACIONES Y FILTRO */}
        <View style={styles.actionsRow}>
          <View style={styles.pointsPill}>
            <Feather name="star" size={13} color="#FFB300" />
            <Text style={styles.pointsText}>{points} pts</Text>
          </View>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
            <Feather name="bell" size={17} color="#08333D" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={onFilterPress} activeOpacity={0.8}>
            <Feather name="sliders" size={17} color="#08333D" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 16,
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
    fontSize: 21,
    fontWeight: '700',
    color: '#08333D',
    letterSpacing: -0.3,
  },
  userHandleText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9EB',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.3)',
    gap: 5,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#08333D',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
});
