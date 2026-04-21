import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { AppButton, AppInput, Card, Heading, Muted, Screen } from '../components/ui';
import { API_BASE } from '../services/config';
import { colors } from '../theme/colors';

function getSenderId(value) {
  return value?.senderId?._id || value?.senderId || '';
}

function chatTitle(chat, myId) {
  if (chat.chatType === 'department') return `${chat.department} Department`;
  if (chat.senderId?._id === myId || chat.senderId === myId) {
    return chat.receiverId?.name || chat.receiverId?.username || 'Direct';
  }
  return chat.senderId?.name || chat.senderId?.username || 'Direct';
}

function chatPreview(chat) {
  return chat?.message || 'No messages yet';
}

function getDirectOtherUserId(chat, myId) {
  if (!chat) return '';
  if (chat.directUser?._id) {
    return chat.directUser._id;
  }

  if (chat.senderId?._id === myId || chat.senderId === myId) {
    return chat.receiverId?._id || chat.receiverId || '';
  }

  return chat.senderId?._id || chat.senderId || '';
}

function getDepartmentKey(chat, userDepartment) {
  return chat?.department || userDepartment || '';
}

function getSenderLabel(message, myId) {
  const sender = message?.senderId || {};
  if ((sender?._id || sender) === myId) {
    return 'You';
  }

  return sender?.name || sender?.username || 'Member';
}

function getSenderRole(message) {
  return message?.senderId?.role || 'student';
}

