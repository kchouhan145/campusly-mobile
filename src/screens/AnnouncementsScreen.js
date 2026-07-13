import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { AppButton, Card, Heading, Muted, Screen } from '../components/ui';
import { colors } from '../theme/colors';

export default function AnnouncementsScreen() {
  const { token, user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const data = await apiRequest('/api/announcements', { token });
      setAnnouncements(data.announcements || data || []);
    } catch (e) {
      setError(e.message || 'Failed to load announcements');
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [loadAnnouncements])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  const openDetails = (item) => {
    setSelectedAnnouncement(item);
    setShowDetailsModal(true);
  };

  const closeDetails = () => {
    setShowDetailsModal(false);
    setSelectedAnnouncement(null);
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="menu-outline" size={22} color={colors.text} />
          </Pressable> */}

          <View style={styles.brandBlock}>
            <View style={styles.brandMark}>
              <Image source={require('../../assets/icon.png')} style={styles.brandMarkImage} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.brandTitle}>Campusly</Text>
              <Text style={styles.brandSubtitle}>Announcements</Text>
            </View>
          </View>

          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable> */}
        </View>

        {!!error && <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>}

        {announcements.length === 0 ? (
          <Muted style={{ marginTop: 12 }}>No announcements yet.</Muted>
        ) : (
          announcements.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => openDetails(item)}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Muted style={{ marginTop: 6 }}>By {item.teacherName || item.createdBy?.name || 'Teacher'}</Muted>
              </View>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumb} />
              ) : (
                <View style={styles.thumbPlaceholder} />
              )}
            </Pressable>
          ))
        )}

        <Modal visible={showDetailsModal} animationType="fade" transparent onRequestClose={closeDetails}>
          <View style={styles.modalBackdrop}>
            <Card style={{ backgroundColor: '#fff8f4', padding: 18 }}>
              <View style={{ borderLeftWidth: 5, borderLeftColor: '#f59e0b', paddingLeft: 12, marginLeft: -12 }}>
                <Heading size="sm" style={{ color: '#92400e' }}>{selectedAnnouncement?.title || 'Announcement'}</Heading>
              </View>

              <Muted style={{ marginTop: 8, fontWeight: '600', fontSize: 14 }}>
                By {selectedAnnouncement?.teacherName || selectedAnnouncement?.createdBy?.name || 'Teacher'}
              </Muted>

              <Text style={{ color: colors.text, marginTop: 12, lineHeight: 22 }}>{selectedAnnouncement?.content || 'No content available.'}</Text>

              {selectedAnnouncement?.image ? (
                <>
                  <Image source={{ uri: selectedAnnouncement.image }} style={{ width: '100%', height: 220, borderRadius: 8, marginTop: 12 }} />
                  <AppButton title="View image" style={{ marginTop: 10 }} onPress={() => setShowImageModal(true)} />
                </>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <AppButton title="Close" type="ghost" style={{ flex: 1 }} onPress={closeDetails} />
                {(user?.role === 'admin' || user?.role === 'superAdmin' || (selectedAnnouncement?.createdBy?._id || selectedAnnouncement?.createdBy) === user?.id) ? (
                  <AppButton title="Delete" type="danger" style={{ flex: 1 }} onPress={async () => {
                    try {
                      await apiRequest(`/api/announcements/${selectedAnnouncement._id}`, { method: 'DELETE', token });
                      closeDetails();
                      await loadAnnouncements();
                    } catch (e) {
                      setError(e.message || 'Failed to delete announcement');
                    }
                  }} />
                ) : null}
              </View>
            </Card>
          </View>
        </Modal>

        <Modal visible={showImageModal} animationType="fade" transparent onRequestClose={() => setShowImageModal(false)}>
          <View style={styles.imageBackdrop}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowImageModal(false)}>
              <Image source={{ uri: selectedAnnouncement?.image }} style={styles.fullImage} resizeMode="contain" />
            </Pressable>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fffaf6',
    borderWidth: 1,
    borderColor: '#f1ddd2',
  },
    brandBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    brandMark: {
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#e6e6e6',
    },
    brandMarkImage: {
      width: 22,
      height: 22,
      borderRadius: 999,
    },
    brandMarkText: {
      color: colors.brand,
      fontWeight: '900',
      fontSize: 18,
      letterSpacing: -0.5,
    },
    brandTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 20,
    },
    brandSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 1,
    },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  thumb: {
    width: 74,
    height: 74,
    borderRadius: 8,
  },
  thumbPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 8,
    backgroundColor: '#eadfd8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  imageBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  fullImage: {
    width: '100%',
    height: '100%'
  }
});
