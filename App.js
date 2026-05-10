import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import FeedScreen from './src/screens/FeedScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { userToken, isLoading } = React.useContext(AuthContext);
  if (isLoading) return null;
  return (
    <Stack.Navigator>
      {!userToken ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Feed" component={FeedScreen} />
          <Stack.Screen name="CreatePost" component={CreatePostScreen} title="New Post" />
        </>
      )}
        <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
