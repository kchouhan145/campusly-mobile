import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Alert,
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

function getInitials(name, username) {
  const source = String(name || username || "").trim();
  if (!source) return "U";

  const parts = source.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export default function AdminUsersScreen() {
  const { token, user } = useAuth();
  const { isCompact } = useResponsiveLayout();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!token || user?.role !== "admin") return;
    setError("");
    try {
      const data = await apiRequest("/api/users/admin", { token });
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setError(e.message || "Failed to load admin users");
    }
  }, [token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter((item) =>
      `${item.name} ${item.email} ${item.username} ${item.department}`
        .toLowerCase()
        .includes(q),
    );
  }, [users, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const onRole = async (id, role) => {
    try {
      await apiRequest(`/api/users/admin/${id}/role`, {
        method: "PATCH",
        token,
        body: { role },
      });
      await loadUsers();
    } catch (e) {
      setError(e.message || "Role update failed");
    }
  };

  const onVerify = async (id, isVerified, department) => {
    try {
      await apiRequest(`/api/users/admin/${id}/status`, {
        method: "PATCH",
        token,
        body: { isVerified, department: department || "" },
      });
      await loadUsers();
    } catch (e) {
      setError(e.message || "Status update failed");
    }
  };

  const onDelete = async (id) => {
    Alert.alert("Delete user", "Delete this user account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest(`/api/users/admin/${id}`, {
              method: "DELETE",
              token,
            });
            await loadUsers();
          } catch (e) {
            setError(e.message || "Delete failed");
          }
        },
      },
    ]);
  };

  if (user?.role !== "admin") {
    return (
      <Screen>
        <Heading>Admin</Heading>
        <Muted>Only admins can access this tab.</Muted>
      </Screen>
    );
  }

  const totalUsers = filtered.length;
  const verifiedCount = filtered.filter((item) => item.isVerified).length;
  const teachersCount = filtered.filter(
    (item) => item.role === "teacher",
  ).length;
  const adminsCount = filtered.filter((item) => item.role === "admin").length;

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
              <Text style={styles.brandSubtitle}>Admin Portal</Text>
            </View>
          </View>

          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable> */}
        </View>

        <View style={styles.heroCard}>
          {/* <Heading>Admin Users</Heading>
          <Muted>Manage roles, verification, and user status</Muted> */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, styles.summaryChipWarm]}>
              <Text style={styles.summaryValue}>{totalUsers}</Text>
              <Text style={styles.summaryLabel}>Users</Text>
            </View>
            <View style={[styles.summaryChip, styles.summaryChipCool]}>
              <Text style={styles.summaryValue}>{verifiedCount}</Text>
              <Text style={styles.summaryLabel}>Verified</Text>
            </View>
            <View style={[styles.summaryChip, styles.summaryChipGreen]}>
              <Text style={styles.summaryValue}>{teachersCount}</Text>
              <Text style={styles.summaryLabel}>Teachers</Text>
            </View>
            <View style={[styles.summaryChip, styles.summaryChipRose]}>
              <Text style={styles.summaryValue}>{adminsCount}</Text>
              <Text style={styles.summaryLabel}>Admins</Text>
            </View>
          </View>
        </View>

        <AppInput
          style={{ marginTop: 10 ,backgroundColor:'white'}}
          label="Search users"
          value={search}
          onChangeText={setSearch}
        />
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {filtered.map((item) => (
          <Card key={item._id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {getInitials(item.name, item.username)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {item.name} (@{item.username})
                </Text>
                <Muted>{item.email}</Muted>
              </View>
            </View>

            <View style={styles.metaWrap}>
              <Text
                style={[
                  styles.metaChip,
                  item.isVerified
                    ? styles.metaChipVerified
                    : styles.metaChipUnverified,
                ]}
              >
                {item.isVerified ? "Verified" : "Unverified"}
              </Text>
              <Text style={styles.metaChip}>{item.role}</Text>
              <Text style={styles.metaChip}>{item.department || "N/A"}</Text>
            </View>

            <View
              style={[
                styles.dropdownRow,
                isCompact ? styles.dropdownRowCompact : null,
              ]}
            >
              <AppSelect
                label="Role"
                value={item.role}
                placeholder="Select role"
                items={[
                  { label: "Student", value: "student" },
                  { label: "Teacher", value: "teacher" },
                  { label: "Admin", value: "admin" },
                ]}
                onValueChange={(value) => {
                  if (value !== item.role) {
                    onRole(item._id, value);
                  }
                }}
                style={styles.dropdownBlock}
              />

              <AppSelect
                label="Verification"
                value={item.isVerified ? "verified" : "unverified"}
                placeholder="Select status"
                items={[
                  { label: "Verified", value: "verified" },
                  { label: "Unverified", value: "unverified" },
                ]}
                onValueChange={(value) => {
                  const nextVerified = value === "verified";
                  if (nextVerified !== item.isVerified) {
                    onVerify(item._id, nextVerified, item.department);
                  }
                }}
                style={styles.dropdownBlock}
              />
            </View>

            <View
              style={[
                styles.actionsRow,
                isCompact ? styles.actionsRowCompact : null,
              ]}
            >
              <AppButton
                title="Delete"
                type="danger"
                style={
                  isCompact ? styles.actionButtonCompact : styles.actionButton
                }
                onPress={() => onDelete(item._id)}
              />
            </View>
          </Card>
        ))}

        <View style={{ height: 20 }} />
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
    marginBottom: 10,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.text,
    fontSize: 18,
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
    padding:10,
    backgroundColor: "#fff8f4",
    borderColor: "#ead7cd",
    borderRadius: 22,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryChip: {
    flex: 1,
    minWidth: "47%",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 2,
  },
  summaryChipWarm: { backgroundColor: "#fef3c7", borderColor: "#f5c15d" },
  summaryChipCool: { backgroundColor: "#dbeafe", borderColor: "#93c5fd" },
  summaryChipGreen: { backgroundColor: "#dcfce7", borderColor: "#9dd8b0" },
  summaryChipRose: { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
  summaryValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  userCard: {
    marginTop: 10,
    borderRadius: 18,
    borderColor: "#ead9cf",
    backgroundColor: "#fffdfb",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f1ded3",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.brand,
    fontWeight: "900",
  },
  metaWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 1,
    fontSize: 10,
    overflow: "hidden",
  },
  metaChipVerified: {
    color: "#166534",
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
  },
  metaChipUnverified: {
    color: "#991b1b",
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  actionsRowCompact: {
    flexDirection: "column",
  },
  dropdownRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  dropdownRowCompact: {
    flexDirection: "column",
  },
  dropdownBlock: {
    flex: 1,
    gap: 6,
  },
  dropdownLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.cardSoft,
    overflow: "hidden",
  },
  pickerText: {
    color: colors.text,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonCompact: {
    width: "100%",
  },
});
