import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import SelectMasterScreen  from './screens/SelectMasterScreen';
import RequestsListScreen  from './screens/RequestsListScreen';
import RequestDetailScreen from './screens/RequestDetailScreen';
import DoneScreen          from './screens/DoneScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle:      { backgroundColor: '#0f172a' },
          headerTintColor:  '#fff',
          headerTitleStyle: { fontWeight: '600' },
          cardStyle:        { backgroundColor: '#f1f5f9' },
        }}
      >
        <Stack.Screen
          name="SelectMaster"
          component={SelectMasterScreen}
          options={{ title: 'Заявки КТО', headerLeft: () => null }}
        />
        <Stack.Screen
          name="RequestsList"
          component={RequestsListScreen}
          options={{ title: 'Заявки КТО' }}
        />
        <Stack.Screen
          name="RequestDetail"
          component={RequestDetailScreen}
          options={({ route }) => ({ title: `Заявка #${route.params.number}` })}
        />
        <Stack.Screen
          name="Done"
          component={DoneScreen}
          options={{ title: 'Мои выполненные' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}