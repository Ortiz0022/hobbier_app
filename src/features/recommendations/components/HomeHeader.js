import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const HomeHeader = ({ profile }) => {
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Usuario';
  const points = profile?.points || 0;

  return (
    <View style={styles.headerRow}>
      {/* IZQUIERDA: ISOLOGOTIPO Y SALUDO REFINADO */}
      <View style={styles.brandRow}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{firstName[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.brandTextCol}>
          <Text style={styles.brandTitle}>Hobbier</Text>
          <Text style={styles.userSubtext}>¡Hola, {firstName}!</Text>
        </View>
      </View>

      {/* DERECHA: PUNTOS Y CAMPANA DE NOTIFICACIONES */}
      <View style={styles.rightActions}>
        <View style={styles.pointsBadge}>
          <Feather name="award" size={13} color="#2A6347" />
          <Text style={styles.pointsValue}>{points} pts</Text>
        </View>

        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
          <Feather name="bell" size={18} color="#386756" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DF9C8E',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DF9C8E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1C3A30',
    letterSpacing: -0.4,
  },
  userSubtext: {
    fontSize: 12,
    color: '#666C67',
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF4EE',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  pointsValue: {
    color: '#2A6347',
    fontWeight: '700',
    fontSize: 12,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEBE5',
  },
});
