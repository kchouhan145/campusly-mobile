import { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
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

const initialCreate = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  maxAttendees: "",
  department: "",
};

const cardAccentColors = ["#0284c7", "#0ea5e9", "#22c55e", "#f59e0b"];

export default function EventsScreen() {
  const { token, user } = useAuth();
  const { isCompact } = useResponsiveLayout();
  const [events, setEvents] = useState([]);
  // search removed per request
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreate);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [registeringEventId, setRegisteringEventId] = useState("");

  const canCreate =
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "superAdmin";

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const data = await apiRequest("/api/events", { token });
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setError(e.message || "Failed to load events");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents]),
  );

  const filtered = events;

  const { todaysEventCount, upcomingEventCount } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    let todays = 0;
    let upcoming = 0;

    events.forEach((event) => {
      const eventDate = new Date(event.date);
      if (eventDate >= todayStart && eventDate < todayEnd) {
        todays += 1;
      } else if (eventDate >= todayEnd) {
        upcoming += 1;
      }
    });

    return { todaysEventCount: todays, upcomingEventCount: upcoming };
  }, [events]);

  const displayEvents = useMemo(
    () => (Array.isArray(filtered) ? filtered.slice(0, 12) : []),
    [filtered],
  );

  const getEventDateParts = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { day: "TBA", month: "" };
    }

    return {
      day: date.toLocaleDateString(undefined, { day: "2-digit" }),
      month: date
        .toLocaleDateString(undefined, { month: "short" })
        .toUpperCase(),
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const onCreate = async () => {
    setError("");
    setCreating(true);
    try {
      await apiRequest("/api/events", {
        method: "POST",
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
      setError(e.message || "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    Alert.alert("Delete event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest(`/api/events/${id}`, { method: "DELETE", token });
            await loadEvents();
          } catch (e) {
            setError(e.message || "Delete failed");
          }
        },
      },
    ]);
  };

  const onRegister = async (id) => {
    setError("");
    setRegisteringEventId(id);
    try {
      await apiRequest(`/api/events/${id}/register`, {
        method: "POST",
        token,
      });
      await loadEvents();
    } catch (e) {
      setError(e.message || "Registration failed");
    } finally {
      setRegisteringEventId("");
    }
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
              <Text style={styles.brandSubtitle}>Events</Text>
            </View>
          </View>

          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable> */}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              {/* <Text style={styles.heroTitle}>Campus events</Text> */}
              <Muted style={styles.heroText}>
                Find what is happening and join in.
              </Muted>
            </View>
            {canCreate ? (
              <AppButton
                title="+ Create"
                onPress={() => setShowCreateModal(true)}
                style={styles.createButton}
              />
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardWarm]}>
              <Text style={styles.statLabel}>Today's events</Text>
              <Text style={styles.statValue}>{todaysEventCount}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardCool]}>
              <Text style={styles.statLabel}>Upcoming events</Text>
              <Text style={styles.statValue}>{upcomingEventCount}</Text>
            </View>
          </View>
        </View>

        {/* search and filter removed */}

        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <View style={styles.grid}>
          {displayEvents.map((item, index) => {
            const eventDate = new Date(item.date);
            const now = new Date();
            const todayStart = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            );
            const todayEnd = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
            );
            const isToday = eventDate >= todayStart && eventDate < todayEnd;

            const attendees = Array.isArray(item.attendees)
              ? item.attendees
              : [];
            const userId = user?.id || user?._id;
            const isRegistered = attendees.some(
              (attendee) =>
                (attendee?._id || attendee)?.toString() === userId?.toString(),
            );
            const isFull =
              !!item.maxAttendees && attendees.length >= item.maxAttendees;
            const canRegister =
              user?.role === "student" && !isRegistered && !isFull;
            const dateParts = getEventDateParts(item.date);
            const imageUri = item.image || item.coverImage || item.bannerImage;

            return (
              <Card
                key={item._id}
                style={[
                  styles.eventCard,
                  isToday ? styles.eventCardToday : null,
                  { width: isCompact ? "100%" : "48%" },
                ]}
              >
                <View style={styles.cardImageWrap}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.cardImage}
                    />
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={32}
                        color="#a78b7d"
                      />
                    </View>
                  )}
                  {isToday ? (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayPillText}>TODAY</Text>
                    </View>
                  ) : null}
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeDay}>{dateParts.day}</Text>
                    <Text style={styles.dateBadgeMonth}>{dateParts.month}</Text>
                  </View>
                </View>

                <Text style={styles.eventTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.eventMeta} numberOfLines={2}>
                  📍{item.location || "Location TBA"}
                </Text>
                <Text style={styles.eventMetaSmall} numberOfLines={2}>
                  {item.description ||
                    "Event details are available in the full event view."}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={{ flex: 1 }}>
                    <Muted style={{ marginTop: 0 }}>
                      {item.department || "All departments"}
                    </Muted>
                    <Muted style={{ marginTop: 2 }}>
                      {attendees.length} joined
                      {item.maxAttendees ? ` / ${item.maxAttendees}` : ""}
                    </Muted>
                  </View>
                  {(user?.role === "teacher" ||
                    user?.role === "admin" ||
                    user?.role === "superAdmin") && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => onDelete(item._id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })}
        </View>

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
              backgroundColor: "rgba(15, 23, 42, 0.35)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Card style={{ backgroundColor: "white" }}>
              <Heading size="sm">
                <Ionicons name="create" size={18} color="" />
                Create event
              </Heading>
              <AppInput
                label="Title"
                value={createForm.title}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, title: v }))}
              />
              <AppInput
                label="Description"
                multiline
                value={createForm.description}
                onChangeText={(v) =>
                  setCreateForm((p) => ({ ...p, description: v }))
                }
              />
              <AppInput
                label="Event Date"
                placeholder="YYYY-MM-DD (e.g. 2026-07-15)"
                value={createForm.date}
                onChangeText={(v) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    date: v,
                  }))
                }
              />

              <AppInput
                label="Event Time"
                placeholder="HH:MM (24-hour, e.g. 18:30)"
                value={createForm.time}
                onChangeText={(v) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    time: v,
                  }))
                }
              />
              <AppInput
                label="Location"
                value={createForm.location}
                onChangeText={(v) =>
                  setCreateForm((p) => ({ ...p, location: v }))
                }
              />
              <AppInput
                label="Max attendees"
                keyboardType="number-pad"
                value={createForm.maxAttendees}
                onChangeText={(v) =>
                  setCreateForm((p) => ({ ...p, maxAttendees: v }))
                }
              />
              {user?.role === "admin" || user?.role === "superAdmin" ? (
                <AppInput
                  label="Department"
                  value={createForm.department}
                  onChangeText={(v) =>
                    setCreateForm((p) => ({ ...p, department: v }))
                  }
                />
              ) : null}
              <View
                style={[
                  styles.modalActionsRow,
                  isCompact ? styles.modalActionsRowCompact : null,
                ]}
              >
                <AppButton
                  title="Cancel"
                  type="ghost"
                  style={isCompact ? styles.actionFullWidth : styles.actionFlex}
                  onPress={() => {
                    setShowCreateModal(false);
                    setCreateForm(initialCreate);
                  }}
                  disabled={creating}
                />
                <AppButton
                  title="Create event"
                  style={isCompact ? styles.actionFullWidth : styles.actionFlex}
                  onPress={onCreate}
                  loading={creating}
                />
              </View>
            </Card>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  topTitle: {
    flex: 1,
    textAlign: "left",
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.86)",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },

  deleteButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
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
    borderRadius: 22,
    borderColor: "#ead7cd",
    gap: 12,
    padding: 16,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  heroText: {
    marginTop: 4,
  },
  createButton: {
    minWidth: 86,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 2,
  },
  statCardWarm: {
    backgroundColor: "#fef3c7",
    borderColor: "#f5c15d",
  },
  statCardCool: {
    backgroundColor: "#dcfce7",
    borderColor: "#9dd8b0",
  },
  statLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.86)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  eventCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 20,
    borderColor: "#ead9cf",
    backgroundColor: "#fffdfb",
  },
  eventCardToday: {
    borderColor: "#f5c15d",
    backgroundColor: "#fff8ea",
  },
  cardImageWrap: {
    position: "relative",
    height: 118,
    backgroundColor: "#eadfd8",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8dfda",
  },
  todayPill: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 999,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  todayPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  dateBadge: {
    position: "absolute",
    right: 10,
    bottom: -18,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6d6cc",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  dateBadgeDay: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 17,
  },
  dateBadgeMonth: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  eventTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 22,
    paddingHorizontal: 12,
  },
  eventMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
    paddingHorizontal: 12,
  },
  eventMetaSmall: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 12,
  },
  cardFooter: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  joinButton: {
    minWidth: 92,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalActionsRowCompact: {
    flexDirection: "column",
  },
  actionFullWidth: {
    width: "100%",
  },
  actionFlex: {
    flex: 1,
  },
});
