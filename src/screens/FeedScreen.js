import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, FlatList, Text, Button, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/apiClient';
import { AuthContext } from '../context/AuthContext';
import PostItem from '../components/PostItem';

export default function FeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { signOut } = useContext(AuthContext);

  const fetchPosts = async () => {
    try {
      const res = await apiClient.get('/feed');
      setPosts(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) signOut();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPosts(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchPosts(); };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.ID}
        renderItem={({ item }) => <PostItem post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No posts yet. Create one!</Text>}
      />
      <Button title="New Post" onPress={() => navigation.navigate('CreatePost')} />
      <Button title="Logout" onPress={signOut} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({ empty: { textAlign: 'center', marginTop: 50, fontSize: 16 } });
