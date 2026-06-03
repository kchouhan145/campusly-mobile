import { Platform } from 'react-native';

const LOCAL_API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export const API_BASE = __DEV__ ? LOCAL_API_BASE : 'https://campusly-backend-zou3.onrender.com';
