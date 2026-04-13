import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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

export default function AdminUsersScreen() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!token || user?.role !== 'admin') return;
    setError('');
    try {
      const data = await apiRequest('/api/users/admin', { token });
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setError(e.message || 'Failed to load admin users');
    }
  }, [token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter((item) => `${item.name} ${item.email} ${item.username} ${item.department}`.toLowerCase().includes(q));
  }, [users, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const onRole = async (id, role) => {
    try {
      await apiRequest(`/api/users/admin/${id}/role`, {
        method: 'PATCH',
        token,
        body: { role },
      });
      await loadUsers();
    } catch (e) {
      setError(e.message || 'Role update failed');
    }
  };

  const onVerify = async (id, isVerified, department) => {
    try {
      await apiRequest(`/api/users/admin/${id}/status`, {
        method: 'PATCH',
        token,
        body: { isVerified, department: department || '' },
      });
      await loadUsers();
    } catch (e) {
      setError(e.message || 'Status update failed');
    }
  };

  const onDelete = async (id) => {
    Alert.alert('Delete user', 'Delete this user account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/users/admin/${id}`, { method: 'DELETE', token });
            await loadUsers();
          } catch (e) {
            setError(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  if (user?.role !== 'admin') {
    return (
      <Screen>
        <Heading>Admin</Heading>
        <Muted>Only admins can access this tab.</Muted>
      </Screen>
    );
  }

  const totalUsers = filtered.length;
  const verifiedCount = filtered.filter((item) => item.isVerified).length;
  const teachersCount = filtered.filter((item) => item.role === 'teacher').length;
  const adminsCount = filtered.filter((item) => item.role === 'admin').length;

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.headerWrap}>
          <Heading>Admin Users</Heading>
          <Muted>Manage roles, verification, and user status</Muted>
        </View>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalUsers}</Text>
              <Muted>Total</Muted>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{verifiedCount}</Text>
              <Muted>Verified</Muted>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{teachersCount}</Text>
              <Muted>Teachers</Muted>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{adminsCount}</Text>
              <Muted>Admins</Muted>
            </View>
          </View>
        </Card>

        <AppInput style={{ marginTop: 10 }} label="Search users" value={search} onChangeText={setSearch} />
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {filtered.map((item) => (
          <Card key={item._id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(item.name, item.username)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name} (@{item.username})</Text>
                <Muted>{item.email}</Muted>
              </View>
            </View>

            <View style={styles.metaWrap}>
              <Text style={[styles.metaChip, item.isVerified ? styles.metaChipVerified : styles.metaChipUnverified]}>
                {item.isVerified ? 'Verified' : 'Unverified'}
              </Text>
              <Text style={styles.metaChip}>{item.role}</Text>
              <Text style={styles.metaChip}>{item.department || 'N/A'}</Text>
            </View>

            <View style={styles.dropdownRow}>
              <View style={styles.dropdownBlock}>
                <Text style={styles.dropdownLabel}>Role</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={item.role}
                    onValueChange={(value) => {
                      if (value !== item.role) {
                        onRole(item._id, value);
                      }
                    }}
                    dropdownIconColor={colors.textMuted}
                    style={styles.pickerText}
                  >
                    <Picker.Item label="Student" value="student" />
                    <Picker.Item label="Teacher" value="teacher" />
                    <Picker.Item label="Admin" value="admin" />
                  </Picker>
                </View>
              </View>

              <View style={styles.dropdownBlock}>
                <Text style={styles.dropdownLabel}>Verification</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={item.isVerified ? 'verified' : 'unverified'}
                    onValueChange={(value) => {
                      const nextVerified = value === 'verified';
                      if (nextVerified !== item.isVerified) {
                        onVerify(item._id, nextVerified, item.department);
                      }
                    }}
                    dropdownIconColor={colors.textMuted}
                    style={styles.pickerText}
                  >
                    <Picker.Item label="Verified" value="verified" />
                    <Picker.Item label="Unverified" value="unverified" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <AppButton title="Delete" type="danger" style={styles.actionButton} onPress={() => onDelete(item._id)} />
            </View>
          </Card>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginTop: 28,
    marginBottom: 8,
  },
  summaryCard: {
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  userCard: {
    marginTop: 10,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#155e75',
    fontWeight: '700',
  },
  metaWrap: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 1,
    fontSize: 10,
    overflow: 'hidden',
  },
  metaChipVerified: {
    color: '#166534',
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  metaChipUnverified: {
    color: '#991b1b',
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  dropdownRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  dropdownBlock: {
    flex: 1,
    gap: 6,
  },
  dropdownLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.cardSoft,
    overflow: 'hidden',
  },
  pickerText: {
    color: colors.text,
  },
  actionButton: {
    flex: 1,
  },
});
