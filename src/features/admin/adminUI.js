import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Text } from '../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fonts, card, input } from '../../theme';

/**
 * Piezas comunes de las pantallas del panel de administración.
 *
 * Todo sale de src/theme: los mismos turquesas, grises y naranjas que el resto
 * de la app, la misma Poppins de los títulos y los mismos radios. El panel
 * usaba antes una paleta propia (naranja #FF6B00, cian #00B4D8, grises
 * azulados) y por eso parecía otra aplicación.
 */

export const adminStyles = StyleSheet.create({
  // --- Tarjeta base: la de la app, plana y con borde gris claro ---
  card: {
    ...card,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // --- Control segmentado ---
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: spacing.md + 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  segmentActive: {
    // La pastilla activa es BLANCA, no turquesa: así no compite con los botones
    // de acción, que son los que llevan el color de marca.
    backgroundColor: colors.surface,
    elevation: 2,
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // --- Vacío ---
  emptyCard: {
    backgroundColor: colors.surfaceAccent,
    borderRadius: radii.input,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },

  // --- Cifra del resumen ---
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.xs + 2,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: radii.input,
    padding: spacing.md + 2,
  },
  statIconBubble: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statHint: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 6,
  },

  // --- Fila de lista (usuario, publicación) ---
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: radii.input,
    padding: spacing.md,
    marginBottom: 10,
    gap: spacing.md,
  },
  listTitle: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  listSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  listMeta: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 3,
  },
  /** Cuando una fila tiene dos acciones, van apiladas a la derecha. */
  actionsColumn: {
    gap: 6,
    alignItems: 'stretch',
  },

  // --- Insignias ---
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // --- Botones pequeños de acción ---
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // --- Ficha de revisión (publicación reportada) ---
  reviewCard: {
    ...card,
    padding: spacing.md + 4,
    marginBottom: spacing.md + 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  reviewAuthor: {
    fontSize: 14,
    color: colors.textFaint,
    flexShrink: 1,
  },
  reviewAuthorName: {
    fontFamily: fonts.heading,
    color: colors.text,
  },
  reviewImage: {
    width: '100%',
    height: 180,
    borderRadius: radii.input - 4,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  reasonsBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 6,
  },
  reasonsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textFaint,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  reasonContent: {
    flex: 1,
  },
  reasonText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  reasonBold: {
    fontWeight: '700',
  },
  reasonDetails: {
    marginTop: 2,
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textFaint,
    lineHeight: 18,
  },

  // --- Pareja de botones grandes (mantener / eliminar) ---
  pairRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bigBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigBtnKeep: {
    backgroundColor: colors.surfaceMuted,
  },
  bigBtnDelete: {
    backgroundColor: colors.danger,
  },
  bigBtnTextKeep: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '700',
  },
  bigBtnTextDelete: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  // --- Buscador: el mismo campo que el resto de la app ---
  searchBar: {
    ...input,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.text,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
  },
  countLine: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  // --- Paginación: círculos numerados ---
  paginador: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  pagCirculo: {
    width: 38,
    height: 38,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagCirculoActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pagCirculoApagado: {
    // Apagado, no escondido: que se vea que esta es la primera o la última página.
    opacity: 0.4,
  },
  pagNumero: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textFaint,
  },
  pagNumeroActivo: {
    color: colors.onPrimary,
  },
});

/** Tonos de insignia, todos de la paleta de la app. */
export const BADGE_TONOS = {
  marca: { bg: colors.primarySoft, border: colors.primarySoft, text: colors.primaryDark },
  alerta: { bg: colors.dangerSoft, border: colors.dangerSoft, text: colors.danger },
  acento: { bg: colors.accent, border: colors.accent, text: colors.onPrimary },
  neutro: { bg: colors.surfaceMuted, border: colors.surfaceMuted, text: colors.textFaint },
};

export const Insignia = ({ texto, tono = 'neutro' }) => {
  const t = BADGE_TONOS[tono] || BADGE_TONOS.neutro;
  return (
    <View style={[adminStyles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[adminStyles.badgeText, { color: t.text }]}>{texto}</Text>
    </View>
  );
};

/** Cifra del resumen. `onPress` opcional: si lleva, la tarjeta navega. */
export const TarjetaDato = ({ icono, valor, etiqueta, pista, tono = 'marca', onPress }) => {
  const t = BADGE_TONOS[tono] || BADGE_TONOS.marca;
  const Contenedor = onPress ? TouchableOpacity : View;
  return (
    <Contenedor
      style={adminStyles.statCard}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[adminStyles.statIconBubble, { backgroundColor: t.bg }]}>
        <Ionicons name={icono} size={17} color={t.text} />
      </View>
      <Text style={adminStyles.statValue}>{valor}</Text>
      <Text style={adminStyles.statLabel}>{etiqueta}</Text>
      {!!pista && <Text style={adminStyles.statHint}>{pista}</Text>}
    </Contenedor>
  );
};

