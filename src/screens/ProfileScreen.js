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

export default function ProfileScreen() {
  const { token, user, refreshMe, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
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
      const people = await apiRequest('/api/users', { token });

      const meUser = me.user || user;
      setEdit({
        name: meUser?.name || '',
        department: meUser?.department || '',
        phone: meUser?.phone || '',
        bio: meUser?.bio || '',
      });
      setUsers(Array.isArray(people.users) ? people.users : []);
      await refreshMe();
    } catch (e) {
      setError(e.message || 'Failed to load profile');
    }
  }, [refreshMe, token, user]);

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
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(user?.name, user?.username)}</Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroName}>{user?.name || 'Campusly User'}</Text>
              <Muted>@{user?.username || 'username'}</Muted>
              <Muted>{user?.role || 'member'} | {user?.department || 'N/A'}</Muted>
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

        <Card style={styles.usersCard}>
          <Heading size="sm">Campus users</Heading>
          {users.map((person) => (
            <View key={person._id} style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{getInitials(person.name, person.username)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{person.name} (@{person.username})</Text>
                <Muted>{person.role} | {person.department || 'N/A'}</Muted>
              </View>
            </View>
          ))}
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
    gap: 2,
  },
  heroName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  formCard: {
    marginTop: 12,
  },
  actionsRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  usersCard: {
    marginTop: 12,
  },
  userRow: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#155e75',
    fontWeight: '700',
    fontSize: 12,
  },
});
