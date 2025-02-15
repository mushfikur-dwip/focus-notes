
import { useState, useEffect } from "react";
import { Bold, Italic, Underline, Save, Download, Moon, Sun, LogIn, PlusSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { auth, provider } from "@/lib/firebase";
import { signInWithPopup, signOut, User } from "firebase/auth";
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

const Editor = () => {
  const [content, setContent] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadNotes(user);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadNotes = async (user: User) => {
    try {
      // Here we'll implement Google Drive API calls to list files
      // This is a placeholder for now
      toast("Loading notes from Google Drive...");
    } catch (error) {
      toast("Error loading notes");
    }
  };

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || "";
    setContent(newContent);
  };

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      name: `Note ${notes.length + 1}`,
      content: "",
      lastModified: new Date()
    };
    setNotes([newNote, ...notes]);
    setCurrentNote(newNote);
    setContent("");
    toast("New note created");
  };

  const handleSave = async () => {
    if (!user) {
      toast("Please sign in to save");
      return;
    }
    try {
      // Here we'll implement Google Drive API save functionality
      toast("Saving to Google Drive...");
    } catch (error) {
      toast("Error saving to Google Drive");
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
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
      toast("Signed out successfully");
    } catch (error) {
      toast("Error signing out");
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
          {user && (
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
                  <SheetTitle>Your Notes</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer rounded"
                      onClick={() => {
                        setCurrentNote(note);
                        setContent(note.content);
                      }}
                    >
                      <h3 className="font-medium">{note.name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(note.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
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
          contentEditable
          className={cn(
            "outline-none mt-16 prose prose-lg max-w-none transition-colors duration-300 font-merriweather",
            isDark ? "prose-invert" : "prose-slate",
            "focus:ring-0"
          )}
          onInput={handleContentChange}
          dir="ltr"
          spellCheck="true"
          suppressContentEditableWarning
        >
          {content}
        </div>
      </div>
    </div>
  );
};

export default Editor;
