import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { AppButton, AppInput, Card, Heading, Muted, Screen } from '../components/ui';
import { colors } from '../theme/colors';

function getInitials(name, username) {
  const source = String(name || username || '').trim();
  if (!source) return 'U';

  const parts = source.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getRoleTheme(role) {
  if (role === 'admin') {
    return {
      avatarBg: '#ede9fe',
      avatarText: '#5b21b6',
      badgeBg: '#f3e8ff',
      badgeText: '#6b21a8',
      icon: 'A',
    };
  }

  if (role === 'teacher') {
    return {
      avatarBg: '#dbeafe',
      avatarText: '#1d4ed8',
      badgeBg: '#e0f2fe',
      badgeText: '#0c4a6e',
      icon: 'T',
    };
  }

  return {
    avatarBg: '#dcfce7',
    avatarText: '#166534',
    badgeBg: '#ecfdf5',
    badgeText: '#065f46',
    icon: 'S',
  };
}

export default function ProfileScreen() {
  const { token, user, refreshMe, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({
    name: '',
    department: '',
    phone: '',
    bio: '',
  });

  const loadData = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const me = await apiRequest('/api/users/profile', { token });

      const meUser = me.user || user;
      setEdit({
        name: meUser?.name || '',
        department: meUser?.department || '',
        phone: meUser?.phone || '',
        bio: meUser?.bio || '',
      });
      await refreshMe();
    } catch (e) {
      setError(e.message || 'Failed to load profile');
    }
  }, [refreshMe, token, user]);

  const roleTheme = getRoleTheme(user?.role);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      await apiRequest('/api/users/profile', {
        method: 'PUT',
        token,
        body: edit,
      });
      await loadData();
    } catch (e) {
      setError(e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.headerWrap}>
          <Heading>Profile</Heading>
          <Muted>Manage your Campusly identity</Muted>
        </View>

        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={[styles.avatarCircle, { backgroundColor: roleTheme.avatarBg }]}>
              <Text style={[styles.avatarText, { color: roleTheme.avatarText }]}>{getInitials(user?.name, user?.username)}</Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroName}>{user?.name || 'Campusly User'}</Text>
              <Muted>@{user?.username || 'username'}</Muted>
              <View style={styles.badgesRow}>
                <View style={[styles.roleBadge, { backgroundColor: roleTheme.badgeBg }]}>
                  <Text style={[styles.roleBadgeText, { color: roleTheme.badgeText }]}>
                    {roleTheme.icon} {String(user?.role || 'member').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.deptBadge}>
                  <Text style={styles.deptBadgeText}>{user?.department || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <Card style={styles.formCard}>
          <Heading size="sm">Edit profile</Heading>
          <AppInput label="Name" value={edit.name} onChangeText={(v) => setEdit((p) => ({ ...p, name: v }))} />
          <AppInput label="Department" value={edit.department} onChangeText={(v) => setEdit((p) => ({ ...p, department: v }))} />
          <AppInput label="Phone" value={edit.phone} onChangeText={(v) => setEdit((p) => ({ ...p, phone: v }))} />
          <AppInput label="Bio" multiline value={edit.bio} onChangeText={(v) => setEdit((p) => ({ ...p, bio: v }))} />
          <View style={styles.actionsRow}>
            <AppButton title="Save" onPress={onSave} loading={saving} style={{ flex: 1 }} />
            <AppButton title="Logout" type="danger" onPress={logout} style={{ flex: 1 }} />
          </View>
        </Card>

        <View style={{ height: 20 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginTop: 26,
    marginBottom: 10,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1e3a8a',
    fontWeight: '800',
    fontSize: 18,
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  badgesRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontWeight: '700',
    fontSize: 11,
  },
  deptBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
  },
  deptBadgeText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 11,
  },
  formCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  actionsRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
});
