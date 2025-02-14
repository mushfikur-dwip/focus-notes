
import { useState, useEffect } from "react";
import { Bold, Italic, Underline, Save, Download, Moon, Sun, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Editor = () => {
  const [content, setContent] = useState(() => localStorage.getItem("content") || "");
  const [isDark, setIsDark] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  useEffect(() => {
    localStorage.setItem("content", content);
  }, [content]);

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
  };

  const handleSave = () => {
    localStorage.setItem("content", content);
    toast("Content saved successfully");
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "focus-notes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast("Document downloaded");
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    setContent(newContent);
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
        </div>

        <div
          contentEditable
          className={cn(
            "outline-none mt-16 prose prose-lg max-w-none transition-colors duration-300 font-merriweather",
            isDark ? "prose-invert" : "prose-slate",
            "focus:ring-0"
          )}
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: content }}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
};

export default Editor;
