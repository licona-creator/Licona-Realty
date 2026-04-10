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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { signUpWithEmail } from '@/src/lib/auth';
import { colors, typography, spacing, radius } from '@/src/theme/tokens';

const PASSWORD_REQUIREMENTS = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getPasswordStrength(password: string): number {
  return PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;
}

const STRENGTH_COLORS = [
  colors.dark.danger,
  '#f97316',
  colors.dark.warning,
  colors.dark.success,
];

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const allRequirementsMet = strength === PASSWORD_REQUIREMENTS.length;
  const isFormValid =
    email.trim().length > 0 && allRequirementsMet && passwordsMatch;

  async function handleSignUp() {
    if (!isFormValid || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    const { error: signUpError } = await signUpWithEmail(
      email.trim(),
      password,
    );

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setRegistrationComplete(true);
  }

  if (registrationComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmationContent}>
          <Mail size={48} color={colors.gold} />
          <Text style={styles.confirmationTitle}>Verify your email</Text>
          <Text style={styles.confirmationText}>
            We sent a confirmation link to {email}. Tap the link to activate
            your account.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openURL('message://')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Open Mail</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.linkText}>
              <Text style={styles.linkTextBold}>Back to sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
          <Text style={styles.title}>Create your account</Text>
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
                placeholder="Create a password"
                placeholderTextColor={colors.dark.textTertiary}
                secureTextEntry={!showPassword}
                returnKeyType="next"
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

            {password.length > 0 && (
              <>
                <View style={styles.strengthBar}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            i < strength
                              ? STRENGTH_COLORS[strength - 1]
                              : colors.dark.backgroundTertiary,
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.requirements}>
                  {PASSWORD_REQUIREMENTS.map((req) => (
                    <View key={req.label} style={styles.requirementRow}>
                      <Text
                        style={[
                          styles.requirementDot,
                          {
                            color: req.test(password)
                              ? colors.dark.success
                              : colors.dark.textTertiary,
                          },
                        ]}
                      >
                        {req.test(password) ? '\u2713' : '\u2022'}
                      </Text>
                      <Text
                        style={[
                          styles.requirementText,
                          {
                            color: req.test(password)
                              ? colors.dark.success
                              : colors.dark.textTertiary,
                          },
                        ]}
                      >
                        {req.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              placeholderTextColor={colors.dark.textTertiary}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={styles.mismatchText}>Passwords do not match</Text>
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !isFormValid && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkTextBold}>Sign in</Text>
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
  confirmationContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.base,
  },
  confirmationTitle: {
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.xl,
    color: '#ffffff',
    marginTop: spacing.base,
  },
  confirmationText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.base * typography.lineHeights.relaxed,
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
  strengthBar: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  requirements: {
    gap: spacing.xs,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requirementDot: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    width: 16,
    textAlign: 'center',
  },
  requirementText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
  },
  mismatchText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    color: colors.dark.danger,
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
