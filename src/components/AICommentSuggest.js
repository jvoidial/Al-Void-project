import React, { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import apiClient from '../api/apiClient';

export default function AICommentSuggest({ postId }) {
  const [suggestion, setSuggestion] = useState('');

  const getSuggestion = async () => {
    try {
      // In production, call your backend which calls Gemini with a fresh key
      // For now, stub
      setSuggestion('🔥 This is fire!');
    } catch (err) {
      Alert.alert('AI fail');
    }
  };

  return (
    <View>
      <Button title="🤖 AI Comment" onPress={getSuggestion} />
      {suggestion ? <Text>{suggestion}</Text> : null}
    </View>
  );
}
