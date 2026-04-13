import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { AppButton, AppInput, Card, Heading, Muted, Screen } from '../components/ui';
import { colors } from '../theme/colors';

const initialForm = {
  type: 'lost',
  title: '',
  description: '',
  location: '',
  contactInfo: '',
};

export default function LostFoundScreen() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('q', search.trim());
      if (type !== 'all') params.append('type', type);
      const data = await apiRequest(`/api/posts?${params.toString()}`, { token });
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      setError(e.message || 'Failed to load posts');
    }
  }, [search, token, type]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const filtered = useMemo(() => {
    return posts.filter((item) => {
      const matchesSearch = `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(search.toLowerCase());
      const matchesType = type === 'all' ? true : item.type === type;
      return matchesSearch && matchesType;
    });
  }, [posts, search, type]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const onCreate = async () => {
    setError('');
    setCreating(true);
    try {
      await apiRequest('/api/posts', {
        method: 'POST',
        token,
        body: createForm,
      });
      setCreateForm(initialForm);
      setShowCreateModal(false);
      await loadPosts();
    } catch (e) {
      setError(e.message || 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id) => {
    Alert.alert('Delete post', 'Delete this lost/found post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/posts/${id}`, { method: 'DELETE', token });
            await loadPosts();
          } catch (e) {
            setError(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  const getPostBorderColor = (postType) => {
    if (postType === 'found') return colors.accent;
    if (postType === 'lost') return colors.danger;
    return colors.border;
  };

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Heading>Lost & Found</Heading>
          <AppButton title="Create" onPress={() => setShowCreateModal(true)} style={{ minWidth: 96, paddingVertical: 10, paddingHorizontal: 16 }} />
        </View>
        <AppInput style={{marginTop:10}} label="Search" value={search} onChangeText={setSearch} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 10 }}>
          <AppButton title="All" type={type === 'all' ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setType('all')} />
          <AppButton title="Lost" type={type === 'lost' ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setType('lost')} />
          <AppButton title="Found" type={type === 'found' ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => setType('found')} />
        </View>
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {filtered.map((item) => (
          <Card key={item._id} style={{ marginTop: 10, borderColor: getPostBorderColor(item.type), borderWidth: 2 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.title}</Text>
            <Muted>{item.type.toUpperCase()} | {item.isResolved ? 'Resolved' : 'Active'}</Muted>
            <Muted>{item.description}</Muted>
            <Muted>{item.location} | {new Date(item.createdAt).toLocaleDateString()}</Muted>
            <Muted>Contact: {item.contactInfo}</Muted>
            {(user?.role === 'admin' || (item.userId?._id || item.userId) === user?.id) ? (
              <AppButton title="Delete" type="danger" onPress={() => onDelete(item._id)} />
            ) : null}
          </Card>
        ))}

        <View style={{ height: 20 }} />

        <Modal
          visible={showCreateModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.35)',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <Card>
              <Heading size="sm">Create post</Heading>
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Post type</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <AppButton
                    title="Lost"
                    type={createForm.type === 'lost' ? 'primary' : 'ghost'}
                    style={{ flex: 1 }}
                    onPress={() => setCreateForm((p) => ({ ...p, type: 'lost' }))}
                  />
                  <AppButton
                    title="Found"
                    type={createForm.type === 'found' ? 'primary' : 'ghost'}
                    style={{ flex: 1 }}
                    onPress={() => setCreateForm((p) => ({ ...p, type: 'found' }))}
                  />
                </View>
              </View>
              <AppInput label="Title" value={createForm.title} onChangeText={(v) => setCreateForm((p) => ({ ...p, title: v }))} />
              <AppInput
                label="Description"
                multiline
                value={createForm.description}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, description: v }))}
              />
              <AppInput label="Location" value={createForm.location} onChangeText={(v) => setCreateForm((p) => ({ ...p, location: v }))} />
              <AppInput
                label="Contact info"
                value={createForm.contactInfo}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, contactInfo: v }))}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <AppButton
                  title="Cancel"
                  type="ghost"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setShowCreateModal(false);
                    setCreateForm(initialForm);
                  }}
                  disabled={creating}
                />
                <AppButton title="Create post" style={{ flex: 1 }} onPress={onCreate} loading={creating} />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}
