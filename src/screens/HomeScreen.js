import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { AppButton, AppInput, Card, Heading, Muted, Screen } from '../components/ui';
import { colors } from '../theme/colors';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [chats, setChats] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const [announcementData, eventData, chatData] = await Promise.all([
        apiRequest('/api/announcements', { token }),
        apiRequest('/api/events', { token }),
        apiRequest('/api/messages/chats', { token }),
      ]);

      setAnnouncements((announcementData.announcements || []).slice(0, 5));
      setEvents((eventData.events || []).slice(0, 5));
      setChats((chatData.chats || []).slice(0, 5));
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    }
  }, [token]);

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

  const onCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      setError('Please enter announcement title and content');
      return;
    }

    setCreatingAnnouncement(true);
    setError('');

    try {
      await apiRequest('/api/announcements', {
        method: 'POST',
        token,
        body: {
          title: announcementForm.title.trim(),
          content: announcementForm.content.trim(),
        },
      });

      setAnnouncementForm({ title: '', content: '' });
      setShowAnnouncementModal(false);
      await loadData();
    } catch (e) {
      setError(e.message || 'Failed to create announcement');
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const onDeleteAnnouncement = async (announcementId) => {
    Alert.alert('Delete announcement', 'Are you sure you want to delete this announcement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setError('');
            await apiRequest(`/api/announcements/${announcementId}`, { method: 'DELETE', token });
            await loadData();
          } catch (e) {
            setError(e.message || 'Failed to delete announcement');
          }
        },
      },
    ]);
  };

  const onDeleteEvent = async (eventId) => {
    Alert.alert('Delete event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setError('');
            await apiRequest(`/api/events/${eventId}`, { method: 'DELETE', token });
            await loadData();
          } catch (e) {
            setError(e.message || 'Failed to delete event');
          }
        },
      },
    ]);
  };

  const todayCount = events.filter((ev) => {
    const d = new Date(ev.date);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingTop: 30 }}
        showsVerticalScrollIndicator={false}
      > 
        <Heading style={{ fontWeight: '800' }}>Welcome {user?.name || ''}</Heading>
        <Muted style={{marginTop:10}}>{user?.role || 'member'} {user?.department ? `| ${user.department}` : ''}</Muted>
        {user?.role === 'teacher' ? (
          <View style={{ marginTop: 12 }}>
            <AppButton title="Create announcement" onPress={() => setShowAnnouncementModal(true)} />
          </View>
        ) : null}
        {!!error && <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>}

        {/* <Card style={{ marginTop: 12 }}>
          <Heading size="sm">Quick stats</Heading>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: colors.text }}>Announcements: {announcements.length}</Text>
            <Text style={{ color: colors.text }}>Today events: {todayCount}</Text>
          </View>
          <Text style={{ color: colors.text, marginTop: 6 }}>Active chats: {chats.length}</Text>
        </Card> */}

        <Card style={{ marginTop: 12 }}>
          <Heading size="sm">Important announcements</Heading>
          {announcements.length === 0 ? <Muted>No announcements yet.</Muted> : null}
          {announcements.map((item) => (
            <View
              key={item._id}
              style={{
                marginTop: 8,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
              <Muted>{item.content}</Muted>
              <Muted style={{fontWeight:'600'}}>By {item.teacherName}</Muted>
              {(user?.role === 'admin' || (item.createdBy?._id || item.createdBy) === user?.id) ? (
                <View style={{ marginTop: 8 }}>
                  <AppButton title="Delete announcement" type="danger" onPress={() => onDeleteAnnouncement(item._id)} />
                </View>
              ) : null}
            </View>
          ))}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Heading size="sm">Upcoming events</Heading>
          <Pressable onPress={() => navigation.navigate('Events')}>
            <Muted>Tap to open Events</Muted>
          </Pressable>
          {events.length === 0 ? <Muted>No events yet.</Muted> : null}
          {events.map((item) => (
            <View key={item._id} style={{
                marginTop: 8,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
              }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
              <Muted>{new Date(item.date).toLocaleString()} | {item.location}</Muted>
              {(user?.role === 'admin' || (item.createdBy?._id || item.createdBy) === user?.id) ? (
                <View style={{ marginTop: 8 }}>
                  <AppButton title="Delete event" type="danger" onPress={() => onDeleteEvent(item._id)} />
                </View>
              ) : null}
            </View>
          ))}
        </Card>

        <Pressable onPress={() => navigation.navigate('Chat')}>
          <Card style={{ marginTop: 12, marginBottom: 24 }}>
            <Heading size="sm">Recent chats</Heading>
            <Muted>Tap to open Chat</Muted>
            {chats.length === 0 ? <Muted>No chat activity.</Muted> : null}
            {chats.map((item) => (
              <View key={item._id} style={{
                  marginTop: 8,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {item.chatType === 'department' ? `${item.department} Department` : 'Direct chat'}
                </Text>
                <Muted>{item.message || 'No messages yet'}</Muted>
              </View>
            ))}
          </Card>
        </Pressable>

        <Modal
          visible={showAnnouncementModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowAnnouncementModal(false)}
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
              <Heading size="sm">Create announcement</Heading>
              <AppInput
                label="Title"
                value={announcementForm.title}
                onChangeText={(value) => setAnnouncementForm((prev) => ({ ...prev, title: value }))}
              />
              <AppInput
                label="Content"
                multiline
                value={announcementForm.content}
                onChangeText={(value) => setAnnouncementForm((prev) => ({ ...prev, content: value }))}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <AppButton
                  title="Cancel"
                  type="ghost"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setShowAnnouncementModal(false);
                    setAnnouncementForm({ title: '', content: '' });
                  }}
                  disabled={creatingAnnouncement}
                />
                <AppButton
                  title="Post"
                  style={{ flex: 1 }}
                  onPress={onCreateAnnouncement}
                  loading={creatingAnnouncement}
                />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}
