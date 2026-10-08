import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Image, TextInput, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fonts } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import {
  getAllUsersAdmin,
  getPendingProfileReportsAdmin,
  resolveProfileAdmin,
  setProfileRoleAdmin,
} from '../../../services/adminService';
import {
  adminStyles,
  ControlSegmentado,
  Insignia,
  TarjetaVacia,
  BotonAccion,
  Paginador,
  recortarPagina,
} from '../adminUI';
import { AdminsModal } from '../components/AdminsModal';
import { capitalizarTitulo } from '../../../utils/titleCase';

const POR_PAGINA = 10;

/**
 * ¿La suspensión sigue vigente?
 *
 * Marcar status = 'BANNED' no basta: el bloqueo del login exige ADEMÁS que la
 * fecha esté en el futuro, así que una cuenta cuyo plazo ya venció puede
 * entrar aunque la columna siga en BANNED. El panel cuenta lo mismo que la app
 * impide, no lo que dice la columna.
 */
const estaSuspendido = (perfil) =>
  perfil?.status === 'BANNED' &&
  !!perfil?.suspended_until &&
  new Date(perfil.suspended_until) > new Date();

/** "ago 2026": para "se registró" basta el mes, y ocupa una línea menos. */
const mesYAnio = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
};

/**
 * Usuarios: quién está registrado, quién ha sido denunciado, y lo que se
 * decide sobre una cuenta en el día a día: suspenderla o reactivarla.
 *
 * La tarjeta se mantiene a dos líneas mientras no pase nada: foto, nombre y
 * una línea con el usuario, los puntos y desde cuándo está. Lo demás —la
 * insignia de suspendido, el recuadro de la denuncia— solo aparece cuando hay
 * algo que mirar, porque si todo se enseña siempre, nada destaca.
 *
 * "Reportado" aquí significa que alguien denunció A LA PERSONA, no que tenga
 * una foto marcada: una publicación reportada se revisa en su sección, con la
 * foto y el motivo delante.
 *
 * Nombrar administradores se hace desde su propio botón, no desde cada fila:
 * es algo que se hace una vez cada mucho.
 */
