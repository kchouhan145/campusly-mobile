import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { AppButton, AppInput, Card, Heading, Muted, Screen } from '../components/ui';
import { colors } from '../theme/colors';

const initialCreate = {
  title: '',
  description: '',
  date: '',
  location: '',
  maxAttendees: '',
  department: '',
};

const cardAccentColors = ['#0284c7', '#0ea5e9', '#22c55e', '#f59e0b'];

export default function EventsScreen() {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreate);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canCreate = user?.role === 'teacher' || user?.role === 'admin';

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const data = await apiRequest('/api/events', { token });
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setError(e.message || 'Failed to load events');
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return events;
    return events.filter((item) => `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(q));
  }, [events, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const onCreate = async () => {
    setError('');
    setCreating(true);
    try {
      await apiRequest('/api/events', {
        method: 'POST',
        token,
        body: {
          ...createForm,
          date: new Date(createForm.date).toISOString(),
          maxAttendees: createForm.maxAttendees || undefined,
          department: createForm.department || user?.department || undefined,
        },
      });

      setCreateForm(initialCreate);
      setShowCreateModal(false);
      await loadEvents();
    } catch (e) {
      setError(e.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    Alert.alert('Delete event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/events/${id}`, { method: 'DELETE', token });
            await loadEvents();
          } catch (e) {
            setError(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Heading style={{ color: '#0c4a6e' }}>Events</Heading>
          {canCreate ? (
            <AppButton
              title="Create"
              onPress={() => setShowCreateModal(true)}
              style={{ minWidth: 86, paddingVertical: 10, paddingHorizontal: 18 }}
            />
          ) : null}
        </View>
        <View
          style={{
            marginTop: 10,
            marginBottom: 12,
            backgroundColor: '#e0f2fe',
            borderLeftWidth: 4,
            borderLeftColor: '#0284c7',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: '#0c4a6e', fontWeight: '700' }}>Campus Events</Text>
          <Muted>Find what is happening and join in.</Muted>
        </View>
        <AppInput style={{marginBottom:10}} label="Search events" value={search} onChangeText={setSearch} />
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {filtered.map((item, index) => (
          <Card
            key={item._id}
            style={{
              borderLeftWidth: 5,
              borderLeftColor: cardAccentColors[index % cardAccentColors.length],
              backgroundColor: '#f8fbff',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.title}</Text>
            <Muted style={{ marginTop: 4 }}>{item.description}</Muted>
            <Muted style={{ marginTop: 6 }}>{new Date(item.date).toLocaleString()} | {item.location}</Muted>
            <Muted>Department: {item.department || 'N/A'}</Muted>
            {(user?.role === 'admin' || (item.createdBy?._id || item.createdBy) === user?.id) ? (
              <AppButton title="Delete" type="danger" onPress={() => onDelete(item._id)} />
            ) : null}
          </Card>
        ))}
        <View style={{ height: 20 }} />

        <Modal
          visible={showCreateModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.35)',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <Card>
              <Heading size="sm">Create event</Heading>
              <AppInput label="Title" value={createForm.title} onChangeText={(v) => setCreateForm((p) => ({ ...p, title: v }))} />
              <AppInput
                label="Description"
                multiline
                value={createForm.description}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, description: v }))}
              />
              <AppInput
                label="Date time (YYYY-MM-DD HH:mm)"
                value={createForm.date}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, date: v }))}
              />
              <AppInput label="Location" value={createForm.location} onChangeText={(v) => setCreateForm((p) => ({ ...p, location: v }))} />
              <AppInput
                label="Max attendees"
                keyboardType="number-pad"
                value={createForm.maxAttendees}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, maxAttendees: v }))}
              />
              {user?.role === 'admin' ? (
                <AppInput
                  label="Department"
                  value={createForm.department}
                  onChangeText={(v) => setCreateForm((p) => ({ ...p, department: v }))}
                />
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <AppButton
                  title="Cancel"
                  type="ghost"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setShowCreateModal(false);
                    setCreateForm(initialCreate);
                  }}
                  disabled={creating}
                />
                <AppButton title="Create event" style={{ flex: 1 }} onPress={onCreate} loading={creating} />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}
