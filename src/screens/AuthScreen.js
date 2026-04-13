import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { AppButton, AppInput, Card, ErrorText, Heading, Muted, Screen } from '../components/ui';
import { colors } from '../theme/colors';

const departments = ['DCSA', 'History', 'Mathematics', 'Physics', 'Other'];

export default function AuthScreen() {
  const { login, register, verifyOtp, resendOtp } = useAuth();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingOtpEmail, setPendingOtpEmail] = useState('');
  const [showOtpVerification, setShowOtpVerification] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    department: '',
    customDepartment: '',
    role: '',
  });
  const [otpForm, setOtpForm] = useState({ email: '', otp: '' });

  const departmentValue = useMemo(() => {
    if (signupForm.department === 'Other') {
      return signupForm.customDepartment.trim();
    }
    return signupForm.department;
  }, [signupForm]);

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

      if (signupForm.department === 'Other' && !signupForm.customDepartment.trim()) {
        throw new Error('Please enter a custom department name');
      }

      if (!signupForm.role) {
        throw new Error('Please select a role');
      }

      const data = await register({
        username: signupForm.username.trim(),
        name: signupForm.name.trim(),
        email: signupForm.email.trim().toLowerCase(),
        password: signupForm.password,
        department: departmentValue,
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
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ marginTop: 30, marginBottom: 12 }}>
            <Heading>Welcome to Campusly</Heading>
            <Muted style={{ marginTop: 10 }}>
              Campusly brings your college community into one place for events, announcements, chats, buying and selling,
              and lost-and-found support, so students and staff can stay connected every day.
            </Muted>
            <View
              style={{
                width: 64,
                height: 4,
                borderRadius: 999,
                backgroundColor: colors.accentAlt,
                marginTop: 10,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingHorizontal: 0 }}>
            <AppButton
              title="Login"
              onPress={() => setTab('login')}
              type={tab === 'login' ? 'primary' : 'ghost'}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Sign Up"
              onPress={() => setTab('signup')}
              type={tab === 'signup' ? 'primary' : 'ghost'}
              style={{ flex: 1 }}
            />
          </View>

          <ErrorText text={error} />
          {!!success && <Text style={{ color: colors.accent, marginTop: 8 }}>{success}</Text>}

          {tab === 'login' ? (
            <Card style={{ marginTop: 12 }}>
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
            </Card>
          ) : (
            <Card style={{ marginTop: 12 }}>
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
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Department</Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    backgroundColor: colors.cardSoft,
                    overflow: 'hidden',
                  }}
                >
                  <Picker
                    selectedValue={signupForm.department}
                    onValueChange={(value) =>
                      setSignupForm((p) => ({
                        ...p,
                        department: value,
                        customDepartment: value === 'Other' ? p.customDepartment : '',
                      }))
                    }
                    dropdownIconColor={colors.textMuted}
                    style={{ color: colors.text }}
                  >
                    <Picker.Item label="Select department" value="" />
                    {departments.map((department) => (
                      <Picker.Item key={department} label={department} value={department} />
                    ))}
                  </Picker>
                </View>
              </View>
              {signupForm.department === 'Other' ? (
                <AppInput
                  label="Custom department"
                  value={signupForm.customDepartment}
                  onChangeText={(v) => setSignupForm((p) => ({ ...p, customDepartment: v }))}
                />
              ) : null}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Role</Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    backgroundColor: colors.cardSoft,
                    overflow: 'hidden',
                  }}
                >
                  <Picker
                    selectedValue={signupForm.role}
                    onValueChange={(value) => setSignupForm((p) => ({ ...p, role: value }))}
                    dropdownIconColor={colors.textMuted}
                    style={{ color: colors.text }}
                  >
                    <Picker.Item label="Select role" value="" />
                    <Picker.Item label="Student" value="student" />
                    <Picker.Item label="Teacher" value="teacher" />
                  </Picker>
                </View>
              </View>
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
      </SafeAreaView>
    </Screen>
  );
}
