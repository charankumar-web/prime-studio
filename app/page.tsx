"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// Monaco Editor without SSR
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function Page() {
  // ----------------------------
  // Default templates
  // ----------------------------
  const defaultCode: Record<string, string> = {
    python: `print("Hello, world!")`,
    javascript: `console.log("Hello, world!");`,
    java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
    }
}`,
    c: `#include <stdio.h>

int main() {
    printf("Hello, world!");
    return 0;
}`,
    "c++": `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, world!";
    return 0;
}`
  };

  // ----------------------------
  // State
  // ----------------------------
  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>(defaultCode["python"]);
  const [output, setOutput] = useState<string>("Output will appear here...");
  const [savedData, setSavedData] = useState<{ language: string; code: string }>({
    language: "",
    code: ""
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const isSavingRef = useRef(false);

  // Helper: detect unsaved changes
  const hasUnsavedChanges = (): boolean => {
    return isLoaded && (code !== (savedData.code ?? "") || language !== (savedData.language ?? ""));
  };

  // ----------------------------
  // Load saved code on mount
  // ----------------------------
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/save");
        if (!res.ok) {
          // If endpoint missing or returns error, keep defaults
          setIsLoaded(true);
          return;
        }
        const data = await res.json();
        if (!mounted) return;

        if (data && data.code && data.code.trim() !== "") {
          setLanguage(data.language || "python");
          setCode(data.code);
          setSavedData({ language: data.language || "python", code: data.code });
        } else {
          // No saved code -> keep default based on default language
          setLanguage((data?.language as string) || "python");
          // If server only provides language but no code, show default
          setCode(defaultCode[(data?.language as string) || "python"]);
        }
      } catch (err) {
        // ignore, keep defaults
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Before unload: warn if unsaved
  // ----------------------------
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [code, language, savedData, isLoaded]);

  // ----------------------------
  // Run code (uses your compile endpoint)
  // ----------------------------
  const runCode = async () => {
    try {
      setOutput("⏳ Running...");
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code })
      });
      const data = await res.json();
      if (data.error) return setOutput("❌ Error:\n" + data.error);
      setOutput(data.output || "(empty output)");
    } catch (err: any) {
      setOutput("🔥 Failed to run:\n" + (err?.message ?? String(err)));
    }
  };

  // ----------------------------
  // Save to server
  // ----------------------------
  const saveCodeToServer = async () => {
    try {
      isSavingRef.current = true;
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedData({ language, code });
        alert("Saved to server.");
      } else {
        alert("Save failed: " + (data.error || "unknown"));
      }
    } catch (err: any) {
      alert("Save failed: " + (err?.message ?? String(err)));
    } finally {
      isSavingRef.current = false;
    }
  };

  // ----------------------------
  // Language change with unsaved prompt
  // ----------------------------
  const handleLanguageChange = async (newLang: string) => {
    // If nothing loaded yet, just set
    if (!isLoaded) {
      setLanguage(newLang);
      setCode(defaultCode[newLang]);
      return;
    }

    if (!hasUnsavedChanges()) {
      setLanguage(newLang);
      // load last saved for that language if server savedData matches, else default
      if (savedData.language === newLang && savedData.code) {
        setCode(savedData.code);
      } else {
        setCode(defaultCode[newLang]);
      }
      return;
    }

    // There are unsaved changes -> prompt user
    const doSave = confirm("You have unsaved changes. Press OK to SAVE, Cancel to DISCARD.");
    if (doSave) {
      await saveCodeToServer();
      // after save, switch language
      setLanguage(newLang);
      // load saved for the new language if exists, else default
      if (savedData.language === newLang && savedData.code) {
        setCode(savedData.code);
      } else {
        setCode(defaultCode[newLang]);
      }
    } else {
      // user chose cancel in confirm -> we treat as discard (per above message)
      const discard = confirm("Discard changes and switch language? Press OK to discard, Cancel to stay.");
      if (discard) {
        setLanguage(newLang);
        if (savedData.language === newLang && savedData.code) {
          setCode(savedData.code);
        } else {
          setCode(defaultCode[newLang]);
        }
      } else {
        // user canceled -> do nothing (stay on same language)
      }
    }
  };

  // ----------------------------
  // Save-as-download (optional) kept for compatibility
  // ----------------------------
  const downloadLocalCopy = () => {
    const extMap: Record<string, string> = {
      python: ".py",
      java: ".java",
      c: ".c",
      "c++": ".cpp",
      javascript: ".js"
    };
    const ext = extMap[language] || ".txt";
    const blob = new Blob([code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "code" + ext;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const bgUrl = "/sl_031420_28950_10.jpg";

  return (
    <div
      className="relative w-screen h-screen overflow-hidden text-white"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${bgUrl}')`,
          filter: "brightness(0.35) contrast(1.05)"
        }}
      />

      {/* Dark Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(2,6,23,0.2), rgba(2,6,23,0.55))"
        }}
      />

      {/* Main */}
      <div className="relative z-10 flex items-center justify-center h-full px-6">
        <div
          className="w-full max-w-5xl rounded-2xl shadow-2xl backdrop-blur-md bg-gradient-to-r from-white/6 to-white/3 border border-white/10 overflow-hidden"
          style={{ minHeight: 420 }}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />

              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="ml-4 bg-white/50 text-sm text-gray-700 rounded-md px-2 py-1 backdrop-blur-md focus:outline-none"
              >
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="c++">C++</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runCode}
                className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm"
              >
                Run
              </button>
              <button
                onClick={saveCodeToServer}
                className="px-3 py-1 rounded-md bg-gray-800/60 hover:bg-gray-800/50 text-white text-sm"
              >
                Save
              </button>
              <button
                onClick={downloadLocalCopy}
                className="px-3 py-1 rounded-md bg-gray-700/50 hover:bg-gray-700/40 text-white text-sm"
              >
                Save (Download)
              </button>
            </div>
          </div>

          {/* Editor + Output */}
          <div className="grid grid-cols-12 gap-4 p-4" style={{ minHeight: 360 }}>
            <div className="col-span-7 flex flex-col">
              <div className="text-sm text-white/80 mb-2">Editor</div>

              <Editor
                height="300px"
                language={language === "javascript" ? "javascript" : "python"}
                value={code}
                onChange={(v) => setCode(v || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  automaticLayout: true
                }}
              />
            </div>

            <div className="col-span-5 flex flex-col">
              <div className="text-sm text-white/80 mb-2">Output Terminal</div>

              <div className="flex-1 min-h-0">
                <div
                  className="h-full w-full p-3 font-mono text-sm rounded-md bg-black/60 text-green-300 overflow-auto border border-white/6"
                  style={{ minHeight: 200 }}
                >
                  {output}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => alert("shareToChat placeholder")}
                  className="flex-1 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                >
                  Share to chat
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (navigator.share) await navigator.share({ title: "Code", text: code });
                      else {
                        await navigator.clipboard.writeText(code);
                        alert("Code copied.");
                      }
                    } catch (e: any) {
                      alert("Share failed: " + e.message);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
                >
                  Share code
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (navigator.share) await navigator.share({ title: "Output", text: output });
                      else {
                        await navigator.clipboard.writeText(output);
                        alert("Output copied.");
                      }
                    } catch (e: any) {
                      alert("Share failed: " + e.message);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-md bg-slate-600 hover:bg-slate-500 text-white text-sm"
                >
                  Share output
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-white/60 z-20">
        © 2025 Prime Studio Code Editor
      </div>
    </div>
  );
}
