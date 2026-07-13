import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { AppButton, AppInput, AppSelect, Card, ErrorText, Heading, Muted, Screen, useResponsiveLayout } from '../components/ui';
import { colors } from '../theme/colors';

const FALLBACK_DEPARTMENTS = ['DCSA'];

export default function AuthScreen() {
  const { login, register, verifyOtp, resendOtp } = useAuth();
  const { isCompact } = useResponsiveLayout();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS);
  const [pendingOtpEmail, setPendingOtpEmail] = useState('');
  const [showOtpVerification, setShowOtpVerification] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    department: '',
    role: '',
  });
  const [otpForm, setOtpForm] = useState({ email: '', otp: '' });

  useEffect(() => {
    let isMounted = true;

    const loadDepartments = async () => {
      try {
        const data = await apiRequest('/api/departments');
        const nextDepartments = Array.isArray(data.departments)
          ? data.departments
              .map((department) => String(department?.name || department || '').trim())
              .filter(Boolean)
          : [];

        if (isMounted) {
          setDepartments(nextDepartments.length > 0 ? nextDepartments : FALLBACK_DEPARTMENTS);
        }
      } catch {
        if (isMounted) {
          setDepartments(FALLBACK_DEPARTMENTS);
        }
      }
    };

    loadDepartments();

    return () => {
      isMounted = false;
    };
  }, []);

  const withState = async (fn) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const onLogin = () => {
    withState(async () => {
      await login(loginForm);
      setSuccess('Login successful');
    });
  };

  const onSignup = () => {
    withState(async () => {
      if (!signupForm.department) {
        throw new Error('Please select a department');
      }

      if (!signupForm.role) {
        throw new Error('Please select a role');
      }

      const data = await register({
        username: signupForm.username.trim(),
        name: signupForm.name.trim(),
        email: signupForm.email.trim().toLowerCase(),
        password: signupForm.password,
        department: signupForm.department,
        role: signupForm.role,
      });

      if (data.requiresOtpVerification) {
        setPendingOtpEmail(signupForm.email.trim().toLowerCase());
        setOtpForm({ email: signupForm.email.trim().toLowerCase(), otp: '' });
        setShowOtpVerification(true);
      }

      setSuccess(data.message || 'Registered successfully');
    });
  };

  const onVerify = () => {
    withState(async () => {
      const data = await verifyOtp(otpForm);
      setSuccess(data.message || 'OTP verified');
    });
  };

  const onResend = () => {
    withState(async () => {
      const email = otpForm.email || pendingOtpEmail;
      const data = await resendOtp({ email });
      setSuccess(data.message || 'OTP sent');
    });
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContent}
          >
            <Card style={styles.heroCard}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>C</Text>
              </View>
              <Heading style={styles.heroTitle}>Campusly</Heading>
              <Muted style={styles.heroText}>Connect with campus services, updates, and people in one place.</Muted>
            </Card>

            <View style={[styles.tabRow, isCompact ? styles.tabRowCompact : null]}>
              <AppButton
                title="Login"
                onPress={() => setTab('login')}
                type={tab === 'login' ? 'primary' : 'ghost'}
                style={isCompact ? styles.tabButtonCompact : styles.tabButton}
              />
              <AppButton
                title="Sign Up"
                onPress={() => setTab('signup')}
                type={tab === 'signup' ? 'primary' : 'ghost'}
                style={isCompact ? styles.tabButtonCompact : styles.tabButton}
              />
            </View>

            <ErrorText text={error} />
            {!!success && <Text style={{ color: colors.accent, marginTop: 8 }}>{success}</Text>}

            {tab === 'login' ? (
              <Card style={[styles.panelCard, { marginTop: 12 }]}>
                <Heading size="sm">Login</Heading>
                <AppInput
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={loginForm.email}
                  onChangeText={(v) => setLoginForm((prev) => ({ ...prev, email: v }))}
                />
                <AppInput
                  label="Password"
                  secureTextEntry
                  value={loginForm.password}
                  onChangeText={(v) => setLoginForm((prev) => ({ ...prev, password: v }))}
                />
                <AppButton title="Login" onPress={onLogin} loading={loading} />
                {/* <Muted style={styles.helperLink}>Forget your password</Muted> */}
              </Card>
            ) : (
              <Card style={[styles.panelCard, { marginTop: 12 }]}>
                <Heading size="sm">Create account</Heading>
                <AppInput label="Username" value={signupForm.username} onChangeText={(v) => setSignupForm((p) => ({ ...p, username: v }))} />
                <AppInput label="Full name" value={signupForm.name} onChangeText={(v) => setSignupForm((p) => ({ ...p, name: v }))} />
                <AppInput
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={signupForm.email}
                  onChangeText={(v) => setSignupForm((p) => ({ ...p, email: v }))}
                />
                <AppInput label="Password" secureTextEntry value={signupForm.password} onChangeText={(v) => setSignupForm((p) => ({ ...p, password: v }))} />
                <AppSelect
                  label="Department"
                  value={signupForm.department}
                  placeholder="Select department"
                  items={departments.map((department) => ({ label: department, value: department }))}
                  onValueChange={(value) => setSignupForm((p) => ({ ...p, department: value }))}
                />
                <AppSelect
                  label="Role"
                  value={signupForm.role}
                  placeholder="Select role"
                  items={[
                    { label: 'Student', value: 'student' },
                    { label: 'Teacher', value: 'teacher' },
                  ]}
                  onValueChange={(value) => setSignupForm((p) => ({ ...p, role: value }))}
                />
                <Muted>Valid departments: {departments.join(', ')}</Muted>
                <AppButton title="Register" onPress={onSignup} loading={loading} />
              </Card>
            )}

            {showOtpVerification ? (
              <Card style={{ marginTop: 12, marginBottom: 24 }}>
                <Heading size="sm">OTP verification</Heading>
                <AppInput label="Email" value={otpForm.email} onChangeText={(v) => setOtpForm((p) => ({ ...p, email: v }))} />
                <AppInput label="OTP" keyboardType="number-pad" value={otpForm.otp} onChangeText={(v) => setOtpForm((p) => ({ ...p, otp: v }))} />
                <AppButton title="Verify OTP" onPress={onVerify} loading={loading} />
                <AppButton title="Resend OTP" onPress={onResend} type="ghost" disabled={loading} />
              </Card>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = {
  heroCard: {
    marginTop: 14,
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff8f4',
    borderColor: '#ead7cd',
  },
  heroBadge: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3ddd4',
    borderWidth: 1,
    borderColor: '#d8b9ab',
    marginBottom: 10,
  },
  heroBadgeText: {
    color: colors.brand,
    fontWeight: '900',
    fontSize: 22,
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroText: {
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 260,
  },
  panelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
  },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tabRowCompact: { flexDirection: 'column' },
  tabButton: { flex: 1 },
  tabButtonCompact: { width: '100%' },
  helperLink: {
    marginTop: 10,
    textAlign: 'center',
    color: colors.brand,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
};
