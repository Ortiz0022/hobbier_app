import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, radii, spacing, fonts } from '../../../theme';
import { useSignedUrl } from '../hooks/useSignedUrl';

export const RoomMessageBubble = ({ message, isMe }) => {
  const isEvidence = message.message_type === 'EVIDENCE';
  const { url: evidenceUrl } = useSignedUrl('room-evidence', message.evidence?.image_path);

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerOther]}>
      {/* Avatar del sender si no soy yo */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          {message.sender?.avatar_url ? (
            <Image source={{ uri: message.sender.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {message.sender?.username?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperOther]}>
        {!isMe && (
          <Text style={styles.senderName}>{message.sender?.username}</Text>
        )}

        {isEvidence ? (
          <View style={[styles.bubble, styles.evidenceBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <View style={styles.evidenceHeader}>
              <Feather name="camera" size={16} color={colors.primaryDark} style={styles.evidenceIcon} />
              <Text style={styles.evidenceHeaderText}>registró un avance</Text>
            </View>
            
            {evidenceUrl ? (
              <Image source={{ uri: evidenceUrl }} style={styles.evidenceImage} />
            ) : (
               <View style={styles.evidenceImagePlaceholder} />
            )}
            
            <View style={styles.evidencePoints}>
              <Text style={styles.pointsText}>+{message.evidence?.points_awarded || 0} pts</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {message.content}
            </Text>
          </View>
        )}
        
        <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  containerMe: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  bubbleWrapperMe: {
    alignItems: 'flex-end',
  },
  bubbleWrapperOther: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    padding: spacing.md,
    borderRadius: radii.card,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  evidenceBubble: {
    padding: spacing.sm,
    backgroundColor: colors.surfaceAccent,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: colors.onPrimary,
  },
  messageTextOther: {
    color: colors.text,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  evidenceIcon: {
    marginRight: spacing.xs,
  },
  evidenceHeaderText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  evidenceImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceMuted,
  },
  evidenceImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceMuted,
  },
  evidencePoints: {
    position: 'absolute',
    bottom: spacing.sm + 8,
    right: spacing.sm + 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pointsText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  time: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 4,
  },
  timeMe: {
    marginRight: 4,
  },
  timeOther: {
    marginLeft: 4,
  },
});
