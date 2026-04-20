# Campusly Mobile (Bare React Native)


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
2. Start Metro:
   npm run start
3. Open an Android emulator or iOS simulator, then run `npm run android` or `npm run ios` from a separate terminal.

## Notes

Push notifications now use Firebase Cloud Messaging (FCM) for true background/closed-app delivery.

Required setup for Android push:
- Add `google-services.json` to `android/app/google-services.json`.
- Ensure your Firebase project uses the same Android package as the app (`com.campuslybare`).
- Rebuild the app after adding Firebase config.

- API base is currently hardcoded in src/services/config.js
- This project uses React Native 0.81
