import React, { useContext, useState, useRef } from 'react';
import { View, Text, Image, Button, Alert, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import apiClient from '../api/apiClient';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function PostItem({ post }) {
  const { userToken } = useContext(AuthContext);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.LikeCount || 0);
  const videoRef = useRef(null);
  const date = new Date(post.CreatedAt).toLocaleString();
  const isVideo = post.MediaType === 'video';

  const sendTip = async () => {
    try {
      await apiClient.post('/tips', { to: post.UserID, amount: 0.001 });
      Alert.alert('Tip sent', 'Thank you!');
    } catch (err) {
      Alert.alert('Tip failed');
    }
  };

  const toggleLike = async () => {
    try {
      const res = await apiClient.post(`/like/${post.ID}`);
      setLiked(res.data.liked);
      setLikeCount(prev => res.data.liked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={[styles.card, { height }]}>
      <Text style={styles.username}>{post.Username || 'Anonymous'}</Text>
      {post.Content ? <Text style={styles.content}>{post.Content}</Text> : null}
      
      {post.MediaURL && isVideo ? (
        <Video
          ref={videoRef}
          source={{ uri: 'http://localhost:8080' + post.MediaURL }}
          style={styles.media}
          resizeMode="cover"
          shouldPlay={false}
          isLooping
          useNativeControls
        />
      ) : post.MediaURL ? (
        <Image source={{ uri: 'http://localhost:8080' + post.MediaURL }} style={styles.media} resizeMode="cover" />
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike}>
          <Text>{liked ? '❤️' : '🤍'} {likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={sendTip}>
          <Text>💎 Tip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}}>
          <Text>💬 Comment</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.date}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  username: { color: '#fff', fontWeight: 'bold', marginBottom: 4, alignSelf: 'flex-start' },
  content: { color: '#fff', marginBottom: 8, alignSelf: 'flex-start' },
  media: { width: width - 40, height: height * 0.6, borderRadius: 12, marginVertical: 10 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 },
  date: { color: '#aaa', marginTop: 8, alignSelf: 'flex-start' },
});
