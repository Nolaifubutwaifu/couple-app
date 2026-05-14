export const app = {
  supabase: null,
  currentUser: null,
  currentProfile: null,
  currentCouple: null,
  allMessages: null,
  isNative: false,
  settingToggles: {
    settingMsgNotif: true,
    settingDailyReminder: true,
    settingPartnerActivity: true,
    settingReadReceipts: true,
    settingOnlineStatus: true,
    settingTypingIndicators: true
  },
  presenceChannel: null,
  gameChannel: null,
  messagesChannel: null,
  momentsChannel: null,
  myTttRole: null,
  myMemoryRole: null,
  lastSavedGameState: { tictactoe: null, memory: null, date: null },
  reloadMessagesTimer: null,
  latestMessagesLoadId: 0
};