export const ControlSegmentado = ({ opciones, valor, onChange }) => (
  <View style={adminStyles.segmentRow}>
    {opciones.map((op) => {
      const activo = op.key === valor;
      return (
        <TouchableOpacity
          key={op.key}
          style={[adminStyles.segment, activo && adminStyles.segmentActive]}
          onPress={() => onChange(op.key)}
          activeOpacity={0.85}
        >
          {!!op.icono && (
            <Ionicons name={op.icono} size={14} color={activo ? colors.primary : colors.textMuted} />
          )}
          <Text style={[adminStyles.segmentText, activo && adminStyles.segmentTextActive]}>
            {op.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export const TarjetaVacia = ({ icono = 'sparkles', texto }) => (
  <View style={adminStyles.emptyCard}>
    <Ionicons name={icono} size={40} color={colors.primaryDark} style={{ marginBottom: spacing.sm }} />
    <Text style={adminStyles.emptyText}>{texto}</Text>
  </View>
);

/**
 * Botón pequeño de fila. 'neutro' para lo reversible, 'marca' para lo que da
 * permisos y 'rojo' para lo que quita acceso o esconde contenido.
 */
export const BotonAccion = ({ texto, icono, tono = 'neutro', onPress }) => {
  const t = BADGE_TONOS[tono === 'rojo' ? 'alerta' : tono] || BADGE_TONOS.neutro;
  return (
    <TouchableOpacity
      style={[adminStyles.smallBtn, { backgroundColor: t.bg, borderColor: t.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {!!icono && <Ionicons name={icono} size={13} color={t.text} />}
      <Text style={[adminStyles.smallBtnText, { color: t.text }]}>{texto}</Text>
    </TouchableOpacity>
  );
};

/** "hace 3 días" / "12 oct 2026" — fechas cortas, que las filas van apretadas. */
export const fechaCorta = (iso) => {
  if (!iso) return '—';
  const fecha = new Date(iso);
  const dias = Math.floor((Date.now() - fecha.getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Cuántos números caben sin apretar en una pantalla de móvil. */
const NUMEROS_VISIBLES = 5;

/**
 * Las páginas que se enseñan alrededor de la actual. Con muchas páginas no
 * caben todas, así que se mueve una ventana: estando en la 7 de 20 se ven de
 * la 5 a la 9. Las flechas siguen llegando a cualquier sitio.
 */
export const ventanaDePaginas = (pagina, paginas, cuantas = NUMEROS_VISIBLES) => {
  const inicio = Math.max(1, Math.min(pagina - Math.floor(cuantas / 2), paginas - cuantas + 1));
  const fin = Math.min(paginas, inicio + cuantas - 1);
  const numeros = [];
  for (let i = inicio; i <= fin; i += 1) numeros.push(i);
  return numeros;
};

/**
 * Paginación de las listas del panel.
 *
 * El panel enseña cosas que hay que revisar una por una (cuentas, fotos,
 * actividades); una lista infinita obliga a recordar por dónde iba el scroll y
 * no deja volver al mismo sitio. Con páginas numeradas, "la página 3" es un
 * sitio al que se puede volver de un toque, sin pasar por las de en medio.
 *
 * Si todo cabe en una página no se pinta nada: no hay nada que paginar.
 */
export const Paginador = ({ pagina, porPagina, total, onCambiar }) => {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;

  const primera = pagina <= 1;
  const ultima = pagina >= paginas;

  const Flecha = ({ icono, apagada, destino, etiqueta }) => (
    <TouchableOpacity
      style={[adminStyles.pagCirculo, apagada && adminStyles.pagCirculoApagado]}
      onPress={() => !apagada && onCambiar(destino)}
      disabled={apagada}
      activeOpacity={0.85}
      accessibilityLabel={etiqueta}
    >
      <Ionicons name={icono} size={16} color={colors.textFaint} />
    </TouchableOpacity>
  );

  return (
    <View style={adminStyles.paginador}>
      <Flecha icono="chevron-back" apagada={primera} destino={pagina - 1} etiqueta="Página anterior" />

      {ventanaDePaginas(pagina, paginas).map((n) => {
        const activa = n === pagina;
        return (
          <TouchableOpacity
            key={n}
            style={[adminStyles.pagCirculo, activa && adminStyles.pagCirculoActivo]}
            onPress={() => !activa && onCambiar(n)}
            activeOpacity={0.85}
            accessibilityLabel={'Página ' + n}
            accessibilityState={{ selected: activa }}
          >
            <Text style={[adminStyles.pagNumero, activa && adminStyles.pagNumeroActivo]}>{n}</Text>
          </TouchableOpacity>
        );
      })}

      <Flecha icono="chevron-forward" apagada={ultima} destino={pagina + 1} etiqueta="Página siguiente" />
    </View>
  );
};

/** Trozo de la lista que toca a esta página (para las listas ya cargadas). */
export const recortarPagina = (lista, pagina, porPagina) =>
  lista.slice((pagina - 1) * porPagina, pagina * porPagina);
