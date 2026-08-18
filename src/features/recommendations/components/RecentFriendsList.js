import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text } from '../../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';

export const RecentFriendsList = ({ recentFriendPosts, onNavigateToFeed }) => {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>ACTIVIDADES RECIENTES DE AMIGOS</Text>
        <TouchableOpacity onPress={onNavigateToFeed}>
          <Text style={styles.verTodoLink}>Ver todo</Text>
        </TouchableOpacity>
      </View>

      {recentFriendPosts.length === 0 ? (
        <View style={styles.emptyFriendsCard}>
          <Feather name="users" size={32} color="#8A908B" style={styles.emptyFriendsIcon} />
          <Text style={styles.emptyFriendsText}>
            Agrega amigos para ver sus hobbies y actividades recientes aquí.
          </Text>
        </View>
      ) : (
        <View style={styles.friendsList}>
          {recentFriendPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.friendActivityCard}
              onPress={onNavigateToFeed}
              activeOpacity={0.9}
            >
              <View style={styles.avatarRing}>
                {post.author?.avatar_url ? (
                  <Image
                    source={{ uri: post.author.avatar_url }}
                    style={styles.friendAvatarImage}
                  />
                ) : (
                  <View style={styles.friendAvatarPlaceholder}>
                    <Text style={styles.friendAvatarInitial}>
                      {(post.author?.full_name || 'C')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.friendTextCol}>
                <Text style={styles.friendSentence}>
                  <Text style={styles.friendName}>{post.author?.full_name?.split(' ')[0]} </Text>
                  terminó{' '}
                  <Text style={styles.activityName}>
                    {post.user_activity?.activity?.title || 'una actividad'}
                  </Text>
                </Text>
                <Text style={styles.friendTimeAgo}>
                  {new Date(post.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <Feather name="check-circle" size={20} color="#A94403" style={styles.actionIcon} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#121B22',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  verTodoLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00DBFF',
  },
  emptyFriendsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  emptyFriendsIcon: {
    marginBottom: 6,
  },
  emptyFriendsText: {
    fontSize: 13,
    color: '#727773',
    textAlign: 'center',
  },
  friendsList: {
    gap: 10,
  },
  friendActivityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#00DBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  friendAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0C8AA6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  friendAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  friendTextCol: {
    flex: 1,
  },
  friendSentence: {
    fontSize: 14,
    color: '#434744',
  },
  friendName: {
    fontWeight: '600',
    color: '#121B22',
  },
  activityName: {
    fontWeight: '600',
    color: '#2A6347',
  },
  friendTimeAgo: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 2,
  },
  actionIcon: {
    marginLeft: 8,
  },
});
