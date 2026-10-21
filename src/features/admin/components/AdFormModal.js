import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../../../components/scaledText';
import { CalendarDateField } from '../../../components/CalendarDateField';
import { SponsoredCard } from '../../../components/SponsoredCard';
import { CatalogPicker } from '../../onboarding/components/CatalogPicker';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { saveAdAdmin, uploadAdImage } from '../../../services/adsService';
import { radii, spacing, fonts } from "../../../theme";

// El calendario trabaja con "dd/mm/aaaa"; la base, con "aaaa-mm-dd".
const isoACampo = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
const campoAIso = (valor) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const enDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Fuera del componente a propósito: definida dentro, se crearía de nuevo en
// cada render y el campo de texto perdería el foco a cada tecla.
const CampoBase = ({ etiqueta, ayuda, error, children }) => {
  const { theme, colors, input, estilos } = useThemeValues(getAdFormModalTheme);
  return (<View style={estilos.campo}>
    <Text style={estilos.etiqueta}>{etiqueta}</Text>
    {!!ayuda && <Text style={estilos.ayuda}>{ayuda}</Text>}
    {children}
    {!!error && <Text style={estilos.error}>{error}</Text>}
  </View>);
};

/**
 * Alta y edición de un anuncio patrocinado.
 *
 * Lo rellena el admin con lo que le pidió el negocio. Abajo se ve la tarjeta
 * tal cual saldrá en el feed, para revisar el texto antes de publicarla.
 */