function initialsFromTitle(value) {
  const text = String(value || '').trim();
  if (!text) return 'C';

  const words = text.split(' ').filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

export default function ChatScreen() {
  const { token, user } = useAuth();
  const [chats, setChats] = useState([]);
  const [people, setPeople] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [showConversation, setShowConversation] = useState(false);
  const selectedRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const refreshChats = useCallback(async () => {
    if (!token) return [];

    const chatData = await apiRequest('/api/messages/chats', { token });
    const chatList = Array.isArray(chatData.chats) ? chatData.chats : [];
    setChats(chatList);
    return chatList;
  }, [token]);

  const markChatAsRead = useCallback(
    async (chat) => {
      if (!chat || !token) return;

      if (chat.chatType === 'department') {
        await apiRequest('/api/messages/department/read', {
          method: 'PATCH',
          token,
        });
        return;
      }

      const otherUserId = getDirectOtherUserId(chat, user?.id);
      if (!otherUserId) return;

      await apiRequest(`/api/messages/${otherUserId}/read`, {
        method: 'PATCH',
        token,
      });
    },
    [token, user?.id]
  );

  const loadMessages = useCallback(
    async (chat) => {
      if (!chat || !token) return;

      try {
        if (chat.chatType === 'department') {
          const dep = encodeURIComponent(chat.department || user?.department || '');
          const data = await apiRequest(`/api/messages/department/messages?department=${dep}`, { token });
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        } else {
          const otherUserId =
            chat.directUser?._id ||
            (chat.senderId?._id === user?.id ? chat.receiverId?._id || chat.receiverId : chat.senderId?._id || chat.senderId);

          if (!otherUserId) {
            setMessages([]);
            return;
          }

          const data = await apiRequest(`/api/messages/${otherUserId}`, { token });
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        }
      } catch (e) {
        setError(e.message || 'Failed to load messages');
        return;
      }

      try {
        await markChatAsRead(chat);
        await refreshChats();
      } catch (e) {
        setError(e.message || 'Failed to update read status');
      }
    },
    [markChatAsRead, refreshChats, token, user?.department, user?.id]
  );

  const loadAll = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const [chatData, peopleData] = await Promise.all([
        apiRequest('/api/messages/chats', { token }),
        apiRequest('/api/users', { token }),
      ]);

      const chatList = Array.isArray(chatData.chats) ? chatData.chats : [];
      setChats(chatList);
      setPeople(Array.isArray(peopleData.users) ? peopleData.users : []);

      const nextSelected = selectedRef.current || chatList[0] || null;
      setSelected(nextSelected);
      if (nextSelected) {
        await loadMessages(nextSelected);
      }
    } catch (e) {
      setError(e.message || 'Failed to load chat list');
    }
  }, [loadMessages, token]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    const handleReceiveMessage = async (payload) => {
      const senderId = getSenderId(payload);
      if (!senderId || senderId === user?.id) {
        return;
      }

      const activeChat = selectedRef.current;
      const otherUserId = getDirectOtherUserId(activeChat, user?.id);
      const isActiveDirect = activeChat?.chatType === 'direct' && otherUserId === senderId;

      if (isActiveDirect) {
        await loadMessages(activeChat);
        return;
      }

      await refreshChats();
    };

    const handleDepartmentMessage = async (payload) => {
      if (payload?.senderId?._id === user?.id || payload?.senderId === user?.id) {
        return;
      }

      const activeChat = selectedRef.current;
      const departmentKey = getDepartmentKey(activeChat, user?.department);
      const incomingDepartment = payload?.department || '';
      const isActiveDepartment = activeChat?.chatType === 'department' && departmentKey && departmentKey === incomingDepartment;

      if (isActiveDepartment) {
        await loadMessages(activeChat);
        return;
      }

      await refreshChats();
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleReceiveMessage);
    socket.on('department_message', handleDepartmentMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleReceiveMessage);
      socket.off('department_message', handleDepartmentMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadMessages, refreshChats, token, user?.department, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const filteredChats = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return chats;
    return chats.filter((chat) => {
      const title = chatTitle(chat, user?.id).toLowerCase();
      return title.includes(q) || (chat.message || '').toLowerCase().includes(q);
    });
  }, [chats, search, user?.id]);

  const onOpenPerson = async (person) => {
    const direct = {
      _id: `user:${person._id}`,
      chatType: 'direct',
      directUser: person,
      senderId: { _id: user?.id, name: user?.name, username: user?.username },
      receiverId: person,
    };
    setSelected(direct);
    setShowPeopleModal(false);
    setPeopleSearch('');
    setShowConversation(true);
    await loadMessages(direct);
  };

  const filteredPeople = useMemo(() => {
    const q = peopleSearch.toLowerCase().trim();
    if (!q) return people;
    return people.filter((person) => `${person.name} ${person.username} ${person.email}`.toLowerCase().includes(q));
  }, [people, peopleSearch]);

  const onSend = async () => {
    if (!selected || !text.trim()) return;

    setError('');
    setSending(true);
    try {
      if (selected.chatType === 'department') {
        await apiRequest('/api/messages/department', {
          method: 'POST',
          token,
          body: {
            message: text,
            type: 'text',
            department: selected.department || user?.department,
          },
        });
      } else {
        const otherUserId =
          selected.directUser?._id ||
          (selected.senderId?._id === user?.id
            ? selected.receiverId?._id || selected.receiverId
            : selected.senderId?._id || selected.senderId);

        await apiRequest('/api/messages', {
          method: 'POST',
          token,
          body: {
            receiverId: otherUserId,
            message: text,
            type: 'text',
          },
        });
      }

      setText('');
      await loadMessages(selected);
    } catch (e) {
      setError(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (showConversation && selected) {
    return (
      <View style={styles.conversationRoot}>
        <View style={styles.conversationBgLayer} />

        <View style={styles.conversationContent}>
          <View style={styles.conversationTopBar}>
            <AppButton title="Back" type="ghost" onPress={() => setShowConversation(false)} style={styles.backButton} />
            <View style={styles.conversationTopInfo}>
              <Text style={styles.conversationTopTitle}>{chatTitle(selected, user?.id)}</Text>
              <Text style={styles.conversationTopSubtitle}>Online in Campusly</Text>
            </View>
          </View>

          {!!error && <Text style={{ color: colors.danger, marginHorizontal: 16 }}>{error}</Text>}

          <FlatList
            data={messages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messageListFull}
            style={styles.messageListSurface}
            renderItem={({ item }) => {
              const mine = getSenderId(item) === user?.id;
              const departmentChat = selected?.chatType === 'department';
              const senderRole = getSenderRole(item);
              const senderName = getSenderLabel(item, user?.id);
              const isTeacherMessage = departmentChat && senderRole === 'teacher';
              return (
                <View
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    backgroundColor: isTeacherMessage
                      ? '#ede9fe'
                      : mine
                        ? '#dcf8c6'
                        : departmentChat
                          ? '#f0f9ff'
                          : '#ffffff',
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginVertical: 4,
                    maxWidth: '85%',
                    borderWidth: isTeacherMessage ? 1 : mine ? 0 : 1,
                    borderColor: isTeacherMessage ? '#c4b5fd' : mine ? 'transparent' : '#e5e7eb',
                  }}
                >
                  {departmentChat ? (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{senderName}</Text>
                      {senderRole === 'teacher' ? (
                        <View style={styles.teacherBadge}>
                          <Text style={styles.teacherBadgeText}>TEACHER</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  <Text style={{ color: colors.text }}>{item.message}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              );
            }}
          />

          <View style={styles.composerRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message"
              placeholderTextColor={colors.textMuted}
              style={styles.composerInput}
            />
            <AppButton title="Send" onPress={onSend} loading={sending} style={styles.sendButton} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Screen>
      <Heading style={styles.pageTitle}>Chats</Heading>
      <AppInput label="Search chats" value={search} onChangeText={setSearch} style={styles.searchInput} />
      <View style={{ marginBottom: 8 }}>
        <AppButton title="Start new conversation" onPress={() => setShowPeopleModal(true)} />
      </View>
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card>
          <Heading size="sm">Recent chats</Heading>
          {filteredChats.map((chat) => (
            <Pressable
              key={chat._id}
              style={[
                styles.chatRow,
                chat.unreadCount > 0 ? styles.chatRowUnread : null,
              ]}
              onPress={async () => {
                setSelected(chat);
                setShowConversation(true);
                await loadMessages(chat);
              }}
            >
              <View style={[styles.avatarCircle, chat.chatType === 'department' ? styles.departmentAvatar : null]}>
                <Text style={styles.avatarText}>{initialsFromTitle(chatTitle(chat, user?.id))}</Text>
              </View>
              <View style={styles.chatRowContent}>
                <Text style={styles.chatRowTitle}>{chatTitle(chat, user?.id)}</Text>
                <Text numberOfLines={1} style={styles.chatRowPreview}>{chatPreview(chat)}</Text>
              </View>
              {chat.unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{chat.unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </Card>

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={showPeopleModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPeopleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.peopleModalCard}>
            <Heading size="sm">Start new conversation</Heading>
            <AppInput label="Search people" value={peopleSearch} onChangeText={setPeopleSearch} />
            <ScrollView style={{ maxHeight: 320 }}>
              {filteredPeople.map((person) => (
                <Pressable key={person._id} style={styles.modalPersonRow} onPress={() => onOpenPerson(person)}>
                  <View style={styles.modalPersonAvatar}>
                    <Text style={styles.avatarText}>{initialsFromTitle(person.name || person.username)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chatRowTitle}>{person.name}</Text>
                    <Text style={styles.chatRowPreview}>@{person.username}</Text>
                  </View>
                </Pressable>
              ))}
              {filteredPeople.length === 0 ? <Muted>No people found.</Muted> : null}
            </ScrollView>
            <View style={{ marginTop: 10 }}>
              <AppButton title="Close" type="ghost" onPress={() => setShowPeopleModal(false)} />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    marginTop: 20,
  },
  searchInput: {
    marginBottom: 2,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    backgroundColor: '#ffffff',
  },
  chatRowUnread: {
    backgroundColor: '#eff6ff',
    borderColor: '#60a5fa',
  },
  chatRowActive: {
    borderColor: colors.accent,
    backgroundColor: '#f0fdf4',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  departmentAvatar: {
    backgroundColor: '#dcfce7',
  },
  avatarText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  chatRowContent: {
    flex: 1,
  },
  chatRowTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  chatRowPreview: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 12,
  },
  peopleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  personChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  personChipText: {
    color: colors.text,
    fontWeight: '600',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  conversationAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationAvatarText: {
    color: '#065f46',
    fontWeight: '700',
  },
  teacherBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#f3e8ff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  teacherBadgeText: {
    color: '#6b21a8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  conversationTopBar: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  backButton: {
    minWidth: 84,
    paddingVertical: 10,
  },
  conversationTopInfo: {
    flex: 1,
  },
  conversationTopTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  conversationTopSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 12,
  },
  messageList: {
    backgroundColor: '#f5efe6',
    borderRadius: 12,
    padding: 8,
  },
  messageListFull: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  messageListSurface: {
    flex: 1,
  },
  composerRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    color: colors.text,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  sendButton: {
    minWidth: 84,
    paddingVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  peopleModalCard: {
    maxHeight: '80%',
  },
  modalPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  modalPersonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  conversationRoot: {
    flex: 1,
    backgroundColor: '#f5efe6',
  },
  conversationBgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5efe6',
  },
  conversationContent: {
    flex: 1,
  },
});
