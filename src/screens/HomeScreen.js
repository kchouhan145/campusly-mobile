import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View, StyleSheet, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { io } from 'socket.io-client';
import messaging from '@react-native-firebase/messaging';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { API_BASE } from '../services/config';
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
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showAnnouncementDetailsModal, setShowAnnouncementDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);

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

  const openAnnouncementInApp = useCallback(
    async ({ announcementId, fallbackTitle, fallbackContent, fallbackTeacherName }) => {
      if (!token) {
        return;
      }

      if (announcementId) {
        try {
          const data = await apiRequest(`/api/announcements/${announcementId}`, { token });
          if (data?.announcement) {
            setSelectedAnnouncement(data.announcement);
            setShowAnnouncementDetailsModal(true);
            await loadData();
            return;
          }
        } catch (error) {
          // Fall back to payload content if announcement fetch fails.
        }
      }

      if (fallbackTitle || fallbackContent) {
        setSelectedAnnouncement({
          title: fallbackTitle || 'Announcement',
          content: fallbackContent || 'Open announcements to read more.',
          teacherName: fallbackTeacherName || 'Teacher',
        });
        setShowAnnouncementDetailsModal(true);
      }

      await loadData();
    },
    [token, loadData]
  );

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      return undefined;
    }

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket'],
    });

    const onAnnouncementNotification = (payload) => {
      const title = payload?.title || 'New announcement';
      const teacherName = payload?.announcement?.teacherName || payload?.teacherName || 'Teacher';
      const content = payload?.content || 'Open Campusly to read more.';
      const announcementId = payload?.announcement?._id || payload?.announcementId;

      Alert.alert('Announcement', `${title}\nBy ${teacherName}`, [
        { text: 'Later', style: 'cancel' },
        {
          text: 'View',
          onPress: () => {
            openAnnouncementInApp({
              announcementId,
              fallbackTitle: title,
              fallbackContent: content,
              fallbackTeacherName: teacherName,
            });
          },
        },
      ]);
    };

    socket.on('announcement_notification', onAnnouncementNotification);

    return () => {
      socket.off('announcement_notification', onAnnouncementNotification);
      socket.disconnect();
    };
  }, [token, user?.role, openAnnouncementInApp]);

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      return undefined;
    }

    const openFromRemoteMessage = (remoteMessage) => {
      const announcementId = remoteMessage?.data?.announcementId;
      const title = remoteMessage?.data?.title || remoteMessage?.notification?.title;
      const content = remoteMessage?.data?.content || remoteMessage?.notification?.body;
      const teacherName = remoteMessage?.data?.teacherName;

      return openAnnouncementInApp({
        announcementId,
        fallbackTitle: title,
        fallbackContent: content,
        fallbackTeacherName: teacherName,
      });
    };

    const unsubscribeNotificationOpen = messaging().onNotificationOpenedApp(openFromRemoteMessage);
    const unsubscribeForegroundMessage = messaging().onMessage(openFromRemoteMessage);

    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          return openFromRemoteMessage(remoteMessage);
        }
        return null;
      })
      .catch(() => {});

    return () => {
      unsubscribeNotificationOpen();
      unsubscribeForegroundMessage();
    };
  }, [token, user?.role, openAnnouncementInApp]);

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

  const styles = StyleSheet.create({
    announcementCard: {
      backgroundColor: '#fef3c7',
      marginTop: 12,
      borderLeftWidth: 5,
      borderLeftColor: '#f59e0b',
      borderRadius: 10,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    announcementItem: {
      backgroundColor: '#fef9f0',
      marginTop: 8,
      borderColor: '#f59e0b',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    announcementTitle: {
      flex: 1,
      color: colors.text,
      fontWeight: '700',
      marginRight: 8,
    },
    announcementMuted: {
      color: colors.textMuted,
      fontWeight: '500',
      marginTop: 4,
    },
    eventCard: {
      backgroundColor: '#e0f2fe',
      marginTop: 12,
      borderLeftWidth: 5,
      borderLeftColor: '#0284c7',
      borderRadius: 10,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    eventItem: {
      backgroundColor: '#f0f9fe',
      marginTop: 8,
      borderColor: '#0284c7',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    eventTitle: {
      flex: 1,
      color: colors.text,
      fontWeight: '700',
      marginRight: 8,
    },
    eventMuted: {
      color: colors.textMuted,
      fontWeight: '500',
      marginTop: 4,
    },
  });

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

        <Card style={styles.announcementCard}>
          <Heading size="sm" style={{ color: '#92400e' }}>📢 Important Announcements</Heading>
          {announcements.length === 0 ? <Muted>No announcements yet.</Muted> : null}
          {announcements.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => {
                setSelectedAnnouncement(item);
                setShowAnnouncementDetailsModal(true);
              }}
              android_ripple={{ color: '#f59e0b', radius: 500 }}
              style={({ pressed }) => [
                styles.announcementItem,
                pressed && { opacity: 0.7 }
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.announcementTitle}>{item.title}</Text>
                <Text style={styles.announcementMuted}>By {item.teacherName}</Text>
              </View>
              <Text style={{ fontSize: 18 }}>→</Text>
            </Pressable>
          ))}
          {(user?.role === 'admin' || user?.role === 'teacher') && announcements.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={() => navigation.navigate('Announcements')}>
                <Text style={{ color: '#f59e0b', fontWeight: '600', textAlign: 'center' }}>View all announcements</Text>
              </Pressable>
            </View>
          ) : null}
        </Card>

        <Card style={styles.eventCard}>
          <Heading size="sm" style={{ color: '#0c4a6e' }}>📅 Upcoming Events</Heading>
          {events.length === 0 ? <Muted>No events yet.</Muted> : null}
          {events.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => {
                setSelectedEvent(item);
                setShowEventDetailsModal(true);
              }}
              android_ripple={{ color: '#0284c7', radius: 500 }}
              style={({ pressed }) => [
                styles.eventItem,
                pressed && { opacity: 0.7 }
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventMuted}>{new Date(item.date).toLocaleString()} | {item.location}</Text>
              </View>
              <Text style={{ fontSize: 18 }}>→</Text>
            </Pressable>
          ))}
          {(user?.role === 'admin' || user?.role === 'teacher') && events.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={() => navigation.navigate('Events')}>
                <Text style={{ color: '#0284c7', fontWeight: '600', textAlign: 'center' }}>View all events</Text>
              </Pressable>
            </View>
          ) : null}
        </Card>


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

        <Modal
          visible={showAnnouncementDetailsModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowAnnouncementDetailsModal(false)}
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
              <View style={{ borderLeftWidth: 5, borderLeftColor: '#f59e0b', paddingLeft: 12, marginLeft: -12 }}>
                <Heading size="sm" style={{ color: '#92400e' }}>{selectedAnnouncement?.title || 'Announcement'}</Heading>
              </View>
              <Muted style={{ marginTop: 8, fontWeight: '600', fontSize: 14 }}>
                By {selectedAnnouncement?.teacherName || selectedAnnouncement?.createdBy?.name || 'Teacher'}
              </Muted>
              <Text style={{ color: colors.text, marginTop: 12, lineHeight: 22 }}>
                {selectedAnnouncement?.content || 'No content available.'}
              </Text>
              {selectedAnnouncement?.image ? (
                <Image 
                  source={{ uri: selectedAnnouncement.image }} 
                  style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 12 }}
                />
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <AppButton
                  title="Close"
                  type="ghost"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setShowAnnouncementDetailsModal(false);
                    setSelectedAnnouncement(null);
                  }}
                />
                {(user?.role === 'admin' || (selectedAnnouncement?.createdBy?._id || selectedAnnouncement?.createdBy) === user?.id) ? (
                  <AppButton
                    title="Delete"
                    type="danger"
                    style={{ flex: 1 }}
                    onPress={() => {
                      onDeleteAnnouncement(selectedAnnouncement._id);
                      setShowAnnouncementDetailsModal(false);
                      setSelectedAnnouncement(null);
                    }}
                  />
                ) : null}
              </View>
            </Card>
          </View>
        </Modal>

        <Modal
          visible={showEventDetailsModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowEventDetailsModal(false)}
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
              <View style={{ borderLeftWidth: 5, borderLeftColor: '#0284c7', paddingLeft: 12, marginLeft: -12 }}>
                <Heading size="sm" style={{ color: '#0c4a6e' }}>{selectedEvent?.title || 'Event'}</Heading>
              </View>
              <Muted style={{ marginTop: 8, fontWeight: '600', fontSize: 14 }}>
                📅 {new Date(selectedEvent?.date).toLocaleString()}
              </Muted>
              <Muted style={{ marginTop: 4, fontWeight: '600', fontSize: 14 }}>
                📍 {selectedEvent?.location || 'Location TBA'}
              </Muted>
              <Text style={{ color: colors.text, marginTop: 12, lineHeight: 22 }}>
                {selectedEvent?.description || 'No description available.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <AppButton
                  title="Close"
                  type="ghost"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setShowEventDetailsModal(false);
                    setSelectedEvent(null);
                  }}
                />
                {(user?.role === 'admin' || (selectedEvent?.createdBy?._id || selectedEvent?.createdBy) === user?.id) ? (
                  <AppButton
                    title="Delete"
                    type="danger"
                    style={{ flex: 1 }}
                    onPress={() => {
                      onDeleteEvent(selectedEvent._id);
                      setShowEventDetailsModal(false);
                      setSelectedEvent(null);
                    }}
                  />
                ) : null}
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}
