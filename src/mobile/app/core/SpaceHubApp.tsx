import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '@shopify/restyle';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { LogBox } from 'react-native';

import { store, persistor } from '../store';
import { theme } from '../theme';
import { RootNavigator } from '../navigation';
import { StreamingProvider } from '../contexts/StreamingContext';
import { AnalyticsProvider } from '../contexts/AnalyticsContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { LocalizationProvider } from '../contexts/LocalizationContext';
import { BiometricsProvider } from '../contexts/BiometricsContext';
import { ConnectivityProvider } from '../contexts/ConnectivityContext';

// Enable react-native-screens
enableScreens();

// Ignore specific warnings
LogBox.ignoreLogs([
  'ReactNativeFiberHostComponent',
  'Require cycle:',
]);

export const SpaceHubApp: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider theme={theme}>
            <PaperProvider theme={theme}>
              <SafeAreaProvider>
                <LocalizationProvider>
                  <ConnectivityProvider>
                    <BiometricsProvider>
                      <NotificationProvider>
                        <AnalyticsProvider>
                          <StreamingProvider>
                            <NavigationContainer>
                              <RootNavigator />
                            </NavigationContainer>
                          </StreamingProvider>
                        </AnalyticsProvider>
                      </NotificationProvider>
                    </BiometricsProvider>
                  </ConnectivityProvider>
                </LocalizationProvider>
              </SafeAreaProvider>
            </PaperProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
};

export default SpaceHubApp;
