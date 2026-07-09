import "server-only";
import fs from "fs";
import path from "path";

import type { ArtifactKind } from "@/components/chat/artifact";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import {
  type Chat,
  type DBMessage,
  type Suggestion,
  type User,
} from "./schema";
import { generateHashedPassword } from "./utils";

const MOCK_DB_PATH = path.join(process.cwd(), "lib", "db", "db-mock.json");

interface MockDB {
  users: any[];
  chats: any[];
  messages: any[];
  votes: any[];
  documents: any[];
  suggestions: any[];
  streams: any[];
}

function loadDB(): MockDB {
  if (!fs.existsSync(MOCK_DB_PATH)) {
    const initial: MockDB = {
      users: [],
      chats: [],
      messages: [],
      votes: [],
      documents: [],
      suggestions: [],
      streams: []
    };
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, "utf8"));
  } catch {
    return {
      users: [],
      chats: [],
      messages: [],
      votes: [],
      documents: [],
      suggestions: [],
      streams: []
    };
  }
}

function saveDB(data: MockDB) {
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function getUser(email: string): Promise<User[]> {
  try {
    const db = loadDB();
    return db.users.filter(u => u.email === email);
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function createUser(email: string, password: string) {
  try {
    const db = loadDB();
    const hashedPassword = generateHashedPassword(password);
    const newUser = {
      id: generateUUID(),
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: false,
      isAnonymous: false,
      name: null,
      image: null
    };
    db.users.push(newUser);
    saveDB(db);
    return [newUser];
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function createGuestUser() {
  try {
    const db = loadDB();
    const email = `guest-${Date.now()}`;
    const password = generateHashedPassword(generateUUID());
    const newUser = {
      id: generateUUID(),
      email,
      password,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: false,
      isAnonymous: true,
      name: null,
      image: null
    };
    db.users.push(newUser);
    saveDB(db);
    return [{
      email: newUser.email,
      id: newUser.id
    }];
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    const db = loadDB();
    const newChat = {
      id,
      userId,
      title,
      visibility,
      createdAt: new Date().toISOString()
    };
    db.chats.push(newChat);
    saveDB(db);
    return newChat;
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    const db = loadDB();
    db.votes = db.votes.filter(v => v.chatId !== id);
    db.messages = db.messages.filter(m => m.chatId !== id);
    db.streams = db.streams.filter(s => s.chatId !== id);
    const deletedChat = db.chats.find(c => c.id === id);
    db.chats = db.chats.filter(c => c.id !== id);
    saveDB(db);
    return deletedChat || null;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const db = loadDB();
    const userChats = db.chats.filter(c => c.userId === userId);
    const chatIds = userChats.map(c => c.id);
    db.votes = db.votes.filter(v => !chatIds.includes(v.chatId));
    db.messages = db.messages.filter(m => !chatIds.includes(m.chatId));
    db.streams = db.streams.filter(s => !chatIds.includes(s.chatId));
    db.chats = db.chats.filter(c => c.userId !== userId);
    saveDB(db);
    return { deletedCount: userChats.length };
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const db = loadDB();
    let filteredChats = db.chats.filter(c => c.userId === id);
    
    // Sort by createdAt descending
    filteredChats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (startingAfter) {
      const selectedChat = db.chats.find(c => c.id === startingAfter);
      if (!selectedChat) {
        throw new ChatbotError("not_found:database", `Chat with id ${startingAfter} not found`);
      }
      const date = new Date(selectedChat.createdAt).getTime();
      filteredChats = filteredChats.filter(c => new Date(c.createdAt).getTime() > date);
    } else if (endingBefore) {
      const selectedChat = db.chats.find(c => c.id === endingBefore);
      if (!selectedChat) {
        throw new ChatbotError("not_found:database", `Chat with id ${endingBefore} not found`);
      }
      const date = new Date(selectedChat.createdAt).getTime();
      filteredChats = filteredChats.filter(c => new Date(c.createdAt).getTime() < date);
    }

    const extendedLimit = limit + 1;
    const hasMore = filteredChats.length > limit;
    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const db = loadDB();
    const selectedChat = db.chats.find(c => c.id === id);
    return selectedChat || null;
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    const db = loadDB();
    db.messages.push(...messages);
    saveDB(db);
    return messages;
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    const db = loadDB();
    const msg = db.messages.find(m => m.id === id);
    if (msg) {
      msg.parts = parts;
      saveDB(db);
    }
    return msg || null;
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const db = loadDB();
    const chatMsgs = db.messages.filter(m => m.chatId === id);
    chatMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return chatMsgs;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const db = loadDB();
    const existingVote = db.votes.find(v => v.messageId === messageId);
    if (existingVote) {
      existingVote.isUpvoted = type === "up";
      existingVote.chatId = chatId;
    } else {
      db.votes.push({
        chatId,
        messageId,
        isUpvoted: type === "up"
      });
    }
    saveDB(db);
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const db = loadDB();
    return db.votes.filter(v => v.chatId === id);
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    const db = loadDB();
    const newDoc = {
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date().toISOString()
    };
    db.documents.push(newDoc);
    saveDB(db);
    return [newDoc];
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function updateDocumentContent({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  try {
    const db = loadDB();
    const docs = db.documents.filter(d => d.id === id);
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = docs[0];
    if (!latest) {
      throw new ChatbotError("not_found:database", "Document not found");
    }
    latest.content = content;
    saveDB(db);
    return [latest];
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const db = loadDB();
    const docs = db.documents.filter(d => d.id === id);
    docs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return docs;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const db = loadDB();
    const docs = db.documents.filter(d => d.id === id);
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return docs[0] || null;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const db = loadDB();
    const timeLimit = new Date(timestamp).getTime();
    
    db.suggestions = db.suggestions.filter(s => {
      return !(s.documentId === id && new Date(s.documentCreatedAt).getTime() > timeLimit);
    });
    
    const deletedDocs = db.documents.filter(d => d.id === id && new Date(d.createdAt).getTime() > timeLimit);
    db.documents = db.documents.filter(d => !(d.id === id && new Date(d.createdAt).getTime() > timeLimit));
    
    saveDB(db);
    return deletedDocs;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    const db = loadDB();
    db.suggestions.push(...suggestions);
    saveDB(db);
    return suggestions;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const db = loadDB();
    return db.suggestions.filter(s => s.documentId === documentId);
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const db = loadDB();
    return db.messages.filter(m => m.id === id);
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const db = loadDB();
    const timeLimit = new Date(timestamp).getTime();
    const messagesToDelete = db.messages.filter(m => m.chatId === chatId && new Date(m.createdAt).getTime() >= timeLimit);
    const messageIds = messagesToDelete.map(m => m.id);
    
    if (messageIds.length > 0) {
      db.votes = db.votes.filter(v => !(v.chatId === chatId && messageIds.includes(v.messageId)));
      db.messages = db.messages.filter(m => !messageIds.includes(m.id));
      saveDB(db);
    }
    return messagesToDelete;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    const db = loadDB();
    const selectedChat = db.chats.find(c => c.id === chatId);
    if (selectedChat) {
      selectedChat.visibility = visibility;
      saveDB(db);
    }
    return selectedChat || null;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    const db = loadDB();
    const selectedChat = db.chats.find(c => c.id === chatId);
    if (selectedChat) {
      selectedChat.title = title;
      saveDB(db);
    }
  } catch {
    // Best effort title update.
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const db = loadDB();
    const cutoffTime = Date.now() - differenceInHours * 60 * 60 * 1000;
    
    const userChatIds = db.chats.filter(c => c.userId === id).map(c => c.id);
    const recentMsgs = db.messages.filter(m => 
      userChatIds.includes(m.chatId) && 
      new Date(m.createdAt).getTime() >= cutoffTime &&
      m.role === "user"
    );
    return recentMsgs.length;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    const db = loadDB();
    db.streams.push({
      chatId,
      id: streamId,
      createdAt: new Date().toISOString()
    });
    saveDB(db);
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const db = loadDB();
    const chatStreams = db.streams.filter(s => s.chatId === chatId);
    chatStreams.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return chatStreams.map(s => s.id);
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}