export const AdFormModal = ({ ad, onClose, onSaved }) => {
  const { theme, colors, input, estilos } = useThemeValues(getAdFormModalTheme);

  const { user } = useAuth();
  const { notify } = useNotify();
  const editando = !!ad?.id;

  const [form, setForm] = useState({
    advertiser_name: ad?.advertiser_name || '',
    advertiser_contact: ad?.advertiser_contact || '',
    title: ad?.title || '',
    body: ad?.body || '',
    link_url: ad?.link_url || '',
    cta_label: ad?.cta_label || '',
    city: ad?.city || '',
    price_paid: ad?.price_paid != null ? String(ad.price_paid) : '',
    notes: ad?.notes || '',
  });
  const [desde, setDesde] = useState(ad ? isoACampo(ad.starts_on) : enDias(0));
  const [hasta, setHasta] = useState(ad ? isoACampo(ad.ends_on) : enDias(30));
  const [gustos, setGustos] = useState((ad?.likes || []).map((l) => l.id));
  const [imagenLocal, setImagenLocal] = useState(null);
  const [imagenUrl, setImagenUrl] = useState(ad?.image_url || null);
  const [guardando, setGuardando] = useState(false);
  const [intentado, setIntentado] = useState(false);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const elegirImagen = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        notify('Se requiere permiso para acceder a las fotos.', { type: 'warning' });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets?.length) setImagenLocal(res.assets[0].uri);
    } catch (err) {
      console.error('Error al elegir la imagen del anuncio:', err);
    }
  };

  const enlaceValido = !form.link_url.trim() || /^https?:\/\/\S+\.\S+/i.test(form.link_url.trim());
  const desdeIso = campoAIso(desde);
  const hastaIso = campoAIso(hasta);
  const errores = {
    advertiser_name: !form.advertiser_name.trim() && 'Escribe el nombre del negocio.',
    title: !form.title.trim() && 'El anuncio necesita un título.',
    link_url: !enlaceValido && 'El enlace debe empezar por https://',
    fechas:
      (!desdeIso || !hastaIso) ? 'Elige las dos fechas.' : hastaIso < desdeIso ? 'La fecha final es anterior a la inicial.' : null,
    price_paid: form.price_paid && isNaN(Number(form.price_paid)) && 'El precio debe ser un número.',
  };
  const hayErrores = Object.values(errores).some(Boolean);

  const guardar = async () => {
    setIntentado(true);
    if (hayErrores) return;

    setGuardando(true);
    let image_url = imagenUrl;
    if (imagenLocal) {
      const { publicUrl, error } = await uploadAdImage(imagenLocal);
      if (error) {
        setGuardando(false);
        notify('No se pudo subir la imagen del anuncio.', { type: 'error' });
        return;
      }
      image_url = publicUrl;
    }

    const { error } = await saveAdAdmin(
      {
        ...form,
        id: ad?.id,
        image_url,
        starts_on: desdeIso,
        ends_on: hastaIso,
        is_active: ad?.is_active ?? true,
      },
      gustos,
      user?.id
    );
    setGuardando(false);

    if (error) {
      notify('No se pudo guardar el anuncio.', { type: 'error' });
      return;
    }
    notify(editando ? 'Anuncio actualizado.' : 'Anuncio publicado.', { type: 'success' });
    onSaved?.();
  };

  // Los errores solo se enseñan después del primer intento de guardar.
  const visibles = intentado ? errores : {};

  const entrada = (campo, props = {}) => (
    <View style={[estilos.input, props.multiline && estilos.inputMulti]}>
      <TextInput {...theme.textInputProps}
        style={[estilos.inputTexto, props.multiline && { minHeight: 64, textAlignVertical: 'top' }]}
        value={form[campo]}
        onChangeText={set(campo)}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={estilos.overlay} onPress={onClose}>
        <Pressable style={estilos.panel} onPress={() => {}}>
          <View style={estilos.cabecera}>
            <Text style={estilos.titulo}>{editando ? 'Editar anuncio' : 'Nuevo anuncio'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar sin guardar" hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={estilos.cuerpo} keyboardShouldPersistTaps="handled">
            <Text style={estilos.seccion}>Anunciante</Text>
            <CampoBase etiqueta="Negocio o actividad *" error={visibles.advertiser_name}>
              {entrada('advertiser_name', { placeholder: 'Ej. Club de Corredores San José', maxLength: 60 })}
            </CampoBase>
            <CampoBase etiqueta="Contacto" ayuda="Solo lo ve el equipo de administración.">
              {entrada('advertiser_contact', { placeholder: 'Correo o teléfono', maxLength: 80 })}
            </CampoBase>

            <Text style={estilos.seccion}>Contenido</Text>
            <CampoBase etiqueta="Título *" error={visibles.title}>
              {entrada('title', { placeholder: 'Ej. Carrera 10K del Parque La Sabana', maxLength: 80 })}
            </CampoBase>
            <CampoBase etiqueta="Descripción">
              {entrada('body', { placeholder: 'Fecha, lugar y lo más importante, en una o dos frases.', maxLength: 220, multiline: true })}
            </CampoBase>
            <CampoBase etiqueta="Imagen">
              <View style={estilos.imagenFila}>
                {imagenLocal || imagenUrl ? (
                  <Image source={{ uri: imagenLocal || imagenUrl }} style={estilos.imagen} />
                ) : (
                  <View style={[estilos.imagen, estilos.imagenVacia]}>
                    <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ gap: 6 }}>
                  <TouchableOpacity style={estilos.btnSecundario} onPress={elegirImagen}>
                    <Text style={estilos.btnSecundarioTexto}>{imagenLocal || imagenUrl ? 'Cambiar' : 'Elegir imagen'}</Text>
                  </TouchableOpacity>
                  {!!(imagenLocal || imagenUrl) && (
                    <TouchableOpacity
                      onPress={() => {
                        setImagenLocal(null);
                        setImagenUrl(null);
                      }}
                    >
                      <Text style={estilos.quitar}>Quitar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </CampoBase>
            <CampoBase etiqueta="Enlace" ayuda="Web, Instagram o formulario de inscripción." error={visibles.link_url}>
              {entrada('link_url', { placeholder: 'https://', autoCapitalize: 'none', keyboardType: 'url' })}
            </CampoBase>
            <CampoBase etiqueta="Texto del botón">
              {entrada('cta_label', { placeholder: 'Más información', maxLength: 24 })}
            </CampoBase>

            <Text style={estilos.seccion}>A quién se le muestra</Text>
            <CampoBase
              etiqueta={`Gustos ${gustos.length ? `(${gustos.length})` : ''}`}
              ayuda={
                gustos.length
                  ? 'Solo lo verá quien tenga alguno de estos gustos en sus preferencias.'
                  : 'Sin gustos, el anuncio se muestra a todo el mundo.'
              }
            >
              <CatalogPicker tabla="likes" selectedIds={gustos} onChange={setGustos} compact />
            </CampoBase>
            <CampoBase etiqueta="Ciudad" ayuda="Vacío = todo el país. Con ciudad (o cantón), solo lo ve quien esté ahí según la ubicación del teléfono, y le sale primero.">
              {entrada('city', { placeholder: 'Ej. San José', maxLength: 60 })}
            </CampoBase>
            <CampoBase etiqueta="Vigencia *" error={visibles.fechas}>
              <View style={{ gap: spacing.sm }}>
                <Text style={estilos.ayuda}>Desde</Text>
                <CalendarDateField value={desde} onChange={setDesde} />
                <Text style={estilos.ayuda}>Hasta</Text>
                <CalendarDateField value={hasta} onChange={setHasta} />
              </View>
            </CampoBase>

            <Text style={estilos.seccion}>Interno</Text>
            <CampoBase etiqueta="Precio cobrado (₡)" error={visibles.price_paid}>
              {entrada('price_paid', { placeholder: '0', keyboardType: 'decimal-pad' })}
            </CampoBase>
            <CampoBase etiqueta="Notas">
              {entrada('notes', { placeholder: 'Acuerdos con el negocio, factura, etc.', multiline: true })}
            </CampoBase>

            <Text style={estilos.seccion}>Vista previa</Text>
            <View style={estilos.preview}>
              <SponsoredCard
                ad={{
                  ...form,
                  advertiser_name: form.advertiser_name || 'Nombre del negocio',
                  title: form.title || 'Título del anuncio',
                  image_url: imagenLocal || imagenUrl,
                  matched: gustos.length > 0,
                }}
              />
            </View>
          </ScrollView>

          <View style={estilos.pie}>
            <TouchableOpacity
              style={[estilos.btnGuardar, guardando && { opacity: 0.6 }]}
              onPress={guardar}
              disabled={guardando}
              activeOpacity={0.85}
            >
              <Text style={estilos.btnGuardarTexto}>
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Publicar anuncio'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.btnCancelar} onPress={onClose} activeOpacity={0.85}>
              <Text style={estilos.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdFormModalTheme = createThemeStyles((theme) => {
const { colors, input } = theme;
const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  titulo: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  cuerpo: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  seccion: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  campo: {
    marginBottom: spacing.md,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  ayuda: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  input: {
    ...input,
  },
  inputMulti: {
    alignItems: 'flex-start',
  },
  inputTexto: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: 14,
    color: colors.text,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
  },
  imagenFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  imagen: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  imagenVacia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecundario: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnSecundarioTexto: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  quitar: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  preview: {
    marginHorizontal: -16,
  },
  pie: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.color(colors.surfaceMuted, 'border'),
  },
  btnCancelar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  btnCancelarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textFaint,
  },
  btnGuardar: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  btnGuardarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color(colors.onPrimary, "onAccent"),
  },
});
  return { theme, colors, input, estilos };
});
