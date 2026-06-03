import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import {
  AppButton,
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

function getRoleTheme(role) {
  if (role === "admin") {
    return {
      avatarBg: "#ede9fe",
      avatarText: "#5b21b6",
      badgeBg: "#f3e8ff",
      badgeText: "#6b21a8",
      icon: "A",
    };
  }

  if (role === "teacher") {
    return {
      avatarBg: "#dbeafe",
      avatarText: "#1d4ed8",
      badgeBg: "#e0f2fe",
      badgeText: "#0c4a6e",
      icon: "T",
    };
  }

  return {
    avatarBg: "#dcfce7",
    avatarText: "#166534",
    badgeBg: "#ecfdf5",
    badgeText: "#065f46",
    icon: "S",
  };
}

export default function ProfileScreen() {
  const { token, user, refreshMe, logout } = useAuth();
  const { isCompact } = useResponsiveLayout();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      await apiRequest("/api/users/profile", { token });
      await refreshMe();
    } catch (e) {
      setError(e.message || "Failed to load profile");
    }
  }, [refreshMe, token]);

  const roleTheme = getRoleTheme(user?.role);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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
              <Text style={styles.brandSubtitle}>Profile</Text>
            </View>
          </View>

          {/* <Pressable style={styles.iconButton} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable> */}
        </View>

        <Card style={styles.heroCard}>
          <View
            style={[styles.heroRow, isCompact ? styles.heroRowCompact : null]}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: roleTheme.avatarBg },
              ]}
            >
              <Text
                style={[styles.avatarText, { color: roleTheme.avatarText }]}
              >
                {getInitials(user?.name, user?.username)}
              </Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroName}>
                {user?.name || "Campusly User"}
              </Text>
              <Muted>@{user?.username || "username"}</Muted>
              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: roleTheme.badgeBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      { color: roleTheme.badgeText },
                    ]}
                  >
                    {roleTheme.icon}{" "}
                    {String(user?.role || "member").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.deptBadge}>
                  <Text style={styles.deptBadgeText}>
                    {user?.department || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <Card style={styles.formCard}>
          <Heading size="sm">Your details</Heading>
          <View style={styles.detailRow}>
            <Muted style={styles.detailLabel}>Name</Muted>
            <Text style={styles.detailValue}>{user?.name || "N/A"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Muted style={styles.detailLabel}>Username</Muted>
            <Text style={styles.detailValue}>
              @{user?.username || "username"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Muted style={styles.detailLabel}>Department</Muted>
            <Text style={styles.detailValue}>{user?.department || "N/A"}</Text>
          </View>
          {/* <View style={styles.detailRow}>
            <Muted style={styles.detailLabel}>Phone</Muted>
            <Text style={styles.detailValue}>{user?.phone || 'N/A'}</Text>
          </View> */}
          {/* <View style={styles.detailRow}>
            <Muted style={styles.detailLabel}>Bio</Muted>
            <Text style={styles.detailValue}>{user?.bio || 'No bio added yet.'}</Text>
          </View> */}
          <View style={styles.detailRow}>
            <Muted style={styles.detailLabel}>Role</Muted>
            <Text style={styles.detailValue}>
              {String(user?.role || "member").toUpperCase()}
            </Text>
          </View>
          <AppButton
            title="Logout"
            type="danger"
            onPress={logout}
            style={{ marginTop: 4 }}
          />
        </Card>

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
    borderWidth: 1,
    borderColor: "#ead7cd",
    backgroundColor: "#fff8f4",
    shadowColor: "#7c4a39",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroRowCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#1e3a8a",
    fontWeight: "900",
    fontSize: 20,
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  badgesRow: {
    marginTop: 2,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontWeight: "700",
    fontSize: 11,
  },
  deptBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f1f5f9",
  },
  deptBadgeText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 11,
  },
  formCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  detailRow: {
    gap: 2,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  detailLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
