import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, FlatList, Text, Button, ActivityIndicator, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/apiClient';
import { AuthContext } from '../context/AuthContext';
import PostItem from '../components/PostItem';

const { width, height } = Dimensions.get('window');

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

  const renderItem = ({ item }) => <PostItem post={item} />;

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.ID}
        renderItem={renderItem}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      <View style={styles.buttons}>
        <Button title="New Post" onPress={() => navigation.navigate('CreatePost')} />
        <Button title="Logout" onPress={signOut} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttons: { position: 'absolute', bottom: 20, right: 20, gap: 10 },
});
