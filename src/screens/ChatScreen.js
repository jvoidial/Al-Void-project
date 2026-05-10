import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function ChatScreen({ route }) {
  const { room } = route.params;
  const { userToken } = React.useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(`ws://localhost:8080/ws?token=${userToken}`);
    ws.current.onmessage = (e) => {
      setMessages(prev => [...prev, { id: Date.now(), text: e.data, fromMe: false }]);
    };
    return () => ws.current.close();
  }, []);

  const sendMessage = () => {
    if (input.trim()) {
      ws.current.send(input);
      setMessages(prev => [...prev, { id: Date.now(), text: input, fromMe: true }]);
      setInput('');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.message, item.fromMe ? styles.myMessage : styles.theirMessage]}>
            <Text>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Type..." />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  message: { padding: 10, marginVertical: 5, borderRadius: 10, maxWidth: '80%' },
  myMessage: { backgroundColor: '#dcf8c5', alignSelf: 'flex-end' },
  theirMessage: { backgroundColor: '#fff', alignSelf: 'flex-start' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, marginRight: 10 },
});
