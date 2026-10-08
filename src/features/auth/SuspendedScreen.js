import React from "react";
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Text } from "../../components/scaledText";
import Feather from "@expo/vector-icons/Feather";
import { useAuth } from "../../context/AuthContext";
import {
  colors,
  radii,
  spacing,
  fonts,
  primaryButton,
  primaryButtonText,
} from "../../theme";

/**
 * Aviso para cuentas suspendidas por un reporte.
 *
 * Sale en los dos momentos en que hace falta: al intentar entrar, y en mitad
 * de la sesión si un administrador suspende la cuenta mientras se está usando
 * la app. En los dos casos la sesión YA se cerró cuando esta pantalla aparece;
 * el botón solo devuelve al formulario de entrada.
 *
 * Al cumplirse el plazo, get_my_suspension deja de considerarla suspendida
 * (compara la fecha con el momento actual) y se puede volver a entrar sin que
 * nadie tenga que hacer nada.
 */
export const SuspendedScreen = () => {
  const { suspension, signOut, descartarSuspension } = useAuth();

  // Cerrar sesión por si acaso: si la suspensión se detectó sin red, puede que
  // la sesión siguiera abierta. Después se retira el aviso.
  const entendido = async () => {
    await signOut();
    descartarSuspension();
  };

  const hasta = suspension?.suspended_until
    ? new Date(suspension.suspended_until).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const dias = suspension?.suspended_until
    ? Math.max(
        1,
        Math.ceil(
          (new Date(suspension.suspended_until) - new Date()) / 86400000,
        ),
      )
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="lock" size={44} color={colors.danger} />
        </View>
        <Text style={styles.title}>Cuenta suspendida</Text>
        <Text style={styles.body}>
          Tu cuenta fue reportada y quedó inhabilitada durante 15 días, así que
          hemos cerrado tu sesión.
        </Text>
        {hasta && (
          <Text style={styles.body}>
            Pasado ese plazo se activará de nuevo por sí sola: podrás volver a
            entrar el <Text style={styles.bold}>{hasta}</Text>
            {dias ? ` (faltan ${dias} ${dias === 1 ? "día" : "días"})` : ""}.
          </Text>
        )}
        <TouchableOpacity style={styles.button} onPress={entendido}>
          <Text style={styles.buttonText}>Entendido</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Los colores, radios y tipografías salen de src/theme, como el resto de la
// app: esta pantalla tenía su propio crema, su propio rojo y su propio gris.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radii.round,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    color: colors.textFaint,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.sm,
    maxWidth: 340,
  },
  bold: {
    fontWeight: "700",
    color: colors.text,
  },
  button: {
    ...primaryButton,
    marginTop: spacing.xl,
    paddingHorizontal: 36,
    alignSelf: "stretch",
    maxWidth: 340,
  },
  buttonText: {
    ...primaryButtonText,
    fontSize: 15,
  },
});
