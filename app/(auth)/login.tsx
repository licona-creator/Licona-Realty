import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmail } from '@/src/lib/auth';
import {
  checkFaceIdAvailable,
  setFaceIdPreference,
} from '@/src/lib/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { colors, typography, spacing, radius } from '@/src/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { setFaceIdEnabled } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = email.trim().length > 0 && password.length > 0;

  async function handleSignIn() {
    if (!isFormValid || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    const { error: signInError } = await signInWithEmail(
      email.trim(),
      password,
    );

    if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
        setError(
          'Please confirm your email address before signing in. Check your inbox for a confirmation link.',
        );
      } else if (signInError.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(signInError.message);
      }
      setIsSubmitting(false);
      return;
    }

    const faceIdAvailable = await checkFaceIdAvailable();
    if (faceIdAvailable) {
      await promptFaceIdSetup();
    }

    setIsSubmitting(false);
  }

  async function promptFaceIdSetup() {
    const { Alert } = await import('react-native');
    Alert.alert(
      'Enable Face ID',
      'Would you like to use Face ID to unlock LR?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => setFaceIdPreference(false),
        },
        {
          text: 'Enable',
          onPress: async () => {
            await setFaceIdPreference(true);
            setFaceIdEnabled(true);
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.monogram}>LR</Text>
          <Text style={styles.title}>Welcome back</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.dark.textTertiary}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.dark.textTertiary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
              <TouchableOpacity
                style={styles.eyeToggle}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeToggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !isFormValid && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.linkText}>
              Don't have an account?{' '}
              <Text style={styles.linkTextBold}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['4xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  monogram: {
    fontFamily: typography.families.heading,
    fontSize: typography.sizes['3xl'],
    color: colors.gold,
    marginBottom: spacing.base,
  },
  title: {
    fontFamily: typography.families.heading,
    fontSize: typography.sizes['2xl'],
    color: '#ffffff',
  },
  form: {
    gap: spacing.base,
  },
  inputContainer: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
  },
  input: {
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: colors.dark.border,
    minHeight: 48,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: spacing['4xl'],
  },
  eyeToggle: {
    position: 'absolute',
    right: spacing.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    minHeight: 44,
  },
  eyeToggleText: {
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    color: colors.gold,
  },
  errorText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.dark.danger,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: typography.families.navSemibold,
    fontSize: typography.sizes.base,
    color: colors.navy,
  },
  linkContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
  },
  linkTextBold: {
    fontFamily: typography.families.bodySemibold,
    color: colors.gold,
  },
});
