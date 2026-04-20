import { StatusBar } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
      <RootNavigator />
    </AuthProvider>
  );
}
