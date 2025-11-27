"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Load Monaco Editor
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function Page() {
  // ==================================================
  // DEFAULT TEMPLATES
  // ==================================================
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

  // ==================================================
  // STATE
  // ==================================================
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(defaultCode["python"]);
  const [output, setOutput] = useState("Output will appear here...");

  const [showDialog, setShowDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

  // SUCCESS POPUP
  const [showSuccess, setShowSuccess] = useState(false);

  // ==================================================
  // LOAD LAST SESSION (localStorage)
  // ==================================================
  useEffect(() => {
    const savedLang = localStorage.getItem("ps-language");
    const savedCode = localStorage.getItem("ps-code");

    if (savedLang && savedCode) {
      setLanguage(savedLang);
      setCode(savedCode);
    }
  }, []);

  // ==================================================
  // SAVE TO LOCALSTORAGE + SUCCESS MESSAGE
  // ==================================================
  const saveToLocal = () => {
    localStorage.setItem("ps-language", language);
    localStorage.setItem("ps-code", code);

    // Show success popup
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // ==================================================
  // CHECK UNSAVED CHANGES
  // ==================================================
  const hasUnsavedChanges = () => {
    return (
      localStorage.getItem("ps-code") !== code ||
      localStorage.getItem("ps-language") !== language
    );
  };

  // ==================================================
  // BEFORE UNLOAD (closing tab)
  // ==================================================
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

  // ==================================================
  // LANGUAGE CHANGE HANDLER (modal trigger)
  // ==================================================
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

  // ==================================================
  // MODAL ACTIONS
  // ==================================================
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

  // ==================================================
  // RUN CODE (backend compile)
  // ==================================================
  const runCode = async () => {
    setOutput("⏳ Running...");

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
    setOutput(data.output);
  };

  // ==================================================
  // DOWNLOAD LOCAL COPY
  // ==================================================
  const downloadLocal = () => {
    const extMap: Record<string, string> = {
      python: ".py",
      java: ".java",
      c: ".c",
      "c++": ".cpp",
      javascript: ".js",
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
    <div className="relative w-screen h-screen text-white">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${bgUrl}')`,
          filter: "brightness(0.35)"
        }}
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/40" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex items-center justify-center h-full px-6">
        <div className="w-full max-w-5xl rounded-2xl backdrop-blur-xl bg-white/10 p-4">

          {/* TOOLBAR */}
          <div className="flex justify-between items-center mb-4">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-white/50 text-black px-3 py-1 rounded"
            >
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="c">C</option>
              <option value="c++">C++</option>
              <option value="javascript">JavaScript</option>
            </select>

            <div className="flex gap-2">
              <button onClick={runCode} className="bg-blue-600 px-4 py-1 rounded">
                Run
              </button>
              <button onClick={saveToLocal} className="bg-gray-700 px-4 py-1 rounded">
                Save
              </button>
              <button onClick={downloadLocal} className="bg-gray-700 px-4 py-1 rounded">
                Save (Download)
              </button>
            </div>
          </div>

          {/* EDITOR + OUTPUT */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-7">
              <div className="mb-2">Editor</div>
              <Editor
                height="300px"
                language={language === "javascript" ? "javascript" : "python"}
                value={code}
                onChange={(v) => setCode(v || "")}
                theme="vs-dark"
              />
            </div>

            <div className="col-span-5">
              <div className="mb-2">Output</div>
              <div className="bg-black/70 p-3 rounded h-[300px] overflow-auto text-green-300 font-mono text-sm">
                {output}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-4 w-full text-center text-xs text-white/60">
        © 2025 Prime Studio Code Editor
      </div>

      {/* ================================
          NOTEPAD-STYLE MODAL
      ================================ */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-lg p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              Do you want to save changes?
            </h2>

            <div className="flex justify-end gap-2">
              <button
                onClick={modalSave}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Save
              </button>
              <button
                onClick={modalDontSave}
                className="bg-gray-500 text-white px-3 py-1 rounded"
              >
                Don't Save
              </button>
              <button
                onClick={modalCancel}
                className="bg-gray-300 text-black px-3 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================
          SUCCESS POPUP
      ================================ */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl animate-fade">
            Saved Successfully ✔
          </div>
        </div>
      )}
    </div>
  );
}
