# Campusly Mobile (React Native + Expo)

React Native app that mirrors the web modules in Campusly frontend and connects to:
https://campusly-backend-zou3.onrender.com

## Included modules

- Auth: login, signup, OTP verify/resend
- Home: announcements, events, chat summary
- Events: list, create, delete (role-based)
- Lost & Found: list/search/create/delete
- Marketplace: list/search/create/mark sold/delete
- Chat: chats, people, conversation, send message
- Profile: edit profile, users list, logout
- Admin: user role/status/delete (admin only)

## Run locally

1. Install dependencies:
   npm install
2. Start Expo:
   npm run start
3. Open Android emulator or Expo Go.

## Build APK (recommended with EAS)

1. Install EAS CLI globally:
   npm install -g eas-cli
2. Login:
   eas login
3. Configure once (inside this folder):
   eas build:configure
4. Build installable APK:
   eas build --platform android --profile preview

The generated APK URL will be shown in the terminal after build finishes.

## Notes

- API base is currently hardcoded in src/services/config.js
- This project uses Expo SDK 54 and React Native 0.81
