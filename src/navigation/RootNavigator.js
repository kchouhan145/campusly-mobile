import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import StartupSplash from '../components/StartupSplash';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import EventsScreen from '../screens/EventsScreen';
import LostFoundScreen from '../screens/LostFoundScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
// import AnnouncementDetailsScreen from '../screens/AnnouncementDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function AppTabs() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const baseHeight = width < 360 ? 56 : 62;
  const tabBarHeight = baseHeight + Math.max(insets.bottom, 6);

  const iconName = (routeName, focused) => {
    const iconMap = {
      Home: focused ? 'home' : 'home-outline',
      Events: focused ? 'calendar' : 'calendar-outline',
      'Lost+Found': focused ? 'search' : 'search-outline',
      Market: focused ? 'cart' : 'cart-outline',
      Chat: focused ? 'chatbubbles' : 'chatbubbles-outline',
      Profile: focused ? 'person' : 'person-outline',
      Admin: focused ? 'settings' : 'settings-outline',
    };

    return iconMap[routeName] || 'ellipse-outline';
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff8f4',
          borderTopColor: '#e2d2c8',
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarItemStyle: { paddingVertical: 3 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={iconName(route.name, focused)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Lost+Found" component={LostFoundScreen} />
      <Tab.Screen name="Market" component={MarketplaceScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {user?.role === 'admin' ? <Tab.Screen name="Admin" component={AdminUsersScreen} /> : null}
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen options={{ headerShown: false }} name="AppTabs" component={AppTabs} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      {/* <Stack.Screen name="AnnouncementDetails" component={AnnouncementDetailsScreen} options={{ title: 'Announcement' }} /> */}
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen options={{ headerShown: false }} name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { token, loading } = useAuth();
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !splashReady) {
    return <StartupSplash />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {token ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
