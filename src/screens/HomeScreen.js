import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { io } from "socket.io-client";
import messaging from "@react-native-firebase/messaging";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { API_BASE } from "../services/config";
import {
  AppButton,
  AppInput,
  Card,
  Heading,
  Muted,
  Screen,
  useResponsiveLayout,
} from "../components/ui";
import { colors } from "../theme/colors";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { isCompact, pagePadding } = useResponsiveLayout();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [chats, setChats] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    image: null,
  });
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showAnnouncementDetailsModal, setShowAnnouncementDetailsModal] =
    useState(false);
  const [showAnnouncementImageModal, setShowAnnouncementImageModal] =
    useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const [announcementData, eventData, chatData] = await Promise.all([
        apiRequest("/api/announcements", { token }),
        apiRequest("/api/events?upcoming=true", { token }),
        apiRequest("/api/messages/chats", { token }),
      ]);

      setAnnouncements((announcementData.announcements || []).slice(0, 5));
      setEvents((eventData.events || []).slice(0, 5));
      setChats((chatData.chats || []).slice(0, 5));
    } catch (e) {
      setError(e.message || "Failed to load dashboard");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const openAnnouncementInApp = useCallback(
    async ({
      announcementId,
      fallbackTitle,
      fallbackContent,
      fallbackTeacherName,
    }) => {
      if (!token) {
        return;
      }

      if (announcementId) {
        try {
          const data = await apiRequest(
            `/api/announcements/${announcementId}`,
            { token },
          );
          if (data?.announcement) {
            navigation.navigate("AnnouncementDetails", { id: announcementId });
            await loadData();
            return;
          }
        } catch (error) {
          // Fall back to payload content if announcement fetch fails.
        }
      }

      if (fallbackTitle || fallbackContent) {
        navigation.navigate("AnnouncementDetails", {
          title: fallbackTitle || "Announcement",
          content: fallbackContent || "Open announcements to read more.",
          teacherName: fallbackTeacherName || "Teacher",
        });
      }

      await loadData();
    },
    [token, loadData, navigation],
  );

  useEffect(() => {
    if (!token || user?.role !== "student") {
      return undefined;
    }

    const socket = io(API_BASE, {
      auth: { token },
      transports: ["websocket"],
    });

    const onAnnouncementNotification = (payload) => {
      const title = payload?.title || "New announcement";
      const teacherName =
        payload?.announcement?.teacherName || payload?.teacherName || "Teacher";
      const content = payload?.content || "Open Campusly to read more.";
      const announcementId =
        payload?.announcement?._id || payload?.announcementId;

      Alert.alert("Announcement", `${title}\nBy ${teacherName}`, [
        { text: "Later", style: "cancel" },
        {
          text: "View",
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

    socket.on("announcement_notification", onAnnouncementNotification);

    return () => {
      socket.off("announcement_notification", onAnnouncementNotification);
      socket.disconnect();
    };
  }, [token, user?.role, openAnnouncementInApp]);

  useEffect(() => {
    if (!token || user?.role !== "student") {
      return undefined;
    }

    const openFromRemoteMessage = (remoteMessage) => {
      const announcementId = remoteMessage?.data?.announcementId;
      const title =
        remoteMessage?.data?.title || remoteMessage?.notification?.title;
      const content =
        remoteMessage?.data?.content || remoteMessage?.notification?.body;
      const teacherName = remoteMessage?.data?.teacherName;

      return openAnnouncementInApp({
        announcementId,
        fallbackTitle: title,
        fallbackContent: content,
        fallbackTeacherName: teacherName,
      });
    };

    const unsubscribeNotificationOpen = messaging().onNotificationOpenedApp(
      openFromRemoteMessage,
    );
    const unsubscribeForegroundMessage = messaging().onMessage(
      openFromRemoteMessage,
    );

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
      setError("Please enter announcement title and content");
      return;
    }

    setCreatingAnnouncement(true);
    setError("");

    try {
      if (announcementForm.image && announcementForm.image.uri) {
        const fd = new FormData();
        fd.append('title', announcementForm.title.trim());
        fd.append('content', announcementForm.content.trim());
        const file = announcementForm.image;
        fd.append('image', {
          uri: file.uri,
          name: file.fileName || `photo_${Date.now()}.jpg`,
          type: file.type || 'image/jpeg',
        });

        await apiRequest('/api/announcements', { method: 'POST', token, body: fd });
      } else {
        await apiRequest('/api/announcements', {
          method: 'POST',
          token,
          body: {
            title: announcementForm.title.trim(),
            content: announcementForm.content.trim(),
          },
        });
      }

      setAnnouncementForm({ title: "", content: "", image: null });
      setShowAnnouncementModal(false);
      await loadData();
    } catch (e) {
      setError(e.message || "Failed to create announcement");
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const pickAnnouncementImage = async () => {
    try {
      // eslint-disable-next-line global-require
      const { launchImageLibrary } = require('react-native-image-picker');
      const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, includeBase64: false });
      const asset = res?.assets && res.assets[0];
      if (asset) {
        setAnnouncementForm((p) => ({ ...p, image: asset }));
      }
    } catch (err) {
      Alert.alert(
        'Image picker not available',
        'Please install react-native-image-picker and rebuild the app:\n\nnpm install react-native-image-picker\n\nThen rebuild the app.',
      );
    }
  };

  const onDeleteAnnouncement = async (announcementId) => {
    Alert.alert(
      "Delete announcement",
      "Are you sure you want to delete this announcement?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setError("");
              await apiRequest(`/api/announcements/${announcementId}`, {
                method: "DELETE",
                token,
              });
              await loadData();
            } catch (e) {
              setError(e.message || "Failed to delete announcement");
            }
          },
        },
      ],
    );
  };

  const onDeleteEvent = async (eventId) => {
    Alert.alert("Delete event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setError("");
            await apiRequest(`/api/events/${eventId}`, {
              method: "DELETE",
              token,
            });
            await loadData();
          } catch (e) {
            setError(e.message || "Failed to delete event");
          }
        },
      },
    ]);
  };

  const todayCount = events.filter((ev) => {
    const d = new Date(ev.date);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }).length;

  const upcomingEvents = events.filter((ev) => new Date(ev.date) >= new Date());

  const sectionCountLabel = (count, label) =>
    `${count} ${label}${count === 1 ? "" : "s"}`;

  const formatSectionDate = (value) => {
    if (!value) return "TBA";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "TBA";
    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatEventDate = (value) => {
    if (!value) return "TBA";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "TBA";
    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
    });
  };

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Member";

  const styles = StyleSheet.create({
    scrollContent: {
      paddingTop: 8,
      paddingBottom: 24,
      gap: 12,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "rgba(255,255,255,0.82)",
      alignItems: "center",
      justifyContent: "center",
    },
    brandBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    brandMark: {
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: "#ffffff",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#e6e6e6",
    },
    brandMarkImage: {
      width: 22,
      height: 22,
      borderRadius: 999,
    },
    brandMarkText: {
      color: colors.brand,
      fontWeight: "900",
      fontSize: 18,
      letterSpacing: -0.5,
    },
    brandTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 20,
    },
    brandSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 1,
    },
    heroCard: {
      backgroundColor: "#fff8f4",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "#ead7cd",
      padding: 16,
      gap: 8,
      shadowColor: "#7c4a39",
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    heroTopLine: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    heroTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
      letterSpacing: -0.4,
    },
    heroMeta: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    heroPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 6,
    },
    heroPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "#f3e5dc",
      borderWidth: 1,
      borderColor: "#dfc2b3",
    },
    heroPillText: {
      color: "#8f5039",
      fontSize: 12,
      fontWeight: "700",
    },
    sectionCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "#ffffff",
      padding: 14,
      shadowColor: "#0f172a",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
      gap: 10,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    sectionLabel: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      flex: 1,
    },
    sectionBadge: {
      backgroundColor: "#f3e5dc",
      borderColor: "#dfc2b3",
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    sectionBadgeText: {
      color: "#8f5039",
      fontWeight: "700",
      fontSize: 11,
    },
    announcementItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: "#fffaf6",
      borderWidth: 1,
      borderColor: "#f1ddd2",
      marginTop: 8,
    },
    announcementMeta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 3,
      fontWeight: "500",
    },
    announcementTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
    },
    listLeft: {
      flex: 1,
      paddingRight: 10,
    },
    eventItem: {
      flexDirection: "row",
      gap: 12,
      padding: 12,
      borderRadius: 18,
      backgroundColor: "#fffaf5",
      borderWidth: 1,
      borderColor: "#ead9cf",
      marginTop: 8,
      alignItems: "center",
    },
    eventThumbnail: {
      width: 74,
      height: 74,
      borderRadius: 14,
      backgroundColor: "#eadfd8",
    },
    eventTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
      lineHeight: 18,
    },
    eventMeta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 4,
      fontWeight: "500",
      lineHeight: 17,
    },
    eventActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      gap: 10,
    },
    dateBadge: {
      minWidth: 56,
      borderRadius: 14,
      backgroundColor: "#f2e5de",
      borderWidth: 1,
      borderColor: "#dfc2b3",
      paddingVertical: 8,
      paddingHorizontal: 10,
      alignItems: "center",
    },
    dateBadgeDay: {
      color: colors.brand,
      fontSize: 17,
      fontWeight: "900",
      lineHeight: 18,
    },
    dateBadgeMonth: {
      color: "#8f5039",
      fontSize: 10,
      fontWeight: "700",
      marginTop: 1,
      letterSpacing: 0.2,
    },
  });

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          styles.scrollContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="menu-outline" size={22} color={colors.text} />
          </Pressable> */}

          <View style={styles.brandBlock}>
            <View style={styles.brandMark}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.brandMarkImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.brandTitle}>Campusly</Text>
              <Text style={styles.brandSubtitle}>Dashboard</Text>
            </View>
          </View>

          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable> */}
        </View>

        <Card style={styles.heroCard}>
          <View style={styles.heroTopLine}>
            <Text style={styles.heroTitle}>Welcome {user?.name || "back"}</Text>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeDay}>
                {new Date().getDate().toString().padStart(2, "0")}
              </Text>
              <Text style={styles.dateBadgeMonth}>
                {new Date()
                  .toLocaleDateString(undefined, { month: "short" })
                  .toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.heroMeta}>
            {roleLabel}
            {user?.department ? ` | ${user.department}` : ""}
          </Text>

          {/* <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{sectionCountLabel(announcements.length, 'announcement')}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{sectionCountLabel(upcomingEvents.length, 'upcoming event')}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{sectionCountLabel(chats.length, 'chat')}</Text>
            </View>
          </View> */}

          {user?.role === "teacher" ? (
            <AppButton
              title="Create announcement"
              onPress={() => setShowAnnouncementModal(true)}
              style={{ marginTop: 8 }}
            />
          ) : null}
        </Card>

        {!!error && (
          <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>
        )}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Important announcements</Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {/* <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{sectionCountLabel(announcements.length, 'item')}</Text>
                </View> */}
              <Pressable
                onPress={() => navigation.navigate("Announcements")}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Text style={{ color: colors.accent, fontWeight: "700" }}>
                  View all
                </Text>
              </Pressable>
            </View>
          </View>

          {announcements.length === 0 ? (
            <Muted>No announcements yet.</Muted>
          ) : null}

          {announcements.map((item, index) => (
            <Pressable
              key={item._id}
              onPress={() => {
                setSelectedAnnouncement(item);
                setShowAnnouncementDetailsModal(true);
              }}
              style={({ pressed }) => [
                styles.announcementItem,
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={styles.listLeft}>
                <Text style={styles.announcementTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.announcementMeta} numberOfLines={2}>
                  By {item.teacherName || "Teacher"}
                </Text>
              </View>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeMonth}>
                  {formatSectionDate(item.createdAt)}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Upcoming events</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {sectionCountLabel(upcomingEvents.length, "event")}
              </Text>
            </View>
          </View>

          {events.length === 0 ? <Muted>No events yet.</Muted> : null}

          {upcomingEvents.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => {
                setSelectedEvent(item);
                setShowEventDetailsModal(true);
              }}
              style={({ pressed }) => [
                styles.eventItem,
                pressed && { opacity: 0.75 },
              ]}
            >
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.eventThumbnail}
                />
              ) : (
                <View style={styles.eventThumbnail}>
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 14,
                      backgroundColor: "#e9ddd5",
                    }}
                  >
                    <Ionicons name="image-outline" size={22} color="#9b7e72" />
                  </View>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.eventMeta} numberOfLines={2}>
                  {formatEventDate(item.date)}
                  {item.location ? ` | ${item.location}` : ""}
                </Text>
                <View style={styles.eventActions}>
                  <Muted style={{ marginTop: 0, flex: 1 }} numberOfLines={1}>
                    {item.department || "All departments"}
                  </Muted>
                  <AppButton
                    title={user?.role === "student" ? "Join" : "Open"}
                    style={{ minWidth: 92 }}
                    onPress={() => {
                      setSelectedEvent(item);
                      setShowEventDetailsModal(true);
                    }}
                  />
                </View>
              </View>
            </Pressable>
          ))}
        </Card>

        <Modal
          visible={showAnnouncementModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAnnouncementModal(false)}
        >
          <View
            style={{
              height:'100%',
              flex: 1,
              backgroundColor: "rgba(15, 23, 42, 0.35)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Card style={{ backgroundColor: "white" }}>
              <Heading size="sm">Create announcement</Heading>
              <AppInput
                label="Title"
                value={announcementForm.title}
                onChangeText={(value) =>
                  setAnnouncementForm((prev) => ({ ...prev, title: value }))
                }
              />
              <AppInput
                label="Content"
                multiline
                value={announcementForm.content}
                onChangeText={(value) =>
                  setAnnouncementForm((prev) => ({ ...prev, content: value }))
                }
              />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <AppButton title="Pick image" onPress={pickAnnouncementImage} />
                {announcementForm.image?.uri ? (
                  <Image source={{ uri: announcementForm.image.uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                ) : null}
              </View>
              
              <View
                style={[
                  { flexDirection: "row", gap: 10 },
                  isCompact ? { flexDirection: "column" } : null,
                ]}
              >
                <AppButton
                  title="Cancel"
                  type="ghost"
                  style={isCompact ? { width: "100%" } : { flex: 1 }}
                  onPress={() => {
                    setShowAnnouncementModal(false);
                    setAnnouncementForm({ title: "", content: "", image: null });
                  }}
                  disabled={creatingAnnouncement}
                />
                <AppButton
                  title="Post"
                  style={isCompact ? { width: "100%" } : { flex: 1 }}
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
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Card style={{ backgroundColor: "#fff8f4", padding: 18 }}>
              <View
                style={{
                  borderLeftWidth: 5,
                  borderLeftColor: "#f59e0b",
                  paddingLeft: 12,
                  marginLeft: -12,
                }}
              >
                <Heading size="sm" style={{ color: "#92400e" }}>
                  {selectedAnnouncement?.title || "Announcement"}
                </Heading>
              </View>
              <Muted style={{ marginTop: 8, fontWeight: "600", fontSize: 14 }}>
                By{" "}
                {selectedAnnouncement?.teacherName ||
                  selectedAnnouncement?.createdBy?.name ||
                  "Teacher"}
              </Muted>
              <Text
                style={{ color: colors.text, marginTop: 12, lineHeight: 22 }}
              >
                {selectedAnnouncement?.content || "No content available."}
              </Text>
              {selectedAnnouncement?.image ? (
                <>
                  <Image
                    source={{ uri: selectedAnnouncement.image }}
                    style={{
                      width: "100%",
                      height: 200,
                      borderRadius: 8,
                      marginTop: 12,
                    }}
                  />
                  <AppButton
                    title="View image"
                    style={{ marginTop: 10 }}
                    onPress={() => setShowAnnouncementImageModal(true)}
                  />
                </>
              ) : null}
              <View
                style={[
                  { flexDirection: "row", gap: 10, marginTop: 16 },
                  isCompact ? { flexDirection: "column" } : null,
                ]}
              >
                <AppButton
                  title="Close"
                  type="ghost"
                  style={isCompact ? { width: "100%" } : { flex: 1 }}
                  onPress={() => {
                    setShowAnnouncementDetailsModal(false);
                    setSelectedAnnouncement(null);
                  }}
                />
                {user?.role === "admin" ||
                (selectedAnnouncement?.createdBy?._id ||
                  selectedAnnouncement?.createdBy) === user?.id ? (
                  <AppButton
                    title="Delete"
                    type="danger"
                    style={isCompact ? { width: "100%" } : { flex: 1 }}
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
          visible={showAnnouncementImageModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowAnnouncementImageModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.95)",
              justifyContent: "center",
              alignItems: "center",
              padding: 12,
            }}
          >
            <Pressable
              style={{ flex: 1, width: "100%" }}
              onPress={() => setShowAnnouncementImageModal(false)}
            >
              <Image
                source={{ uri: selectedAnnouncement?.image }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </Pressable>
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
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Card style={{ backgroundColor: "#fff8f4", padding: 18 }}>
              <View
                style={{
                  borderLeftWidth: 5,
                  borderLeftColor: "#0284c7",
                  paddingLeft: 12,
                  marginLeft: -12,
                }}
              >
                <Heading size="sm" style={{ color: "#0c4a6e" }}>
                  {selectedEvent?.title || "Event"}
                </Heading>
              </View>
              <Muted style={{ marginTop: 8, fontWeight: "600", fontSize: 14 }}>
                📅{" "}
                {selectedEvent?.date
                  ? new Date(selectedEvent.date).toLocaleString()
                  : "TBA"}
              </Muted>
              <Muted style={{ marginTop: 4, fontWeight: "600", fontSize: 14 }}>
                📍 {selectedEvent?.location || "Location TBA"}
              </Muted>
              <Text
                style={{ color: colors.text, marginTop: 12, lineHeight: 22 }}
              >
                {selectedEvent?.description || "No description available."}
              </Text>
              <View
                style={[
                  { flexDirection: "row", gap: 10, marginTop: 16 },
                  isCompact ? { flexDirection: "column" } : null,
                ]}
              >
                <AppButton
                  title="Close"
                  type="ghost"
                  style={isCompact ? { width: "100%" } : { flex: 1 }}
                  onPress={() => {
                    setShowEventDetailsModal(false);
                    setSelectedEvent(null);
                  }}
                />
                {user?.role === "admin" ||
                (selectedEvent?.createdBy?._id || selectedEvent?.createdBy) ===
                  user?.id ? (
                  <AppButton
                    title="Delete"
                    type="danger"
                    style={isCompact ? { width: "100%" } : { flex: 1 }}
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
