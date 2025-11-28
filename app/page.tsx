"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Monaco Editor
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function Page() {
  // ---------------------- LOAD CLIQ SDK ---------------------------
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://static.zohocdn.com/cliq/js/client-sdk.js";
    script.onload = () => {
      console.log("✔ Cliq SDK loaded:", window.Zoho);
      setSdkReady(true);
    };
    script.onerror = () => {
      console.log("❌ Failed to load Cliq SDK");
    };
    document.body.appendChild(script);
  }, []);

  // ---------------------- DEFAULT CODE ---------------------------

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

  // --------------------------- STATE ------------------------------

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(defaultCode["python"]);
  const [output, setOutput] = useState("Output will appear here...");
  const [showDialog, setShowDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // ---------------------- LOAD SESSION ----------------------------

  useEffect(() => {
    const savedLang = localStorage.getItem("ps-language");
    const savedCode = localStorage.getItem("ps-code");

    if (savedLang && savedCode) {
      setLanguage(savedLang);
      setCode(savedCode);
    }
  }, []);

  // --------------------------- SAVE -------------------------------

  const saveToLocal = () => {
    localStorage.setItem("ps-language", language);
    localStorage.setItem("ps-code", code);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const hasUnsavedChanges = () => {
    return (
      localStorage.getItem("ps-code") !== code ||
      localStorage.getItem("ps-language") !== language
    );
  };

  // ----------------------- PREVENT PAGE CLOSE ---------------------

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

  // --------------------- LANGUAGE CHANGE --------------------------

  const handleLanguageChange = (newLang: string) => {
    if (!hasUnsavedChanges()) {
      setLanguage(newLang);
      setCode(defaultCode[newLang]);
      return;
    }

    setPendingLanguage(newLang);
    setShowDialog(true);
  };

  const modalSave = () => {
    saveToLocal();
    if (pendingLanguage) {
      setLanguage(pendingLanguage);
      setCode(defaultCode[pendingLanguage]);
    }
    setShowDialog(false);
  };

  const modalDontSave = () => {
    if (pendingLanguage) {
      setLanguage(pendingLanguage);
      setCode(defaultCode[pendingLanguage]);
    }
    setShowDialog(false);
  };

  const modalCancel = () => setShowDialog(false);

  // -------------------------- RUN CODE ----------------------------

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
      setOutput("🔥 Error:\n" + err.message);
    }
  };

  // ------------------ SHARE TO CHAT (CLIq SDK) ---------------------

  const shareToChat = () => {
    if (!sdkReady || !window.Zoho || !window.Zoho.Cliq) {
      alert("❌ Cliq SDK not loaded or widget not inside Zoho Cliq.");
      return;
    }

    window.Zoho.Cliq.sendMessage({
      text: "",
      card: {
        theme: "modern",
        title: `Code Snippet (${language})`,
        sections: [
          {
            type: "code",
            language: language,
            data: code
          }
        ]
      }
    });

    alert("✔ Code sent to chat!");
  };

  // ------------------------ MONACO OPTIONS ------------------------

  const editorOptions = {
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    fontSize: 15,
    lineHeight: 22
  };

  const bgUrl = "/sl_031420_28950_10.jpg";

  // ------------------------------ UI ------------------------------

  return (
    <div className="relative w-screen h-screen text-white">

      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')`, filter: "brightness(0.35)" }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Main UI */}
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
              className="bg-black/40 text-white px-4 py-2 rounded-lg border border-white/20 w-44"
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
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 flex-1 min-h-0" style={{ height: "calc(80vh - 90px)" }}>

            {/* Editor */}
            <div className="col-span-8 bg-[#0b0f12] rounded-lg p-3 flex flex-col">
              <div className="text-sm text-white/80 mb-2">Editor</div>

              <div className="flex-1 border border-white/10 rounded-md overflow-hidden">
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

              <div className="flex-1 bg-black/70 rounded-md p-3 border border-white/10 font-mono text-green-300 text-sm overflow-auto">
                {output}
              </div>

              {/* Share Buttons */}
              <div className="mt-4">
                <button onClick={shareToChat} className="w-full px-3 py-2 bg-indigo-600 rounded-md">
                  Share to Chat
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

      {/* Save Modal */}
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

      {/* Success Popup */}
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
