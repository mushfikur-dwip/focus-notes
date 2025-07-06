
import { useState, useEffect, useRef } from "react";
import { Bold, Italic, Underline, Download, Moon, Sun, PlusSquare, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Note {
  id: string;
  name: string;
  content: string;
  lastModified: Date;
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
const AUTO_SAVE_DELAY = 1000; // 1 second

const Editor = () => {
  const [content, setContent] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

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

  const autoSave = (updatedNotes: Note[]) => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveToLocalStorage(updatedNotes);
      console.log("Auto-saved notes to localStorage");
    }, AUTO_SAVE_DELAY);
  };

  useEffect(() => {
    // Clear expired data and load notes on app load
    clearExpiredLocalStorage();
    const localNotes = loadFromLocalStorage();
    setNotes(localNotes);
    
    if (localNotes.length > 0) {
      toast.success("Notes loaded from local storage");
    } else {
      // Create first note if no notes exist
      createNewNote();
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML || "";
    setContent(newContent);
    
    // Auto-save current note
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
      autoSave(updatedNotes);
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
    
    // Clear editor content
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    
    autoSave(updatedNotes);
    toast.success("New note created");
  };

  const deleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
    
    // If deleting current note, switch to another note or create new one
    if (currentNote?.id === noteId) {
      if (updatedNotes.length > 0) {
        selectNote(updatedNotes[0]);
      } else {
        setCurrentNote(null);
        setContent("");
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
        createNewNote();
      }
    }
    
    autoSave(updatedNotes);
    toast.success("Note deleted");
  };

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleDownload = () => {
    if (!currentNote) {
      toast.error("No note selected");
      return;
    }

    // Convert HTML to plain text for download
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    const element = document.createElement("a");
    const file = new Blob([plainText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${currentNote.name || "untitled"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Document downloaded");
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const selectNote = (note: Note) => {
    setCurrentNote(note);
    setContent(note.content);
    // Set the HTML content in the editor
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content;
    }
  };

  const updateNoteName = (noteId: string, newName: string) => {
    const updatedNotes = notes.map(note => 
      note.id === noteId 
        ? { ...note, name: newName, lastModified: new Date() }
        : note
    );
    setNotes(updatedNotes);
    
    if (currentNote?.id === noteId) {
      setCurrentNote({ ...currentNote, name: newName, lastModified: new Date() });
    }
    
    autoSave(updatedNotes);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      isDark ? "bg-slate-900" : "bg-white"
    )}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-lg backdrop-blur-lg transition-all duration-300 z-50",
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
                <SheetTitle>Your Notes ({notes.length})</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      "p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer rounded-lg border transition-colors group",
                      currentNote?.id === note.id && "bg-slate-100 dark:bg-slate-700"
                    )}
                    onClick={() => selectNote(note)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={note.name}
                          onChange={(e) => updateNoteName(note.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-sm bg-transparent border-none outline-none w-full truncate"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(note.lastModified).toLocaleDateString()} • 
                          {new Date(note.lastModified).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {note.content.replace(/<[^>]*>/g, '').substring(0, 50)}...
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-red-500 hover:text-red-700"
                        onClick={(e) => deleteNote(note.id, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-center text-gray-500 mt-8">
                    No notes yet. Create your first note!
                  </p>
                )}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-400 text-center">
                    Notes are stored locally for 7 days
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          
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
        </div>

        <div className="mt-16">
          {currentNote && (
            <div className="mb-4">
              <h1 className={cn(
                "text-2xl font-bold",
                isDark ? "text-white" : "text-slate-900"
              )}>
                {currentNote.name}
              </h1>
              <p className={cn(
                "text-sm",
                isDark ? "text-slate-400" : "text-slate-600"
              )}>
                Last modified: {new Date(currentNote.lastModified).toLocaleString()}
              </p>
            </div>
          )}
          
          <div
            ref={editorRef}
            contentEditable
            className={cn(
              "outline-none prose prose-lg max-w-none transition-colors duration-300 font-merriweather min-h-[600px] p-6 rounded-lg border",
              isDark ? "prose-invert bg-slate-800 border-slate-700" : "prose-slate bg-white border-slate-200",
              "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "[&_*]:outline-none"
            )}
            onInput={handleContentChange}
            spellCheck="true"
            suppressContentEditableWarning
            placeholder="Start writing your note..."
            style={{
              direction: 'ltr',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Editor;
