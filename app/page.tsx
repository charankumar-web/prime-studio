"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Load Monaco (no SSR)
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function Page() {
  // ---------- DEFAULT CODE ----------
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

  // ---------- STATES ----------
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(defaultCode["python"]);
  const [output, setOutput] = useState("Output will appear here...");
  const [showDialog, setShowDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // --------------------------------------------------
  // 🔥 LOAD FILE USING URL PARAMETERS (CORRECT METHOD)
  // --------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const fileId = params.get("file_id");
    const fileName = params.get("file_name");

    if (fileId && fileName) {
      const loadFile = async () => {
        try {
          const zcl = (window as any).zohocliq;

          const fileContent = await zcl.request({
            url: `https://cliq.zoho.com/api/v2/attachments/${fileId}`,
            method: "GET",
            connect: "cliq_oauth_connection"
          });

          // Detect language safely
          const ext = fileName.split(".").pop() || "";
          const map: Record<string, string> = {
            py: "python",
            js: "javascript",
            java: "java",
            c: "c",
            cpp: "c++"
          };

          // TS-SAFE FIX 🔥
          const lang = map[ext] || "python";

          setLanguage(lang);
          setCode(fileContent);
          setOutput("📁 Loaded from Zoho Cliq");
        } catch (err) {
          console.error("Attachment loading failed:", err);
          setOutput("❌ Failed to load file from Zoho Cliq.");
        }
      };

      loadFile();
    }
  }, []);

  // ---------- LOAD SAVED SESSION ----------
  useEffect(() => {
    const savedLang = localStorage.getItem("ps-language");
    const savedCode = localStorage.getItem("ps-code");

    if (savedLang && savedCode) {
      setLanguage(savedLang);
      setCode(savedCode);
    }
  }, []);

  // ---------- SAVE ----------
  const saveToLocal = () => {
    localStorage.setItem("ps-language", language);
    localStorage.setItem("ps-code", code);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // ---------- UNSAVED CHANGES ----------
  const hasUnsavedChanges = () => {
    return (
      localStorage.getItem("ps-code") !== code ||
      localStorage.getItem("ps-language") !== language
    );
  };

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

  // ---------- LANGUAGE CHANGE ----------
  const handleLanguageChange = (newLang: string) => {
    if (!hasUnsavedChanges()) {
      setLanguage(newLang);
      setCode(defaultCode[newLang]);
      return;
    }

    setPendingLanguage(newLang);
    setShowDialog(true);
  };

  // ---------- MODAL ----------
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

  // ---------- RUN CODE ----------
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
      } else {
        setOutput(data.output || "(empty output)");
      }
    } catch (err: any) {
      setOutput("🔥 Error:\n" + err.message);
    }
  };

  // ---------- SHARE ----------
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

  // ---------- DOWNLOAD ----------
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

  // ---------- EDITOR OPTIONS ----------
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
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')`, filter: "brightness(0.35)" }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex items-center justify-center h-full px-6">
        <div
          className="w-full max-w-6xl rounded-2xl shadow-2xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden"
          style={{ height: "80vh" }}
        >
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
              <button onClick={runCode} className="px-4 py-2 bg-blue-600 rounded-md">
                Run
              </button>
              <button onClick={saveToLocal} className="px-4 py-2 bg-gray-700 rounded-md">
                Save
              </button>
              <button onClick={downloadLocal} className="px-4 py-2 bg-gray-700 rounded-md">
                Save (Download)
              </button>
            </div>
          </div>

          <div
            className="grid grid-cols-12 gap-4 px-6 py-4 flex-1 min-h-0"
            style={{ height: "calc(80vh - 90px)" }}
          >
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

      {/* Success Popup */}
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
