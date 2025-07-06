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
const AUTO_SAVE_DELAY = 1000;

const Editor = () => {
  const [content, setContent] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
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
      setCurrentNote(localNotes[0]);
      setContent(localNotes[0].content);
      if (editorRef.current) {
        editorRef.current.innerHTML = localNotes[0].content;
      }
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
      "min-h-screen transition-colors duration-300 relative",
      isDark ? "bg-gray-900" : "bg-white"
    )}>
      {/* Floating Toolbar - blank.page style */}
      <div
        className={cn(
          "fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-2 rounded-full backdrop-blur-md transition-all duration-300 z-50 border shadow-lg",
          isDark ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-gray-200",
          isToolbarVisible ? "opacity-100 translate-y-0" : "opacity-30 -translate-y-1"
        )}
        onMouseEnter={() => setIsToolbarVisible(true)}
        onMouseLeave={() => setIsToolbarVisible(false)}
      >
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700",
                isDark ? "text-gray-300" : "text-gray-600"
              )}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Notes ({notes.length})</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
              <Button
                onClick={createNewNote}
                className="w-full justify-start gap-2 h-10"
                variant="outline"
              >
                <PlusSquare className="h-4 w-4" />
                New Note
              </Button>
              
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    "p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer rounded-lg border transition-colors group",
                    currentNote?.id === note.id && "bg-gray-50 dark:bg-gray-800 border-blue-200"
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
                        {new Date(note.lastModified).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {note.content.replace(/<[^>]*>/g, '').substring(0, 50)}...
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={(e) => deleteNote(note.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("bold")}
          className={cn(
            "h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700",
            isDark ? "text-gray-300" : "text-gray-600"
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("italic")}
          className={cn(
            "h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700",
            isDark ? "text-gray-300" : "text-gray-600"
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("underline")}
          className={cn(
            "h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700",
            isDark ? "text-gray-300" : "text-gray-600"
          )}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className={cn(
            "h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700",
            isDark ? "text-gray-300" : "text-gray-600"
          )}
        >
          <Download className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700",
            isDark ? "text-gray-300" : "text-gray-600"
          )}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Content Area - blank.page style */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div
          ref={editorRef}
          contentEditable
          className={cn(
            "outline-none min-h-[calc(100vh-8rem)] text-lg leading-relaxed transition-colors duration-300",
            isDark ? "text-gray-100" : "text-gray-900",
            "focus:outline-none",
            "[&_*]:outline-none",
            "font-normal"
          )}
          onInput={handleContentChange}
          spellCheck="true"
          suppressContentEditableWarning
          style={{
            direction: 'ltr',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            lineHeight: '1.6',
            fontSize: '18px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        />
      </div>
    </div>
  );
};

export default Editor;
