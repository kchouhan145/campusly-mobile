import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { AppButton, AppInput, Card, Heading, Muted, Screen } from '../components/ui';
import { colors } from '../theme/colors';

const initialForm = {
  title: '',
  description: '',
  price: '',
  category: 'books',
  contactInfo: '',
  status: 'available',
};

const categories = ['all', 'books', 'electronics', 'clothing', 'furniture', 'others'];
const statuses = ['all', 'available', 'sold'];

export default function MarketplaceScreen() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('q', search.trim());
      if (category !== 'all') params.append('category', category);
      if (status !== 'all') params.append('status', status);

      const data = await apiRequest(`/api/products?${params.toString()}`, { token });
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (e) {
      setError(e.message || 'Failed to load products');
    }
  }, [category, search, status, token]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((item) => {
      const matchesSearch = `${item.title} ${item.description}`.toLowerCase().includes(q);
      const matchesCategory = category === 'all' ? true : item.category === category;
      const matchesStatus = status === 'all' ? true : item.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, category, status]);

  const getProductBorderColor = (productStatus) => {
    if (productStatus === 'sold') return colors.danger;
    if (productStatus === 'available') return colors.accent;
    return colors.border;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const onCreate = async () => {
    setError('');
    setCreating(true);
    try {
      await apiRequest('/api/products', {
        method: 'POST',
        token,
        body: {
          ...createForm,
          price: Number(createForm.price),
          images: [],
        },
      });

      setCreateForm(initialForm);
      setShowCreateModal(false);
      await loadProducts();
    } catch (e) {
      setError(e.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const onMarkSold = async (id) => {
    try {
      await apiRequest(`/api/products/${id}`, {
        method: 'PUT',
        token,
        body: { status: 'sold' },
      });
      await loadProducts();
    } catch (e) {
      setError(e.message || 'Failed to update product');
    }
  };

  const onDelete = async (id) => {
    Alert.alert('Delete product', 'Delete this product post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/products/${id}`, { method: 'DELETE', token });
            await loadProducts();
          } catch (e) {
            setError(e.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Heading>Marketplace</Heading>
          <AppButton title="Create" onPress={() => setShowCreateModal(true)} style={{ minWidth: 96, paddingVertical: 10, paddingHorizontal: 16 }} />
        </View>
        <AppInput style={{ marginTop: 10 }} label="Search" value={search} onChangeText={setSearch} />
        <Muted style={{ marginTop: 2 }}>Category filters</Muted>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {categories.map((item) => (
            <AppButton
              key={item}
              title={item.charAt(0).toUpperCase() + item.slice(1)}
              type={category === item ? 'primary' : 'ghost'}
              style={{ minWidth: 96 }}
              onPress={() => setCategory(item)}
            />
          ))}
        </View>
        <Muted style={{ marginTop: 2 }}>Status filters</Muted>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 10 }}>
          {statuses.map((item) => (
            <AppButton
              key={item}
              title={item.charAt(0).toUpperCase() + item.slice(1)}
              type={status === item ? 'primary' : 'ghost'}
              style={{ flex: 1 }}
              onPress={() => setStatus(item)}
            />
          ))}
        </View>
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {filtered.map((item) => {
          const ownerId = item.sellerId?._id || item.sellerId;
          const canManage = user?.role === 'admin' || ownerId === user?.id;

          return (
            <Card key={item._id} style={{ marginTop: 10, borderColor: getProductBorderColor(item.status), borderWidth: 2 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.title}</Text>
              <Muted>{item.description}</Muted>
              <Muted>INR {item.price} | {item.category} | {item.status}</Muted>
              <Muted>Contact: {item.contactInfo}</Muted>
              {canManage ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {item.status !== 'sold' ? <AppButton title="Mark sold" type="ghost" onPress={() => onMarkSold(item._id)} /> : null}
                  <AppButton title="Delete" type="danger" onPress={() => onDelete(item._id)} />
                </View>
              ) : null}
            </Card>
          );
        })}

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
              <Heading size="sm">Create listing</Heading>
              <AppInput label="Title" value={createForm.title} onChangeText={(v) => setCreateForm((p) => ({ ...p, title: v }))} />
              <AppInput
                label="Description"
                multiline
                value={createForm.description}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, description: v }))}
              />
              <AppInput
                label="Price"
                keyboardType="numeric"
                value={createForm.price}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, price: v }))}
              />
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Category</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {categories.filter((item) => item !== 'all').map((item) => (
                    <AppButton
                      key={item}
                      title={item.charAt(0).toUpperCase() + item.slice(1)}
                      type={createForm.category === item ? 'primary' : 'ghost'}
                      style={{ minWidth: 96 }}
                      onPress={() => setCreateForm((p) => ({ ...p, category: item }))}
                    />
                  ))}
                </View>
              </View>
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
                <AppButton title="Create listing" style={{ flex: 1 }} onPress={onCreate} loading={creating} />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}
