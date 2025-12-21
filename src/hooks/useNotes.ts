import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface Note {
  id: string;
  name: string;
  content: string;
  tags: string[];
  folder_id: string | null;
  lastModified: Date;
  isLocal?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  created_at: Date;
}

interface LocalStorageNote {
  id: string;
  name: string;
  content: string;
  tags: string[];
  folder_id: string | null;
  lastModified: string;
  expiresAt: string;
}

const STORAGE_KEY = "focusnote_local_notes";
const STORAGE_EXPIRY_DAYS = 7;
const AUTO_SAVE_DELAY = 1000;

export function useNotes() {
  const { user, isAuthenticated } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Local Storage Functions
  const saveToLocalStorage = (notes: Note[]) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + STORAGE_EXPIRY_DAYS);

    const localNotes: LocalStorageNote[] = notes.map((note) => ({
      id: note.id,
      name: note.name,
      content: note.content,
      tags: note.tags || [],
      folder_id: note.folder_id,
      lastModified: note.lastModified.toISOString(),
      expiresAt: expiryDate.toISOString(),
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(localNotes));
  };

  const loadFromLocalStorage = (): Note[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const localNotes: LocalStorageNote[] = JSON.parse(stored);
      const now = new Date();

      const validNotes = localNotes.filter(
        (note) => new Date(note.expiresAt) > now
      );

      if (validNotes.length !== localNotes.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validNotes));
      }

      return validNotes.map((note) => ({
        ...note,
        lastModified: new Date(note.lastModified),
        isLocal: true,
      }));
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return [];
    }
  };

  // Cloud Functions
  const loadFromCloud = async (): Promise<Note[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading from cloud:", error);
      return [];
    }

    return (data || []).map((note) => ({
      id: note.id,
      name: note.title,
      content: note.content || "",
      tags: note.tags || [],
      folder_id: note.folder_id,
      lastModified: new Date(note.updated_at),
      isLocal: false,
    }));
  };

  const saveToCloud = async (note: Note) => {
    if (!user) return;

    const { error } = await supabase.from("notes").upsert({
      id: note.id,
      user_id: user.id,
      title: note.name,
      content: note.content,
      tags: note.tags,
      folder_id: note.folder_id,
      updated_at: note.lastModified.toISOString(),
    });

    if (error) {
      console.error("Error saving to cloud:", error);
      throw error;
    }
  };

  const deleteFromCloud = async (noteId: string) => {
    if (!user) return;

    const { error } = await supabase.from("notes").delete().eq("id", noteId);

    if (error) {
      console.error("Error deleting from cloud:", error);
      throw error;
    }
  };

  // Folder Functions
  const loadFolders = async (): Promise<Folder[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error loading folders:", error);
      return [];
    }

    return (data || []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      created_at: new Date(folder.created_at),
    }));
  };

  const createFolder = async (name: string): Promise<Folder | null> => {
    if (!user) {
      toast.error("Please sign in to create folders");
      return null;
    }

    const { data, error } = await supabase
      .from("folders")
      .insert({ user_id: user.id, name })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create folder");
      return null;
    }

    const newFolder = {
      id: data.id,
      name: data.name,
      created_at: new Date(data.created_at),
    };

    setFolders((prev) => [...prev, newFolder]);
    toast.success("Folder created");
    return newFolder;
  };

  const deleteFolder = async (folderId: string) => {
    if (!user) return;

    const { error } = await supabase.from("folders").delete().eq("id", folderId);

    if (error) {
      toast.error("Failed to delete folder");
      return;
    }

    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    toast.success("Folder deleted");
  };

  // Auto-save function
  const autoSave = (updatedNotes: Note[], noteToSave?: Note) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      // Always save to local storage
      saveToLocalStorage(updatedNotes);

      // If authenticated, also save to cloud
      if (isAuthenticated && noteToSave && !noteToSave.isLocal) {
        try {
          await saveToCloud(noteToSave);
          console.log("Auto-saved to cloud");
        } catch (error) {
          console.error("Cloud save failed:", error);
        }
      }
    }, AUTO_SAVE_DELAY);
  };

  // Sync local notes to cloud
  const syncToCloud = async () => {
    if (!user) {
      toast.error("Please sign in to sync");
      return;
    }

    setSyncing(true);
    try {
      const localNotes = notes.filter((n) => n.isLocal);

      for (const note of localNotes) {
        await saveToCloud({ ...note, isLocal: false });
      }

      // Reload from cloud
      const cloudNotes = await loadFromCloud();
      setNotes(cloudNotes);

      // Clear local storage after sync
      localStorage.removeItem(STORAGE_KEY);

      toast.success(`Synced ${localNotes.length} notes to cloud`);
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Load notes on mount or auth change
  useEffect(() => {
    const loadNotes = async () => {
      setLoading(true);

      if (isAuthenticated) {
        const cloudNotes = await loadFromCloud();
        const cloudFolders = await loadFolders();
        setNotes(cloudNotes);
        setFolders(cloudFolders);

        if (cloudNotes.length > 0) {
          setCurrentNote(cloudNotes[0]);
        }
      } else {
        const localNotes = loadFromLocalStorage();
        setNotes(localNotes);

        if (localNotes.length > 0) {
          setCurrentNote(localNotes[0]);
        }
      }

      setLoading(false);
    };

    loadNotes();

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user?.id]);

  const createNote = async (folderId?: string) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      name: `Note ${notes.length + 1}`,
      content: "",
      tags: [],
      folder_id: folderId || null,
      lastModified: new Date(),
      isLocal: !isAuthenticated,
    };

    if (isAuthenticated) {
      try {
        await saveToCloud(newNote);
      } catch (error) {
        toast.error("Failed to create note");
        return null;
      }
    }

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setCurrentNote(newNote);

    if (!isAuthenticated) {
      saveToLocalStorage(updatedNotes);
    }

    toast.success("New note created");
    return newNote;
  };

  const updateNote = (noteId: string, updates: Partial<Note>) => {
    const updatedNote = notes.find((n) => n.id === noteId);
    if (!updatedNote) return;

    const newNote = {
      ...updatedNote,
      ...updates,
      lastModified: new Date(),
    };

    const updatedNotes = notes.map((note) =>
      note.id === noteId ? newNote : note
    );

    setNotes(updatedNotes);

    if (currentNote?.id === noteId) {
      setCurrentNote(newNote);
    }

    autoSave(updatedNotes, newNote);
  };

  const deleteNote = async (noteId: string) => {
    const noteToDelete = notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;

    if (isAuthenticated && !noteToDelete.isLocal) {
      try {
        await deleteFromCloud(noteId);
      } catch (error) {
        toast.error("Failed to delete note");
        return;
      }
    }

    const updatedNotes = notes.filter((note) => note.id !== noteId);
    setNotes(updatedNotes);

    if (currentNote?.id === noteId) {
      if (updatedNotes.length > 0) {
        setCurrentNote(updatedNotes[0]);
      } else {
        setCurrentNote(null);
      }
    }

    if (!isAuthenticated) {
      saveToLocalStorage(updatedNotes);
    }

    toast.success("Note deleted");
  };

  const addTagToNote = (noteId: string, tag: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const newTags = [...(note.tags || []), tag].filter(
      (t, i, arr) => arr.indexOf(t) === i
    );
    updateNote(noteId, { tags: newTags });
  };

  const removeTagFromNote = (noteId: string, tag: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const newTags = (note.tags || []).filter((t) => t !== tag);
    updateNote(noteId, { tags: newTags });
  };

  return {
    notes,
    folders,
    currentNote,
    loading,
    syncing,
    setCurrentNote,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    deleteFolder,
    syncToCloud,
    addTagToNote,
    removeTagFromNote,
  };
}
