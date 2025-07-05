import { useState, useEffect, useRef } from "react";
import { Bold, Italic, Underline, Save, Download, Moon, Sun, LogIn, PlusSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { auth, provider } from "@/lib/firebase";
import { signInWithPopup, signOut, User } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, orderBy } from "firebase/firestore";
import { NoteEncryption } from "@/lib/encryption";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Initialize Firestore
const firebaseConfig = {
  apiKey: "AIzaSyBw0PucNe-p9nsot2ZTGg4cyrD0TgDC_Ik",
  authDomain: "focus-note-40b4e.firebaseapp.com",
  projectId: "focus-note-40b4e",
  storageBucket: "focus-note-40b4e.appspot.com",
  messagingSenderId: "992811559836",
  appId: "1:992811559836:web:9b143358e56b796c04b659",
  measurementId: "G-HH2MFW6V04"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Note {
  id: string;
  name: string;
  content: string;
  lastModified: Date;
  encryptedContent?: string;
}

interface LocalStorageNote {
  id: string;
  name: string;
  content: string;
  lastModified: string;
  expiresAt: string;
}

const STORAGE_KEY = 'focusnote_local_notes';
const STORAGE_EXPIRY_DAYS = 7;

const Editor = () => {
  const [content, setContent] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Local Storage Functions
  const saveToLocalStorage = (notes: Note[]) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + STORAGE_EXPIRY_DAYS);
    
    const localNotes: LocalStorageNote[] = notes.map(note => ({
      ...note,
      lastModified: note.lastModified.toISOString(),
      expiresAt: expiryDate.toISOString()
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localNotes));
  };

  const loadFromLocalStorage = (): Note[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const localNotes: LocalStorageNote[] = JSON.parse(stored);
      const now = new Date();
      
      // Filter out expired notes
      const validNotes = localNotes.filter(note => new Date(note.expiresAt) > now);
      
      // Clean up expired notes
      if (validNotes.length !== localNotes.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validNotes));
      }
      
      return validNotes.map(note => ({
        ...note,
        lastModified: new Date(note.lastModified)
      }));
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return [];
    }
  };

  const clearExpiredLocalStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    try {
      const localNotes: LocalStorageNote[] = JSON.parse(stored);
      const now = new Date();
      const validNotes = localNotes.filter(note => new Date(note.expiresAt) > now);
      
      if (validNotes.length !== localNotes.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validNotes));
        console.log(`Cleared ${localNotes.length - validNotes.length} expired notes from localStorage`);
      }
    } catch (error) {
      console.error("Error clearing expired localStorage:", error);
    }
  };

  useEffect(() => {
    // Clear expired data on app load
    clearExpiredLocalStorage();
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadNotes(user);
      } else {
        // Load from localStorage when not authenticated
        const localNotes = loadFromLocalStorage();
        setNotes(localNotes);
        if (localNotes.length > 0) {
          toast("Local notes loaded");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-save to localStorage when notes change
  useEffect(() => {
    if (notes.length > 0) {
      saveToLocalStorage(notes);
    }
  }, [notes]);

  const loadNotes = async (user: User) => {
    try {
      const notesRef = collection(db, 'notes');
      const q = query(
        notesRef,
        where('userId', '==', user.uid),
        orderBy('lastModified', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const loadedNotes = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          let decryptedContent = '';
          
          try {
            decryptedContent = await NoteEncryption.decrypt(data.encryptedContent);
          } catch (error) {
            console.error('Error decrypting note:', error);
            decryptedContent = 'Error: Could not decrypt note';
          }
          
          return {
            id: docSnapshot.id,
            name: data.name,
            content: decryptedContent,
            lastModified: data.lastModified.toDate(),
          };
        })
      );
      
      setNotes(loadedNotes);
      toast("Notes loaded successfully");
    } catch (error) {
      console.error("Error loading notes:", error);
      toast("Error loading notes");
    }
  };

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML || "";
    setContent(newContent);
    
    // Auto-save current note to localStorage
    if (currentNote) {
      const updatedNote = {
        ...currentNote,
        content: newContent,
        lastModified: new Date()
      };
      setCurrentNote(updatedNote);
      
      const updatedNotes = notes.map(note => 
        note.id === currentNote.id ? updatedNote : note
      );
      setNotes(updatedNotes);
    }
  };

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      name: `Note ${notes.length + 1}`,
      content: "",
      lastModified: new Date()
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setCurrentNote(newNote);
    setContent("");
    toast("New note created");
  };

  const handleSave = async () => {
    if (!user || !currentNote) {
      toast("Please sign in and create a note first");
      return;
    }

    try {
      // Get the HTML content from the editor
      const htmlContent = editorRef.current?.innerHTML || content;
      const encryptedContent = await NoteEncryption.encrypt(htmlContent);
      const noteData = {
        name: currentNote.name,
        encryptedContent,
        lastModified: new Date(),
        userId: user.uid,
      };

      if (currentNote.id.length > 10) {
        // Update existing note
        const noteRef = doc(db, 'notes', currentNote.id);
        await updateDoc(noteRef, noteData);
      } else {
        // Create new note
        const docRef = await addDoc(collection(db, 'notes'), noteData);
        setCurrentNote({ ...currentNote, id: docRef.id });
      }

      toast("Note saved securely");
      loadNotes(user);
    } catch (error) {
      console.error("Error saving note:", error);
      toast("Error saving note");
    }
  };

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleDownload = () => {
    // Convert HTML to plain text for download
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    const element = document.createElement("a");
    const file = new Blob([plainText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${currentNote?.name || "untitled"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast("Document downloaded");
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful", result.user);
      toast("Signed in successfully");
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast(error.message || "Error signing in");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setContent("");
      setNotes([]);
      setCurrentNote(null);
      // Load local notes after sign out
      const localNotes = loadFromLocalStorage();
      setNotes(localNotes);
      toast("Signed out successfully");
    } catch (error) {
      toast("Error signing out");
    }
  };

  const selectNote = async (note: Note) => {
    setCurrentNote(note);
    setContent(note.content);
    // Set the HTML content in the editor
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content;
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      isDark ? "bg-slate-900" : "bg-white"
    )}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-lg backdrop-blur-lg transition-all duration-300",
            isDark ? "bg-slate-800/50" : "bg-white/50",
            isToolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}
          onMouseEnter={() => setIsToolbarVisible(true)}
          onMouseLeave={() => setIsToolbarVisible(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={createNewNote}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              isDark ? "text-white" : "text-slate-700"
            )}
          >
            <PlusSquare className="h-4 w-4" />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "hover:bg-slate-100 dark:hover:bg-slate-700",
                  isDark ? "text-white" : "text-slate-700"
                )}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>{user ? "Your Encrypted Notes" : "Your Local Notes"}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer rounded"
                    onClick={() => selectNote(note)}
                  >
                    <h3 className="font-medium">{note.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(note.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {!user && notes.length > 0 && (
                  <p className="text-xs text-gray-400 mt-4">
                    Notes stored locally for 7 days
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFormat("bold")}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              isDark ? "text-white" : "text-slate-700"
            )}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFormat("italic")}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              isDark ? "text-white" : "text-slate-700"
            )}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFormat("underline")}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              isDark ? "text-white" : "text-slate-700"
            )}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              isDark ? "text-white" : "text-slate-700"
            )}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              isDark ? "text-white" : "text-slate-700"
            )}
          >
            <Download className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              isDark ? "text-white" : "text-slate-700"
            )}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className={cn(
                "hover:bg-slate-100 dark:hover:bg-slate-700",
                isDark ? "text-white" : "text-slate-700"
              )}
            >
              <img src={user.photoURL || ""} alt="Profile" className="w-4 h-4 rounded-full" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignIn}
              className={cn(
                "hover:bg-slate-100 dark:hover:bg-slate-700",
                isDark ? "text-white" : "text-slate-700"
              )}
            >
              <LogIn className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div
          ref={editorRef}
          contentEditable
          className={cn(
            "outline-none mt-16 prose prose-lg max-w-none transition-colors duration-300 font-merriweather min-h-[600px] p-4",
            isDark ? "prose-invert" : "prose-slate",
            "focus:ring-0",
            "[&_*]:outline-none"
          )}
          onInput={handleContentChange}
          spellCheck="true"
          suppressContentEditableWarning
          style={{
            direction: 'ltr',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
        />
      </div>
    </div>
  );
};

export default Editor;
