import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
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

const initialForm = {
  type: "lost",
  title: "",
  description: "",
  location: "",
  contactInfo: "",
  image: "",
};

export default function LostFoundScreen() {
  const { token, user } = useAuth();
  const { isCompact } = useResponsiveLayout();
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("q", search.trim());
      if (type !== "all") params.append("type", type);
      const data = await apiRequest(`/api/posts?${params.toString()}`, {
        token,
      });
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      setError(e.message || "Failed to load posts");
    }
  }, [search, token, type]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts]),
  );

  const filtered = useMemo(() => {
    return posts.filter((item) => {
      const matchesSearch = `${item.title} ${item.description} ${item.location}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesType = type === "all" ? true : item.type === type;
      return matchesSearch && matchesType;
    });
  }, [posts, search, type]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const pickImage = async () => {
    try {
      // Load react-native-image-picker dynamically to avoid startup crash when not installed
      // This lets the app run without the native dependency and prompts the developer to install it.
      // eslint-disable-next-line global-require
      const { launchImageLibrary } = require("react-native-image-picker");
      const res = await launchImageLibrary({
        mediaType: "photo",
        selectionLimit: 1,
        includeBase64: false,
      });
      const asset = res?.assets && res.assets[0];
      if (asset) {
        setCreateForm((p) => ({ ...p, image: asset }));
      }
    } catch (err) {
      console.log("Image pick error or module not installed", err);
      Alert.alert(
        "Image picker not available",
        "Please install react-native-image-picker and rebuild the app:\n\nnpm install react-native-image-picker\ncd ios && npx pod-install\n\nThen rebuild the app.",
        [{ text: "OK" }],
      );
    }
  };

  const onCreate = async () => {
    setError("");
    setCreating(true);
    try {
      let body = createForm;
      let options = { method: "POST", token };

      if (createForm.image && createForm.image.uri) {
        const fd = new FormData();
        fd.append("type", createForm.type);
        fd.append("title", createForm.title);
        fd.append("description", createForm.description);
        fd.append("location", createForm.location);
        fd.append("contactInfo", createForm.contactInfo);

        const file = createForm.image;
        fd.append("image", {
          uri: file.uri,
          name: file.fileName || `photo_${Date.now()}.jpg`,
          type: file.type || "image/jpeg",
        });

        body = fd;
        options = { ...options, body };
      } else {
        options = { ...options, body };
      }

      await apiRequest("/api/posts", options);
      setCreateForm(initialForm);
      setShowCreateModal(false);
      await loadPosts();
    } catch (e) {
      setError(e.message || "Failed to create post");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    Alert.alert("Delete post", "Delete this lost/found post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest(`/api/posts/${id}`, { method: "DELETE", token });
            await loadPosts();
          } catch (e) {
            setError(e.message || "Delete failed");
          }
        },
      },
    ]);
  };

  const getPostBorderColor = (postType) => {
    if (postType === "found") return colors.accent;
    if (postType === "lost") return colors.danger;
    return colors.border;
  };

  const getPostCardStyle = (postType) => {
    if (postType === "found") {
      return {
        backgroundColor: "#ecfdf3",
        borderLeftColor: "#16a34a",
      };
    }

    if (postType === "lost") {
      return {
        backgroundColor: "#fef2f2",
        borderLeftColor: "#dc2626",
      };
    }

    return {
      backgroundColor: "#f8fafc",
      borderLeftColor: colors.border,
    };
  };

  const visiblePosts = useMemo(() => filtered.slice(0, 20), [filtered]);

  const getTypeLabel = (postType) => {
    if (postType === "found") return "FOUND";
    if (postType === "lost") return "LOST";
    return "POST";
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
              <Image source={require('../../assets/icon.png')} style={styles.brandMarkImage} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.brandTitle}>Campusly</Text>
              <Text style={styles.brandSubtitle}>Lost & Found</Text>
            </View>
          </View>

          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable> */}
        </View>

        <View style={styles.heroCard}>
          {/* <Text style={styles.heroTitle}>Lost & Found</Text> */}
          <Muted style={styles.heroText}>
            Quickly report items and help others recover them.
          </Muted>
          <View style={styles.statRow}>
            <View style={[styles.statChip, styles.statChipWarm]}>
              <Text style={styles.statLabel}>Lost</Text>
              <Text style={styles.statValue}>
                {filtered.filter((item) => item.type === "lost").length}
              </Text>
            </View>
            <View style={[styles.statChip, styles.statChipCool]}>
              <Text style={styles.statLabel}>Found</Text>
              <Text style={styles.statValue}>
                {filtered.filter((item) => item.type === "found").length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.searchRow}>
          <AppInput
            style={styles.searchInput}
            label="Search"
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.searchActionsRow}>
            <AppButton
              title="Create"
              onPress={() => setShowCreateModal(true)}
              style={styles.createRectButton}
            />
            <Pressable
              style={styles.filterIcon}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="funnel-outline" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
        {/* <View style={styles.filterPills}>
          <Pressable style={[styles.filterPill, type === 'all' ? styles.filterPillActive : null]} onPress={() => setType('all')}>
            <Text style={[styles.filterPillText, type === 'all' ? styles.filterPillTextActive : null]}>All</Text>
          </Pressable>
          <Pressable style={[styles.filterPill, type === 'lost' ? styles.filterPillActive : null]} onPress={() => setType('lost')}>
            <Text style={[styles.filterPillText, type === 'lost' ? styles.filterPillTextActive : null]}>Lost</Text>
          </Pressable>
          <Pressable style={[styles.filterPill, type === 'found' ? styles.filterPillActive : null]} onPress={() => setType('found')}>
            <Text style={[styles.filterPillText, type === 'found' ? styles.filterPillTextActive : null]}>Found</Text>
          </Pressable>
        </View> */}
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <View style={styles.postsGrid}>
          {visiblePosts.map((item) => {
            const imageSource =
              item?.image?.url || item?.image || item?.imageUrl || null;
            return (
              <Card
                key={item._id}
                style={[
                  styles.postCard,
                  {
                    width: "48%",
                    borderColor: getPostBorderColor(item.type),
                    borderWidth: 2,
                    ...getPostCardStyle(item.type),
                  },
                ]}
              >
                {imageSource ? (
                  <Pressable
                    onPress={() => {
                      const uri =
                        typeof imageSource === "string"
                          ? imageSource
                          : imageSource?.uri || imageSource?.url || null;
                      setSelectedImage(uri);
                      setImageModalVisible(true);
                    }}
                    accessibilityRole="imagebutton"
                  >
                    <Image
                      source={{ uri: imageSource }}
                      style={styles.postImage}
                    />
                  </Pressable>
                ) : null}

                <View style={styles.postTopRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {getTypeLabel(item.type)}
                    </Text>
                  </View>
                  <Muted style={{ marginTop: 0 }}>
                    {item.isResolved ? "Resolved" : "Active"}
                  </Muted>
                </View>

                <Text style={styles.postTitle}>{item.title}</Text>
                <Muted style={styles.postDescription} numberOfLines={3}>
                  {item.description}
                </Muted>
                <Muted style={styles.postMeta}>
                  {item.location || "Location TBA"}
                </Muted>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status</Text>
                  <Text style={styles.statusValue}>
                    {item.isResolved ? "Closed" : "Open"}
                  </Text>
                </View>

                <Muted style={styles.contactText}>
                  Contact: {item.contactInfo}
                </Muted>

                {user?.role === "admin" ||
                (item.userId?._id || item.userId) === user?.id ? (
                  <AppButton
                    title="Delete"
                    type="danger"
                    style={{ marginTop: 8 }}
                    onPress={() => onDelete(item._id)}
                  />
                ) : null}
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
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Card
              style={{
                padding: 18,
                backgroundColor: "#fff8f4",
                borderColor: "#ead7cd",
              }}
            >
              <Heading size="sm">Create post</Heading>
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Post type
                </Text>
                <View style={styles.filterRow}>
                  <AppButton
                    title="Lost"
                    type={createForm.type === "lost" ? "primary" : "ghost"}
                    style={{ flex: 1 }}
                    onPress={() =>
                      setCreateForm((p) => ({ ...p, type: "lost" }))
                    }
                  />
                  <AppButton
                    title="Found"
                    type={createForm.type === "found" ? "primary" : "ghost"}
                    style={{ flex: 1 }}
                    onPress={() =>
                      setCreateForm((p) => ({ ...p, type: "found" }))
                    }
                  />
                </View>
              </View>
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
                label="Location"
                value={createForm.location}
                onChangeText={(v) =>
                  setCreateForm((p) => ({ ...p, location: v }))
                }
              />

              <View style={{ marginTop: 8, marginBottom: 6 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 6,
                  }}
                >
                  Image (optional)
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                >
                  <AppButton title="Pick image" onPress={pickImage} />
                  {createForm.image?.uri ? (
                    <Image
                      source={{ uri: createForm.image.uri }}
                      style={{ width: 64, height: 64, borderRadius: 8 }}
                    />
                  ) : null}
                </View>
              </View>

              <AppInput
                label="Contact info"
                value={createForm.contactInfo}
                onChangeText={(v) =>
                  setCreateForm((p) => ({ ...p, contactInfo: v }))
                }
              />
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
                    setCreateForm(initialForm);
                  }}
                  disabled={creating}
                />
                <AppButton
                  title="Create post"
                  style={isCompact ? styles.actionFullWidth : styles.actionFlex}
                  onPress={onCreate}
                  loading={creating}
                />
              </View>
            </Card>
          </View>
        </Modal>

        <Modal
          visible={showFilterModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <Card
              style={{
                padding: 18,
                backgroundColor: "#fff8f4",
                borderColor: "#ead7cd",
              }}
            >
              <Heading size="sm">Filter posts</Heading>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <Pressable
                  style={[
                    styles.filterIconOption,
                    type === "all" ? styles.filterIconOptionActive : null,
                  ]}
                  onPress={() => {
                    setType("all");
                    setShowFilterModal(false);
                  }}
                >
                  <Ionicons
                    name="layers-outline"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={{ marginLeft: 8 }}>All</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.filterIconOption,
                    type === "lost" ? styles.filterIconOptionActive : null,
                  ]}
                  onPress={() => {
                    setType("lost");
                    setShowFilterModal(false);
                  }}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={colors.danger}
                  />
                  <Text style={{ marginLeft: 8 }}>Lost</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.filterIconOption,
                    type === "found" ? styles.filterIconOptionActive : null,
                  ]}
                  onPress={() => {
                    setType("found");
                    setShowFilterModal(false);
                  }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={colors.accent}
                  />
                  <Text style={{ marginLeft: 8 }}>Found</Text>
                </Pressable>
              </View>
              <View style={{ marginTop: 16 }}>
                <AppButton
                  title="Close"
                  type="ghost"
                  onPress={() => setShowFilterModal(false)}
                />
              </View>
            </Card>
          </View>
        </Modal>

        <Modal
          visible={imageModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.imageModalContainer}>
            <Pressable
              style={styles.imageCloseButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}

const styles = {
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.86)",
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
    borderRadius: 22,
    borderColor: "#ead7cd",
    gap: 10,
    padding: 10,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  heroText: {
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statChipWarm: {
    backgroundColor: "#fef3c7",
    borderColor: "#f5c15d",
  },
  statChipCool: {
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
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  searchRow: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  searchInput: {
    marginTop: 0,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
  },
  filterIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  createRectButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPills: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterPillText: {
    color: colors.text,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#fff",
  },
  postCard: {
    marginTop: 4,
    borderRadius: 20,
    padding: 14,
    gap: 8,
    borderWidth: 1,
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  postImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#eee",
  },
  postTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    backgroundColor: "#d97706",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  postTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  postDescription: {
    marginTop: 0,
  },
  postMeta: {
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  statusValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  contactText: {
    marginTop: 2,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalActionsRowCompact: {
    flexDirection: "column",
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 26,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
  },
  filterIconOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  filterIconOptionActive: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  imageCloseButton: {
    position: "absolute",
    top: 36,
    right: 18,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 6,
    borderRadius: 20,
  },
};
