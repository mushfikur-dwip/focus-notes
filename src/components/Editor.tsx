import { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Download,
  Moon,
  Sun,
  PlusSquare,
  FileText,
  Trash2,
  Mic,
  MicOff,
  Cloud,
  CloudOff,
  LogOut,
  Tag,
  FolderPlus,
  Folder,
  FileDown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/hooks/useNotes";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import { AuthModal } from "@/components/AuthModal";
import { exportToTxt, exportToMarkdown, exportToHtml, exportToPdf } from "@/lib/export";

const Editor = () => {
  const { user, isAuthenticated, signOut, loading: authLoading } = useAuth();
  const {
    notes,
    folders,
    currentNote,
    loading: notesLoading,
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
  } = useNotes();
  const { isRecording, isTranscribing, toggleRecording } = useVoiceDictation();

  const [isDark, setIsDark] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // Load content when current note changes
  useEffect(() => {
    if (currentNote && editorRef.current) {
      editorRef.current.innerHTML = currentNote.content;
    }
  }, [currentNote?.id]);

  // Create first note if none exist
  useEffect(() => {
    if (!notesLoading && notes.length === 0 && !authLoading) {
      createNote();
    }
  }, [notesLoading, notes.length, authLoading]);

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML || "";
    if (currentNote) {
      updateNote(currentNote.id, { content: newContent });
    }
  };

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const handleVoiceDictation = async () => {
    const transcription = await toggleRecording();
    if (transcription && editorRef.current) {
      // Append transcription to editor
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.insertNode(document.createTextNode(transcription + " "));
        range.collapse(false);
      } else {
        editorRef.current.innerHTML += transcription + " ";
      }

      // Trigger content change
      if (currentNote) {
        updateNote(currentNote.id, { content: editorRef.current.innerHTML });
      }
    }
  };

  const handleExport = (format: "txt" | "md" | "html" | "pdf") => {
    if (!currentNote) {
      toast.error("No note selected");
      return;
    }

    const filename = currentNote.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    switch (format) {
      case "txt":
        exportToTxt(currentNote.content, filename);
        break;
      case "md":
        exportToMarkdown(currentNote.content, filename);
        break;
      case "html":
        exportToHtml(currentNote.content, filename, currentNote.name);
        break;
      case "pdf":
        exportToPdf(currentNote.content, filename, currentNote.name);
        break;
    }

    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !currentNote) return;
    addTagToNote(currentNote.id, newTag.trim());
    setNewTag("");
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName("");
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const selectNote = (note: typeof currentNote) => {
    if (!note) return;
    setCurrentNote(note);
  };

  if (authLoading || notesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300 relative",
        isDark ? "bg-gray-900" : "bg-white"
      )}
    >
      {/* Floating Toolbar */}
      <div
        className={cn(
          "fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-2 rounded-full backdrop-blur-md transition-all duration-300 z-50 border shadow-lg",
          isDark ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-gray-200",
          isToolbarVisible ? "opacity-100 translate-y-0" : "opacity-30 -translate-y-1"
        )}
        onMouseEnter={() => setIsToolbarVisible(true)}
        onMouseLeave={() => setIsToolbarVisible(false)}
      >
        {/* Notes Panel */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 rounded-full",
                isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>Notes ({notes.length})</span>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={syncToCloud}
                    disabled={syncing}
                    className="h-8"
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex gap-2">
                <Button
                  onClick={() => createNote()}
                  className="flex-1 justify-start gap-2 h-10"
                  variant="outline"
                >
                  <PlusSquare className="h-4 w-4" />
                  New Note
                </Button>
              </div>

              {/* Folders Section */}
              {isAuthenticated && folders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Folders</p>
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1">{folder.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => deleteFolder(folder.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes List */}
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer rounded-lg border transition-colors group",
                    currentNote?.id === note.id && "bg-muted/50 border-primary/50"
                  )}
                  onClick={() => selectNote(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={note.name}
                          onChange={(e) => updateNote(note.id, { name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-sm bg-transparent border-none outline-none w-full truncate"
                        />
                        {note.isLocal && (
                          <CloudOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(note.lastModified).toLocaleDateString()}
                      </p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Create Folder (Premium) */}
            {isAuthenticated && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="New folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={handleCreateFolder}>
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Formatting */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("bold")}
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("italic")}
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("underline")}
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Voice Dictation */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVoiceDictation}
          disabled={isTranscribing}
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            isRecording && "bg-red-500/20 text-red-500",
            isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {isTranscribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        {/* Tags */}
        {currentNote && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 rounded-full",
                  isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Tag className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {currentNote.tags?.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTagFromNote(currentNote.id, tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 rounded-full",
                isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport("txt")}>
              <Download className="h-4 w-4 mr-2" />
              Export as TXT
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("md")}>
              <Download className="h-4 w-4 mr-2" />
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("html")}>
              <Download className="h-4 w-4 mr-2" />
              Export as HTML
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport("pdf")}>
              <Download className="h-4 w-4 mr-2" />
              Print / Save as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Auth */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-2 rounded-full gap-1",
                  isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Cloud className="h-4 w-4 text-green-500" />
                <span className="text-xs max-w-[80px] truncate">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem disabled>
                <Cloud className="h-4 w-4 mr-2 text-green-500" />
                Cloud Sync Active
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAuthModalOpen(true)}
            className={cn(
              "h-8 px-2 rounded-full gap-1",
              isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <CloudOff className="h-4 w-4" />
            <span className="text-xs">Sign in</span>
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div
          ref={editorRef}
          contentEditable
          className={cn(
            "outline-none min-h-[calc(100vh-8rem)] text-lg leading-relaxed transition-colors duration-300",
            isDark ? "text-gray-100" : "text-gray-900",
            "focus:outline-none [&_*]:outline-none font-normal"
          )}
          onInput={handleContentChange}
          spellCheck="true"
          suppressContentEditableWarning
          style={{
            direction: "ltr",
            textAlign: "left",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            lineHeight: "1.6",
            fontSize: "18px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        />
      </div>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
};

export default Editor;
