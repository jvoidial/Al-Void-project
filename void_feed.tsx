```typescript
import React, { useState, useEffect } from 'react';
import { FlatList, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
// NativeWind setup assumes you have 'nativewind' installed and configured.
// You simply use the 'className' prop directly with Tailwind CSS classes.

/**
 * Interface for a single Post object.
 */
interface Post {
  id: string;
  username: string;
  content: string;
  // You might add more fields like timestamp, likes, comments count, profile picture, etc.
}

/**
 * Mock API function to simulate fetching posts.
 * In a real application, this would be an actual API call (e.g., using fetch or Axios).
 */
const mockFetchPosts = async (): Promise<Post[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const posts: Post[] = [
        { id: '1', username: 'Alice_Wonder', content: 'Just had a great coffee! ☕ Feeling productive already.' },
        { id: '2', username: 'BobTheBuilder', content: 'What are your favorite React Native libraries for state management? Looking for new ideas!' },
        { id: '3', username: 'CharlieCode', content: 'Building something awesome with Void. Stay tuned for updates and sneak peeks!' },
        { id: '4', username: 'Diana_Dev', content: 'Weekend vibes! ✨ Enjoying some much-needed downtime after a busy week.' },
        { id: '5', username: 'Eve_Explorer', content: 'Learning TypeScript today. It\'s making my code so much more robust and understandable!' },
        { id: '6', username: 'Frank_FrontEnd', content: 'Any tips for optimizing FlatList performance with many items?' },
        { id: '7', username: 'Grace_Graphics', content: 'Designing new app icons for Void. Which color palette should I go with?' },
        { id: '8', username: 'Henry_Hacker', content: 'Just deployed a new feature to production. Fingers crossed!' },
      ];
      resolve(posts);
    }, 1500); // Simulate a network delay of 1.5 seconds
  });
};

/**
 * MainFeed component for the Void app.
 * Fetches and displays a list of posts with username, content, and a tip button.
 */
const MainFeed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await mockFetchPosts();
        setPosts(data);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setError('Failed to load posts. Please check your internet connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []); // Empty dependency array means this effect runs once after the initial render

  /**
   * Handles the tip button press for a specific user.
   * In a real app, this would trigger an API call to process the tip.
   */
  const handleTip = (username: string) => {
    Alert.alert(
      'Tip Sent!',
      `You've sent a tip to ${username}! Thank you for supporting creators on Void.`,
      [{ text: 'OK' }]
    );
    // Here you would integrate with your tipping service/API
  };

  /**
   * Renders a single post item within the FlatList.
   */
  const renderPostItem = ({ item }: { item: Post }) => (
    <View className="bg-white dark:bg-zinc-800 p-4 mb-3 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700 mx-4">
      <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{item.username}</Text>
      <Text className="text-base text-gray-800 dark:text-gray-200 mb-3 leading-snug">{item.content}</Text>
      <TouchableOpacity
        className="bg-purple-600 dark:bg-purple-700 py-2 px-4 rounded-full self-start flex-row items-center space-x-2"
        onPress={() => handleTip(item.username)}
        activeOpacity={0.7}
      >
        {/* You could add an icon here, e.g., <Ionicons name="gift-outline" size={18} color="white" /> */}
        <Text className="text-white text-base font-semibold">Tip Post</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 dark:bg-zinc-900">
        <ActivityIndicator size="large" color="#8B5CF6" /> {/* Tailwind purple-600 */}
        <Text className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading posts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 dark:bg-zinc-900 p-6">
        <Text className="text-red-500 text-xl font-semibold text-center">{error}</Text>
        {/* A retry button could be added here */}
        <TouchableOpacity
          className="mt-6 bg-blue-500 dark:bg-blue-600 py-3 px-6 rounded-full"
          onPress={() => {
            setError(null); // Clear error
            setLoading(true); // Re-trigger loading
            useEffect(() => { // Re-run the fetch effect
              const fetchPosts = async () => { /* ... same logic as above ... */ };
              fetchPosts();
            }, []);
          }}
        >
          <Text className="text-white text-lg font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-zinc-900 pt-4">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
        contentContainerStyle={{ paddingBottom: 16 }} // Add padding to the bottom of the list
        showsVerticalScrollIndicator={false} // Hide scroll indicator for cleaner UI
        // Optional: Implement pull-to-refresh
        // onRefresh={() => { /* implement refresh logic, perhaps refetch posts */ }}
        // refreshing={false} // State variable for refresh status
      />
    </View>
  );
};

export default MainFeed;
```
