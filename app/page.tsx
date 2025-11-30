"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Load Monaco Editor (no SSR)
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function Page() {
  // Default templates for each language
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

  // Component state
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(defaultCode["python"]);
  const [output, setOutput] = useState("Output will appear here...");
  const [showDialog, setShowDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load previously saved language & its code on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("ps-language");
    if (savedLang) {
      const savedCode = localStorage.getItem(`ps-code-${savedLang}`);
      setLanguage(savedLang);
      setCode(savedCode ?? defaultCode[savedLang]);
    }
  }, []);

  // Save current language + code to localStorage
  const saveToLocal = () => {
    localStorage.setItem("ps-language", language);
    localStorage.setItem(`ps-code-${language}`, code);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // Detect unsaved changes for the CURRENT language only (fixed)
  const hasUnsavedChanges = () => {
    const saved = localStorage.getItem(`ps-code-${language}`);
    // If nothing saved yet for this language, compare against default template.
    if (saved === null) {
      return code !== defaultCode[language];
    }
    // If saved exists, compare saved vs current
    return saved !== code;
  };

  // Prompt before page unload when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [code, language]);

  // Handle language change, show modal only if code was edited for current language
  const handleLanguageChange = (newLang: string) => {
    if (newLang === language) return;

    if (!hasUnsavedChanges()) {
      localStorage.setItem("ps-language", newLang);
      const savedCode = localStorage.getItem(`ps-code-${newLang}`);
      setLanguage(newLang);
      setCode(savedCode ?? defaultCode[newLang]);
      return;
    }

    setPendingLanguage(newLang);
    setShowDialog(true);
  };

  // Modal action: save current language then switch
  const modalSave = () => {
    saveToLocal();
    if (pendingLanguage) {
      const newLang = pendingLanguage;
      const savedCode = localStorage.getItem(`ps-code-${newLang}`);
      setLanguage(newLang);
      setCode(savedCode ?? defaultCode[newLang]);
    }
    setPendingLanguage(null);
    setShowDialog(false);
  };

  // Modal action: don't save current language, just switch
  const modalDontSave = () => {
    if (pendingLanguage) {
      const newLang = pendingLanguage;
      const savedCode = localStorage.getItem(`ps-code-${newLang}`);
      setLanguage(newLang);
      setCode(savedCode ?? defaultCode[newLang]);
    }
    setPendingLanguage(null);
    setShowDialog(false);
  };

  // Modal action: cancel switching
  const modalCancel = () => {
    setPendingLanguage(null);
    setShowDialog(false);
  };

  // Run code via backend API
  const runCode = async () => {
    setOutput("⏳ Running...");
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code })
      });
      const data = await res.json();
      setOutput(data.error ? "❌ Error:\n" + data.error : data.output || "(empty output)");
    } catch (err: any) {
      setOutput("🔥 Error:\n" + (err?.message ?? String(err)));
    }
  };

  // Share functions (Zoho or local share)
  const shareToChat = async () => {
    const res = await fetch("/api/share-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "full", code, language, output })
    });
    const data = await res.json();
    alert(data.success ? "Shared successfully!" : "Failed to share!");
  };

  const shareCodeToChat = async () => {
    const res = await fetch("/api/share-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "code", code, language })
    });
    const data = await res.json();
    alert(data.success ? "Code shared!" : "Failed to share!");
  };

  const shareOutputToChat = async () => {
    const res = await fetch("/api/share-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "output", output, language })
    });
    const data = await res.json();
    alert(data.success ? "Output shared!" : "Failed to share!");
  };

  // Download code file
  const downloadLocal = () => {
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

  // Monaco editor options
  const editorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    automaticLayout: true
  };

  const bgUrl = "/sl_031420_28950_10.jpg";

  return (
    <div className="relative w-screen h-screen text-white">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')`, filter: "brightness(0.35)" }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Main */}
      <div className="relative z-10 flex items-center justify-center h-full px-6">
        <div
          className="w-full max-w-6xl rounded-2xl shadow-2xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden"
          style={{ height: "80vh" }}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-black/40 text-white px-4 py-2 rounded-lg border border-white/20 w-44 text-sm"
            >
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="c">C</option>
              <option value="c++">C++</option>
              <option value="javascript">JavaScript</option>
            </select>

            <div className="flex gap-3">
              <button onClick={runCode} className="px-4 py-2 bg-blue-600 rounded-md">Run</button>
              <button onClick={saveToLocal} className="px-4 py-2 bg-gray-700 rounded-md">Save</button>
              <button onClick={downloadLocal} className="px-4 py-2 bg-gray-700 rounded-md">Download</button>
            </div>
          </div>

          {/* Grid layout */}
          <div
            className="grid grid-cols-12 gap-4 px-6 py-4 flex-1 min-h-0"
            style={{ height: "calc(80vh - 90px)" }}
          >
            {/* Editor */}
            <div className="col-span-8 flex flex-col bg-[#0b0f12] rounded-lg p-3 flex-1 min-h-0">
              <div className="text-sm text-white/80 mb-2">Editor</div>
              <div className="flex-1 min-h-0 border border-white/10 rounded-md overflow-hidden">
                <Editor
                  height="100%"
                  language={language === "c++" ? "cpp" : language}
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  theme="vs-dark"
                  options={editorOptions}
                />
              </div>
            </div>

            {/* Output */}
            <div className="col-span-4 flex flex-col">
              <div className="text-sm text-white/80 mb-2">Output</div>
              <div className="flex-1 min-h-0 bg-black/70 rounded-md p-3 border border-white/10 font-mono text-green-300 text-sm overflow-auto">
                {output}
              </div>

              <div className="mt-4 flex gap-3">
                <button onClick={shareToChat} className="flex-1 px-3 py-2 bg-indigo-600 rounded-md">
                  Share to chat
                </button>
                <button onClick={shareCodeToChat} className="flex-1 px-3 py-2 bg-emerald-600 rounded-md">
                  Share code
                </button>
                <button onClick={shareOutputToChat} className="flex-1 px-3 py-2 bg-slate-600 rounded-md">
                  Share output
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 w-full text-center text-xs text-white/60">
        © 2025 Prime Studio Code Editor
      </div>

      {/* Save confirmation modal */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-lg p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Do you want to save changes?</h2>
            <div className="flex justify-end gap-2">
              <button onClick={modalSave} className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
              <button onClick={modalDontSave} className="bg-gray-500 text-white px-3 py-1 rounded">Don't Save</button>
              <button onClick={modalCancel} className="bg-gray-300 px-3 py-1 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Save success popup */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl">
            Saved Successfully ✔
          </div>
        </div>
      )}
    </div>
  );
}
