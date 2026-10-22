VOLTRA Offline for Android
===========================

This is a separate Android app project. The existing VOLTRA web app and Railway backend are not changed by this project.

First MVP features
------------------
- Works without internet, accounts, a server, or Google Play Services.
- Discovers nearby Bluetooth devices and connects directly using Bluetooth Classic RFCOMM.
- Sends text messages while a direct connection is active.
- Keeps a local message history on the device.
- Does not require Firebase or internet permission.

Important limitations
---------------------
- Install and open VOLTRA Offline on both Android phones. Enable Bluetooth and grant the requested permission. Depending on Android's Bluetooth visibility behavior, the receiving phone may need to be visible/pairable in system Bluetooth settings.
- This MVP is a direct, one-peer chat. It does not yet relay messages across multiple devices, synchronize with cloud chats, or send photos, files, or calls.
- Message transport is not end-to-end encrypted yet. Do not use it for sensitive messages until authenticated key exchange and encryption are implemented.
- Local history is stored in app-private preferences, but is not encrypted at rest in this MVP.
- This project has not been built or device-tested in this environment. Build with Android Studio, JDK 17, and Android SDK Platform 35.

Build
-----
Open the android-offline directory in Android Studio and let Gradle sync. Then build the app debug APK.

The project is isolated in its own directory and branch so the existing web deployment and Railway volume/data are untouched.
