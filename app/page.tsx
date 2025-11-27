"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Monaco Editor (no SSR)
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function Page() {
  // DEFAULT CODE TEMPLATES
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

  // STATE
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(defaultCode["python"]);
  const [output, setOutput] = useState("Output will appear here...");
  const [showDialog, setShowDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // LOAD LAST SAVED SESSION
  useEffect(() => {
    const savedLang = localStorage.getItem("ps-language");
    const savedCode = localStorage.getItem("ps-code");

    if (savedLang && savedCode) {
      setLanguage(savedLang);
      setCode(savedCode);
    }
  }, []);

  // SAVE FUNCTION
  const saveToLocal = () => {
    localStorage.setItem("ps-language", language);
    localStorage.setItem("ps-code", code);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // UNSAVED CHANGES CHECK
  const hasUnsavedChanges = () => {
    return (
      localStorage.getItem("ps-code") !== code ||
      localStorage.getItem("ps-language") !== language
    );
  };

  // WARNING BEFORE PAGE CLOSE
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

  // LANGUAGE CHANGE HANDLER
  const handleLanguageChange = (newLang: string) => {
    if (!hasUnsavedChanges()) {
      setLanguage(newLang);

      const savedLang = localStorage.getItem("ps-language");
      const savedCode = localStorage.getItem("ps-code");

      if (savedLang === newLang && savedCode) {
        setCode(savedCode);
      } else {
        setCode(defaultCode[newLang]);
      }
      return;
    }

    setPendingLanguage(newLang);
    setShowDialog(true);
  };

  // MODAL ACTIONS
  const modalSave = () => {
    saveToLocal();
    if (pendingLanguage) {
      setLanguage(pendingLanguage);
      setCode(defaultCode[pendingLanguage]);
    }
    setPendingLanguage(null);
    setShowDialog(false);
  };

  const modalDontSave = () => {
    if (pendingLanguage) {
      setLanguage(pendingLanguage);
      setCode(defaultCode[pendingLanguage]);
    }
    setPendingLanguage(null);
    setShowDialog(false);
  };

  const modalCancel = () => {
    setPendingLanguage(null);
    setShowDialog(false);
  };

  // RUN CODE USING BACKEND
  const runCode = async () => {
    setOutput("⏳ Running...");
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code })
      });

      const data = await res.json();

      if (data.error) {
        setOutput("❌ Error:\n" + data.error);
        return;
      }

      setOutput(data.output || "(empty output)");
    } catch (err: any) {
      setOutput("🔥 Error:\n" + (err?.message ?? String(err)));
    }
  };

  // SHARE TO ZOHO CHAT (OPTION C)
  const shareToChat = async () => {
    try {
      const res = await fetch("/api/share-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          output
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Shared to Zoho Chat!");
      } else {
        alert("Failed: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // DOWNLOAD CODE
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

  // SHARE CODE / OUTPUT
  const shareCode = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Code", text: code });
      else {
        await navigator.clipboard.writeText(code);
        alert("Code Copied.");
      }
    } catch {}
  };

  const shareOutput = async () => {
    try {
      if (navigator.share)
        await navigator.share({ title: "Output", text: output });
      else {
        await navigator.clipboard.writeText(output);
        alert("Output Copied.");
      }
    } catch {}
  };

  // MONACO EDITOR OPTIONS
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

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')`, filter: "brightness(0.35)" }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* MAIN */}
      <div className="relative z-10 flex items-center justify-center h-full px-6">
        <div
          className="w-full max-w-6xl rounded-2xl shadow-2xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden"
          style={{ height: "80vh" }}
        >

          {/* TOOLBAR */}
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
              <button onClick={downloadLocal} className="px-4 py-2 bg-gray-700 rounded-md">Save (Download)</button>
            </div>
          </div>

          {/* GRID LAYOUT */}
          <div
            className="grid grid-cols-12 gap-4 px-6 py-4 flex-1 min-h-0"
            style={{ height: "calc(80vh - 90px)" }}
          >

            {/* EDITOR */}
            <div className="col-span-8 flex flex-col bg-[#0b0f12] rounded-lg p-3 flex-1 min-h-0">
              <div className="text-sm text-white/80 mb-2">Editor</div>

              <div className="flex-1 min-h-0 border border-white/10 rounded-md overflow-hidden">
                <Editor
                  height="100%"
                  language={
                    language === "javascript"
                      ? "javascript"
                      : language === "c++"
                      ? "cpp"
                      : language
                  }
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  theme="vs-dark"
                  options={editorOptions}
                />
              </div>
            </div>

            {/* OUTPUT */}
            <div className="col-span-4 flex flex-col">
              <div className="text-sm text-white/80 mb-2">Output</div>

              <div className="flex-1 min-h-0 bg-black/70 rounded-md p-3 border border-white/10 font-mono text-green-300 text-sm overflow-auto">
                {output}
              </div>

              {/* SHARE BUTTONS */}
              <div className="mt-4 flex gap-3">
                <button onClick={shareToChat} className="flex-1 px-3 py-2 bg-indigo-600 rounded-md">
                  Share to chat
                </button>
                <button onClick={shareCode} className="flex-1 px-3 py-2 bg-emerald-600 rounded-md">
                  Share code
                </button>
                <button onClick={shareOutput} className="flex-1 px-3 py-2 bg-slate-600 rounded-md">
                  Share output
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-4 w-full text-center text-xs text-white/60">
        © 2025 Prime Studio Code Editor
      </div>

      {/* SAVE CONFIRMATION MODAL */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-lg p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Do you want to save changes?</h2>

            <div className="flex justify-end gap-2">
              <button onClick={modalSave} className="bg-blue-600 text-white px-3 py-1 rounded">
                Save
              </button>
              <button onClick={modalDontSave} className="bg-gray-500 text-white px-3 py-1 rounded">
                Don't Save
              </button>
              <button onClick={modalCancel} className="bg-gray-300 px-3 py-1 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE SUCCESS POPUP */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl animate-fade">
            Saved Successfully ✔
          </div>
        </div>
      )}
    </div>
  );
}