export const AdminUsers = () => {
  const { user } = useAuth();
  const { notify, confirm } = useNotify();
  const [usuarios, setUsuarios] = useState([]);
  // Reportes contra el perfil, indexados por id: { cuenta, motivos: [] }
  const [reportes, setReportes] = useState({});
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [mostrarAdmins, setMostrarAdmins] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [{ users }, { reportes: denuncias }] = await Promise.all([
      getAllUsersAdmin(),
      getPendingProfileReportsAdmin(),
    ]);
    setUsuarios(users);
    setReportes(denuncias);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const suspendidos = useMemo(() => usuarios.filter(estaSuspendido).length, [usuarios]);
  const reportados = useMemo(() => usuarios.filter((u) => !!reportes[u.id]).length, [usuarios, reportes]);
  const administradores = useMemo(() => usuarios.filter((u) => u.role === 'ADMIN').length, [usuarios]);

  // Los totales van en las propias pestañas: así no hace falta una línea
  // aparte repitiendo las mismas tres cifras.
  const filtros = useMemo(
    () => [
      { key: 'todos', label: `Todos (${usuarios.length})` },
      { key: 'reportados', label: `Reportados (${reportados})` },
      { key: 'suspendidos', label: `Suspendidos (${suspendidos})` },
    ],
    [usuarios.length, reportados, suspendidos]
  );

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios
      .filter((u) => {
        if (filtro === 'suspendidos' && !estaSuspendido(u)) return false;
        if (filtro === 'reportados' && !reportes[u.id]) return false;
        if (!texto) return true;
        return (
          (u.username || '').toLowerCase().includes(texto) ||
          (u.full_name || '').toLowerCase().includes(texto)
        );
      })
      // Lo que pide una decisión, primero.
      .sort((a, b) => Number(!!reportes[b.id]) - Number(!!reportes[a.id]));
  }, [usuarios, filtro, busqueda, reportes]);

  // Buscar o cambiar de filtro devuelve a la primera página: si no, se mira una
  // página 4 que ya no existe y la lista parece vacía.
  useEffect(() => {
    setPagina(1);
  }, [filtro, busqueda]);

  // Si la lista encoge (se ignoró un reporte, se reactivó una cuenta) y la
  // página en la que estábamos ya no existe, se retrocede en vez de dejar la
  // pantalla vacía.
  useEffect(() => {
    const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
    if (pagina > paginas) setPagina(paginas);
  }, [visibles.length, pagina]);

  const enPagina = useMemo(() => recortarPagina(visibles, pagina, POR_PAGINA), [visibles, pagina]);

  const cambiarEstado = async (perfil, suspender) => {
    if (suspender) {
      const ok = await confirm({
        title: 'Suspender cuenta',
        message: `@${perfil.username} no podrá iniciar sesión durante 15 días.`,
        confirmLabel: 'Sí, suspender',
        destructive: true,
      });
      if (!ok) return;
    }

    const { error } = await resolveProfileAdmin(perfil.id, suspender ? 'BANNED' : 'ACTIVE');
    if (error) {
      notify('No se pudo cambiar el estado de la cuenta.', { type: 'error' });
      return;
    }
    notify(
      suspender
        ? `@${perfil.username} queda suspendido 15 días.`
        : `@${perfil.username} puede entrar de nuevo.`,
      { type: 'success' }
    );
    cargar();
  };

  const cambiarRol = async (perfil, hacerAdmin) => {
    const ok = await confirm({
      title: hacerAdmin ? 'Hacer administrador' : 'Quitar administrador',
      message: hacerAdmin
        ? `@${perfil.username} podrá entrar al panel, moderar publicaciones, suspender cuentas y nombrar a otros administradores.`
        : `@${perfil.username} dejará de tener acceso al panel.`,
      confirmLabel: hacerAdmin ? 'Sí, hacer admin' : 'Sí, quitar',
      destructive: !hacerAdmin,
    });
    if (!ok) return;

    const { error } = await setProfileRoleAdmin(perfil.id, hacerAdmin ? 'ADMIN' : 'USER');
    if (error) {
      notify('No se pudo cambiar el rol.', { type: 'error' });
      return;
    }
    notify(
      hacerAdmin ? `@${perfil.username} ya es administrador.` : `@${perfil.username} vuelve a ser usuario.`,
      { type: 'success' }
    );
    cargar();
  };

  return (
    <View>
      {/* Primero las pestañas, después el buscador: igual que en el resto del panel. */}
      <ControlSegmentado opciones={filtros} valor={filtro} onChange={setFiltro} />

      <View style={adminStyles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={adminStyles.searchInput}
          placeholder="Buscar por nombre o usuario"
          placeholderTextColor={colors.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
        />
        {!!busqueda && (
          <TouchableOpacity onPress={() => setBusqueda('')} accessibilityLabel="Limpiar búsqueda">
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={estilos.filaAdmins}
        onPress={() => setMostrarAdmins(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="shield-checkmark" size={15} color={colors.primaryDark} />
        <Text style={estilos.filaAdminsTexto}>Administradores ({administradores})</Text>
        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Solo al buscar: el resto del tiempo los totales ya están en las pestañas. */}
      {!!busqueda.trim() && !cargando && (
        <Text style={adminStyles.countLine}>
          {visibles.length === 1 ? '1 coincidencia' : `${visibles.length} coincidencias`}
        </Text>
      )}

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

      {!cargando && visibles.length === 0 && (
        <TarjetaVacia
          icono={filtro === 'todos' ? 'search' : 'shield-checkmark'}
          texto={
            filtro === 'reportados'
              ? 'No hay perfiles reportados pendientes de revisión.'
              : filtro === 'suspendidos'
              ? 'No hay ninguna cuenta suspendida.'
              : 'Ningún usuario coincide con la búsqueda.'
          }
        />
      )}

      {!cargando &&
        enPagina.map((u) => {
          const suspendido = estaSuspendido(u);
          const esAdmin = u.role === 'ADMIN';
          const esYo = u.id === user?.id;
          const reporte = reportes[u.id];

          return (
            <View key={u.id} style={estilos.tarjeta}>
              <View style={estilos.cabecera}>
                {u.avatar_url ? (
                  <Image source={{ uri: u.avatar_url }} style={estilos.avatar} />
                ) : (
                  <View style={[estilos.avatar, estilos.avatarVacio]}>
                    <Text style={estilos.avatarLetra}>
                      {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={estilos.lineaNombre}>
                    <Text style={adminStyles.listTitle} numberOfLines={1}>
                      {capitalizarTitulo(u.full_name || u.username)}
                    </Text>
                    {/* El rol, un icono junto al nombre: una pastilla más por
                        cada administrador llenaba la lista de colores. */}
                    {esAdmin && (
                      <Ionicons
                        name="shield-checkmark"
                        size={14}
                        color={colors.accent}
                        accessibilityLabel="Administrador"
                      />
                    )}
                  </View>

                  <Text style={adminStyles.listSubtitle} numberOfLines={1}>
                    @{u.username} · {u.points || 0} pts · desde {mesYAnio(u.created_at)}
                  </Text>

                  {suspendido && (
                    <View style={adminStyles.badgeRow}>
                      <Insignia
                        texto={
                          u.suspended_until
                            ? `SUSPENDIDO HASTA ${new Date(u.suspended_until).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                              })}`
                            : 'SUSPENDIDO'
                        }
                        tono="alerta"
                      />
                    </View>
                  )}
                </View>

                {/* La acción del día a día, a la altura del nombre. Un admin no
                    se suspende a sí mismo: se quedaría fuera de su panel. */}
                {!esYo && (
                  <BotonAccion
                    texto={suspendido ? 'Reactivar' : 'Suspender'}
                    icono={suspendido ? 'lock-open' : 'lock-closed'}
                    tono={suspendido ? 'neutro' : 'rojo'}
                    onPress={() => cambiarEstado(u, !suspendido)}
                  />
                )}
              </View>

              {/* Quién lo denunció y por qué. Solo si lo han denunciado. */}
              {!!reporte && (
                <View style={estilos.denuncia}>
                  <Ionicons name="warning" size={14} color={colors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={adminStyles.reasonText}>
                      <Text style={adminStyles.reasonBold}>{reporte.cuenta}</Text>{' '}
                      {reporte.cuenta === 1
                        ? 'reporte contra este perfil'
                        : 'reportes contra este perfil'}
                      {reporte.motivos?.length > 0 ? ` (${reporte.motivos.join(', ')})` : ''}
                    </Text>
                  </View>
                  <BotonAccion
                    texto="Ignorar"
                    icono="checkmark"
                    onPress={() => cambiarEstado(u, false)}
                  />
                </View>
              )}
            </View>
          );
        })}

      {!cargando && (
        <Paginador
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={visibles.length}
          onCambiar={setPagina}
        />
      )}

      {/* QUIÉN PUEDE ENTRAR AL PANEL */}
      {mostrarAdmins && (
        <AdminsModal
          usuarios={usuarios}
          yoId={user?.id}
          onCambiarRol={cambiarRol}
          onClose={() => setMostrarAdmins(false)}
        />
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  filaAdmins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  filaAdminsTexto: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: radii.input,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cabecera: {
    flexDirection: 'row',
    // Arriba, no centrado: la foto a la altura del nombre, no flotando a media
    // tarjeta cuando debajo hay una insignia.
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  lineaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  denuncia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  avatarVacio: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetra: {
    fontSize: 17,
    fontFamily: fonts.heading,
    color: colors.textFaint,
  },
});
