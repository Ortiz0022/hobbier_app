import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../../theme';
import { usePresence } from '../../../context/PresenceContext';
import { getSystemStatsAdmin } from '../../../services/adminService';
import { adminStyles, TarjetaDato, BotonAccion, BADGE_TONOS } from '../adminUI';

/**
 * Pantalla principal del panel: el estado del sistema de un vistazo.
 *
 * Las cifras salen de contar filas (COUNT sin traer datos), no de descargar
 * tablas: el panel lo abre un admin desde el móvil igual que cualquier otra
 * pantalla. Lo que no se puede contar con las políticas actuales (misiones
 * completadas, salas) no se inventa: no aparece.
 */
export const AdminOverview = ({ onIrASeccion }) => {
  const { onlineUsers } = usePresence();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { stats: datos } = await getSystemStatsAdmin();
    setStats(datos);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const enLinea = onlineUsers?.size || 0;

  if (cargando && !stats) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />;
  }

  if (!stats) {
    return (
      <View style={adminStyles.card}>
        <Text style={adminStyles.listTitle}>No se pudieron cargar las cifras</Text>
        <Text style={adminStyles.listSubtitle}>Revisa la conexión y vuelve a intentarlo.</Text>
        <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
          <BotonAccion texto="Reintentar" icono="refresh" onPress={cargar} />
        </View>
      </View>
    );
  }

  // Lo que pide una decisión del admin. Solo se listan las filas con algo
  // pendiente: una lista de ceros no es información, es ruido.
  const atencion = [
    {
      key: 'reportes-posts',
      cantidad: stats.reportesPendientes,
      icono: 'flag',
      texto: 'reportes de publicaciones sin resolver',
      seccion: 'posts',
    },
    {
      key: 'reportes-perfiles',
      cantidad: stats.reportesPerfilPendientes,
      icono: 'person-circle',
      texto: 'perfiles reportados sin revisar',
      seccion: 'users',
    },
    {
      key: 'suspendidos',
      cantidad: stats.usuariosSuspendidos,
      icono: 'lock-closed',
      texto: 'usuarios suspendidos ahora mismo',
      seccion: 'users',
    },
    {
      key: 'sin-gusto',
      cantidad: stats.actividadesSinGusto,
      icono: 'pricetag',
      texto: 'actividades activas sin ningún gusto: solo salen como comodín',
      seccion: 'activities',
    },
  ].filter((fila) => !!fila.cantidad);

  return (
    <View>
      <View style={[adminStyles.rowBetween, { marginBottom: spacing.xs }]}>
        <Text style={adminStyles.sectionTitle}>El sistema ahora</Text>
        <TouchableOpacity onPress={cargar} activeOpacity={0.7} accessibilityLabel="Actualizar cifras">
          <Ionicons name="refresh" size={16} color={cargando ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={adminStyles.statGrid}>
        <TarjetaDato
          icono="people"
          valor={stats.usuarios}
          etiqueta="Usuarios registrados"
          pista={
            stats.usuariosNuevos > 0 ? `+${stats.usuariosNuevos} esta semana` : 'sin altas esta semana'
          }
          onPress={() => onIrASeccion('users')}
        />
        {/* Sin onPress: el pulso se mira aquí. La lista de usuarios ya no
            marca quién está conectado, así que llevar allí no enseñaría nada
            más de lo que dice este número. */}
        <TarjetaDato
          icono="radio"
          valor={enLinea}
          etiqueta="Conectados ahora"
          pista="en tiempo real"
          tono="acento"
        />
        <TarjetaDato
          icono="images"
          valor={stats.postsActivos}
          etiqueta="Publicaciones visibles"
          pista={`${stats.postsSemana} nuevas esta semana`}
          onPress={() => onIrASeccion('posts')}
        />
        <TarjetaDato
          icono="flag"
          valor={stats.reportesPendientes}
          etiqueta="Reportes pendientes"
          pista={`${stats.postsReportados} publicaciones por revisar`}
          tono={stats.reportesPendientes > 0 ? 'alerta' : 'marca'}
          onPress={() => onIrASeccion('posts')}
        />
        <TarjetaDato
          icono="flash"
          valor={stats.actividadesActivas}
          etiqueta="Actividades activas"
          pista={`de ${stats.actividades} en el catálogo`}
          onPress={() => onIrASeccion('activities')}
        />
        <TarjetaDato
          icono="eye-off"
          valor={stats.postsOcultos}
          etiqueta="Publicaciones ocultas"
          pista="retiradas por moderación"
          tono="neutro"
          onPress={() => onIrASeccion('posts')}
        />
      </View>

      <Text style={adminStyles.sectionTitle}>Requiere atención</Text>
      {atencion.length === 0 ? (
        <View style={adminStyles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={[adminStyles.listSubtitle, { flex: 1, marginTop: 0 }]}>
              Nada pendiente: sin reportes, sin suspensiones y el catálogo bien etiquetado.
            </Text>
          </View>
        </View>
      ) : (
        atencion.map((fila) => (
          <TouchableOpacity
            key={fila.key}
            style={adminStyles.listRow}
            onPress={() => onIrASeccion(fila.seccion)}
            activeOpacity={0.85}
          >
            <View
              style={[
                adminStyles.statIconBubble,
                { marginBottom: 0, backgroundColor: BADGE_TONOS.alerta.bg },
              ]}
            >
              <Ionicons name={fila.icono} size={16} color={BADGE_TONOS.alerta.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={adminStyles.listTitle}>{fila.cantidad}</Text>
              <Text style={adminStyles.listSubtitle}>{fila.texto}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))
      )}

      <Text style={adminStyles.countLine}>
        Los conectados se leen del canal de presencia en tiempo real; el resto de cifras se
        cuentan al abrir esta pantalla.
      </Text>
    </View>
  );
};
