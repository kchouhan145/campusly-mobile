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
  AppSelect,
  Card,
  Heading,
  Muted,
  Screen,
  useResponsiveLayout,
} from "../components/ui";
import { colors } from "../theme/colors";

const initialForm = {
  title: "",
  description: "",
  price: "",
  category: "books",
  contactInfo: "",
  status: "available",
  image: "",
};

const categories = [
  "all",
  "books",
  "electronics",
  "clothing",
  "furniture",
  "others",
];
const statuses = ["all", "available", "sold"];

const categoryAccent = {
  books: "#2563eb",
  electronics: "#7c3aed",
  clothing: "#db2777",
  furniture: "#d97706",
  others: "#0f766e",
};

export default function MarketplaceScreen() {
  const { token, user } = useAuth();
  const { isCompact } = useResponsiveLayout();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("q", search.trim());
      if (category !== "all") params.append("category", category);
      if (status !== "all") params.append("status", status);

      const data = await apiRequest(`/api/products?${params.toString()}`, {
        token,
      });
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (e) {
      setError(e.message || "Failed to load products");
    }
  }, [category, search, status, token]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts]),
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((item) => {
      const matchesSearch = `${item.title} ${item.description}`
        .toLowerCase()
        .includes(q);
      const matchesCategory =
        category === "all" ? true : item.category === category;
      const matchesStatus = status === "all" ? true : item.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, category, status]);

  const getProductBorderColor = (productStatus) => {
    if (productStatus === "sold") return colors.danger;
    if (productStatus === "available") return colors.accent;
    return colors.border;
  };

  const getProductCardStyle = (item) => {
    if (item.status === "sold") {
      return {
        backgroundColor: "#fef2f2",
        borderLeftColor: "#dc2626",
      };
    }

    return {
      backgroundColor: "#f8fbff",
      borderLeftColor: categoryAccent[item.category] || "#0ea5e9",
    };
  };

  const visibleProducts = useMemo(() => filtered.slice(0, 20), [filtered]);

  const imageForItem = (item) =>
    item.images?.[0]?.url || item.image || item.thumbnail || "";

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const onCreate = async () => {
    setError("");
    setCreating(true);
    try {
      if (createForm.image && createForm.image.uri) {
        const fd = new FormData();
        fd.append("title", createForm.title);
        fd.append("description", createForm.description);
        fd.append("price", String(Number(createForm.price)));
        fd.append("category", createForm.category);
        fd.append("contactInfo", createForm.contactInfo);
        // append image file
        const file = createForm.image;
        fd.append("images", {
          uri: file.uri,
          name: file.fileName || `photo_${Date.now()}.jpg`,
          type: file.type || "image/jpeg",
        });

        await apiRequest("/api/products", { method: "POST", token, body: fd });
      } else {
        await apiRequest("/api/products", {
          method: "POST",
          token,
          body: {
            ...createForm,
            price: Number(createForm.price),
            images: [],
          },
        });
      }

      setCreateForm(initialForm);
      setShowCreateModal(false);
      await loadProducts();
    } catch (e) {
      setError(e.message || "Failed to create product");
    } finally {
      setCreating(false);
    }
  };

  const onMarkSold = async (id) => {
    try {
      await apiRequest(`/api/products/${id}`, {
        method: "PUT",
        token,
        body: { status: "sold" },
      });
      await loadProducts();
    } catch (e) {
      setError(e.message || "Failed to update product");
    }
  };

  const onDelete = async (id) => {
    Alert.alert("Delete product", "Delete this product post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest(`/api/products/${id}`, {
              method: "DELETE",
              token,
            });
            await loadProducts();
          } catch (e) {
            setError(e.message || "Delete failed");
          }
        },
      },
    ]);
  };

  const openCreateModal = () => {
    // debug alert to confirm button press
    // Alert.alert('Debug', 'Opening create modal');
    setShowCreateModal(true);
  };

  const pickImage = async () => {
    try {
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
              <Text style={styles.brandSubtitle}>Marketplace</Text>
            </View>
          </View>

          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable> */}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.filterRow}>
            <AppSelect
              label="Category"
              value={category}
              placeholder="Select category"
              items={categories
                .filter((item) => item !== "all")
                .map((item) => ({
                  label: item.charAt(0).toUpperCase() + item.slice(1),
                  value: item,
                }))}
              onValueChange={(value) => setCategory(value)}
              style={styles.filterBlock}
            />
          </View>
          <View style={styles.heroRow}>
            <AppButton
              title="Sell Something"
              onPress={openCreateModal}
              style={styles.sellButton}
            />
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <AppInput
              style={styles.searchInput}
              label="Search"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <View style={styles.grid}>
          {visibleProducts.map((item) => {
            const ownerId = item.sellerId?._id || item.sellerId;
            const canManage = user?.role === "admin" || ownerId === user?.id;
            const productImage = imageForItem(item);

            return (
              <Card
                key={item._id}
                style={[
                  styles.productCard,
                  {
                    borderColor: getProductBorderColor(item.status),
                    borderLeftColor: getProductBorderColor(item.status),
                    ...getProductCardStyle(item),
                    width: isCompact ? "100%" : "48%",
                  },
                ]}
              >
                <View style={styles.imageWrap}>
                  {imageUri ? (
                    <Pressable
                      onPress={() => {
                        setSelectedImage(imageUri);
                        setImageModalVisible(true);
                      }}
                      accessibilityRole="imagebutton"
                    >
                      <Image source={{ uri: imageUri }} style={styles.image} />
                    </Pressable>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={32}
                        color="#a78b7d"
                      />
                    </View>
                  )}
                </View>

                <Text style={styles.productTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Muted style={styles.productCategory} numberOfLines={1}>
                  {item.category || "Category"}
                </Muted>
                <Text style={styles.productPrice}>INR {item.price}</Text>
                <Muted style={styles.productMeta} numberOfLines={2}>
                  {item.description || "Campus listing"}
                </Muted>

                {canManage ? (
                  <View
                    style={[
                      styles.manageRow,
                      isCompact ? styles.manageRowCompact : null,
                    ]}
                  >
                    {item.status !== "sold" ? (
                      <AppButton
                        title="Mark sold"
                        type="ghost"
                        onPress={() => onMarkSold(item._id)}
                      />
                    ) : null}
                    <AppButton
                      title="Delete"
                      type="danger"
                      onPress={() => onDelete(item._id)}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>

        <View style={{ height: 20 }} />

        <Modal
          visible={showCreateModal}
          animationType="slide"
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
              style={{ backgroundColor: "#ffffff", borderColor: "#e9e9e9" }}
            >
              <Heading size="sm">Create listing</Heading>
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
                label="Price"
                keyboardType="numeric"
                value={createForm.price}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, price: v }))}
              />
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Category
                </Text>
                <AppSelect
                  value={createForm.category}
                  placeholder="Select category"
                  items={categories
                    .filter((item) => item !== "all")
                    .map((item) => ({
                      label: item.charAt(0).toUpperCase() + item.slice(1),
                      value: item,
                    }))}
                  onValueChange={(value) =>
                    setCreateForm((p) => ({ ...p, category: value }))
                  }
                />
              </View>
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
                  title="Create listing"
                  style={isCompact ? styles.actionFullWidth : styles.actionFlex}
                  onPress={onCreate}
                  loading={creating}
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
          <View style={modalStyles.imageModalContainer}>
            <Pressable
              style={modalStyles.imageCloseButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={modalStyles.fullscreenImage}
                resizeMode="contain"
              />
            ) : null}
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
    paddingHorizontal: 12,
    marginTop: 8,
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
    borderWidth: 1,
    borderColor: "#ead7cd",
    padding: 14,
    margin: 1,
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
    color: colors.textMuted,
  },
  sellButton: {
    marginVertical: 10,
    width: "100%",
    minWidth: 106,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  filterBlock: {
    flex: 1,
    gap: 6,
  },
  filterLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentPill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.86)",
    paddingVertical: 9,
    alignItems: "center",
  },
  segmentPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  segmentTextActive: {
    color: "#fff",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingRight: 44,
    backgroundColor: "#ffffff",
  },
  searchWrapper: {
    width: "100%",
    position: "relative",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  productCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 18,
    gap: 8,
    marginBottom: 12,
  },
  imageWrap: {
    height: 110,
    backgroundColor: "#eadfd8",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  productTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 14,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  productCategory: {
    paddingHorizontal: 12,
    marginTop: 0,
    color: colors.textMuted,
  },
  productPrice: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 14,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  productMeta: {
    paddingHorizontal: 12,
    marginTop: 4,
    color: colors.textMuted,
  },
  manageRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  manageRowCompact: {
    flexDirection: "column",
  },
  actionButton: {
    flex: 1,
  },
  actionFullWidth: {
    width: "100%",
  },
  actionFlex: {
    flex: 1,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  modalActionsRowCompact: {
    flexDirection: "column",
  },
});

const modalStyles = {
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
