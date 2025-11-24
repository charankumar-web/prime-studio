'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Monaco editor client-only
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

/* ---------------------------------------------------
   REQUIRE REAL ZOHO CLIQ SDK (NO LOCAL MOCK)
--------------------------------------------------- */
const cliq =
  typeof window !== 'undefined' && (window as any).$cliq
    ? (window as any).$cliq
    : null;

/* ---------------------------------------------------
   STARTER CODE TEMPLATES
--------------------------------------------------- */
const languageTemplates: Record<string, string> = {
  javascript: `// JavaScript Starter
console.log("Hello from JavaScript!");`,

  python: `# Python Starter
print("Hello from Python!")`,

  c: `#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    return 0;
}
`,

  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    return 0;
}
`,

  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
`,
};

const personalDefaultFor = (lang: string) => languageTemplates[lang];

/* ---------------------------------------------------
   PAGE COMPONENT
--------------------------------------------------- */
export default function Page() {
  const [mode, setMode] = useState<'personal' | 'team'>('personal');
  const [language, setLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<string>(personalDefaultFor('javascript'));
  const [output, setOutput] = useState<string>('');
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [teamBaseline, setTeamBaseline] = useState<string>('');
  const [running, setRunning] = useState(false);

  /* ---------------------------------------------------
     TEAM WORKSPACE LOAD
  --------------------------------------------------- */
  const loadTeamWorkspace = async () => {
    const res = await fetch('/api/team');
    const data = await res.json();
    const content = data?.content ?? personalDefaultFor(data?.language ?? 'javascript');
    const lang = data?.language ?? 'javascript';

    setTeamInfo(data);
    setTeamBaseline(content);
    setLanguage(lang);
    setCode(content);
  };

  /* ---------------------------------------------------
     LEAVE WARNING (widget.close & beforeunload)
  --------------------------------------------------- */
  useEffect(() => {
    const shouldWarn = () => {
      if (mode === 'personal')
        return code.trim() !== personalDefaultFor(language).trim();
      return code.trim() !== teamBaseline.trim();
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldWarn()) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    if (cliq) {
      cliq.on('widget.close', () => {
        if (shouldWarn()) {
          const ok = confirm('You have unsaved changes. Close anyway?');
          if (!ok) throw new Error('CANCEL_CLOSE');
        }
      });
    }

    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [code, mode, teamBaseline, language]);

  /* ---------------------------------------------------
     MODE SWITCHING
--------------------------------------------------- */
  const switchToPersonal = () => {
    if (mode === 'team' && code.trim() !== teamBaseline.trim()) {
      const ok = confirm(
        "You have unsaved TEAM workspace changes.\nSwitching will discard them.\n\nContinue?"
      );
      if (!ok) return;
    }
    setMode('personal');
    setCode(personalDefaultFor(language));
  };

  const switchToTeam = async () => {
    if (mode === 'personal' && code.trim() !== personalDefaultFor(language).trim()) {
      const ok = confirm(
        "Your personal code will be deleted if you switch.\nSave or share it first.\n\nContinue?"
      );
      if (!ok) return;
    }
    setMode('team');
    await loadTeamWorkspace();
  };

  /* ---------------------------------------------------
     SAVE / DELETE TEAM WORKSPACE
--------------------------------------------------- */
  const saveToTeam = async () => {
    const user = await cliq?.user.get();
    const name = user?.first_name ?? 'Unknown';

    await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: code, language, modifiedBy: name }),
    });

    await loadTeamWorkspace();
    alert('Saved to team ✔');
  };

  const deleteTeam = async () => {
    if (!confirm('Delete team workspace?')) return;

    await fetch('/api/team', { method: 'DELETE' });
    await loadTeamWorkspace();
    alert('Workspace reset ✔');
  };

  /* ---------------------------------------------------
     LANGUAGE CHANGE
--------------------------------------------------- */
  const handleLanguageChange = (newLang: string) => {
    if (newLang === language) return;

    if (mode === 'personal' && code.trim() !== personalDefaultFor(language).trim()) {
      const ok = confirm(
        "Switching languages will delete your current PERSONAL code.\nSave/share it first.\n\nContinue?"
      );
      if (!ok) return;
    }

    if (mode === 'team' && code.trim() !== teamBaseline.trim()) {
      const ok = confirm(
        "Unsaved TEAM workspace changes will be lost.\nSave to Team first.\n\nContinue?"
      );
      if (!ok) return;
    }

    setLanguage(newLang);
    setCode(personalDefaultFor(newLang));
  };

  /* ---------------------------------------------------
     SHARE & SAVE FILE
--------------------------------------------------- */
  const shareToChat = () => {
    if (!cliq) return alert('Not running inside Zoho Cliq.');

    cliq.sendMessage({
      text: `Code (${language}):\n\`\`\`${language}\n${code}\n\`\`\``,
    });
  };

  const saveFile = async () => {
    if (!cliq) return alert('Not inside Zoho Cliq.');

    const filename = prompt('File name:', `main.${language}`);
    if (!filename) return;

    const blob = new Blob([code], { type: 'text/plain' });
    const file = new File([blob], filename);
    await cliq.sendFile(file);
  };

  /* ---------------------------------------------------
     RUN CODE
--------------------------------------------------- */
  const runCode = async () => {
    setRunning(true);
    setOutput('Running...');

    try {
      if (language === 'javascript') {
        const logs: string[] = [];
        const sandbox = { console: { log: (m: any) => logs.push(String(m)) } };
        new Function('sandbox', `with(sandbox){ ${code} }`)(sandbox);
        setOutput(logs.join('\n') || '(no output)');
      } else {
        const res = await fetch('/api/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language, code }),
        });

        const data = await res.json();
        setOutput(data.output || '(empty output)');
      }
    } catch (err: any) {
      setOutput(err.message);
    }

    setRunning(false);
  };

  /* ---------------------------------------------------
     UI
--------------------------------------------------- */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0f10' }}>
      
      {/* TOP BAR */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        padding: 12,
        background: '#1c1c1c',
        color: '#fff',
        alignItems: 'center',
      }}>
        <button onClick={switchToPersonal} style={mode === 'personal' ? primaryBtn : secondaryBtn}>
          Personal
        </button>

        <button onClick={switchToTeam} style={mode === 'team' ? primaryBtn : secondaryBtn}>
          Team
        </button>

        {/* Language Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Language:</span>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, background: '#111', color: '#fff' }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={runCode} style={actionBtn}>{running ? 'Running...' : 'Run ▶'}</button>

          {mode === 'team' && (
            <>
              <button onClick={saveToTeam} style={actionBtn}>Save to Team</button>
              <button onClick={deleteTeam} style={dangerBtn}>Delete</button>
            </>
          )}

          <button onClick={shareToChat} style={actionBtn}>Share</button>
          <button onClick={saveFile} style={actionBtn}>Save File</button>
        </div>
      </div>

      {/* LAST MODIFIED */}
      {mode === 'team' && teamInfo?.modifiedBy && (
        <div style={{ padding: 8, background: '#0b0b0c', color: '#aaa' }}>
          📝 Last saved by {teamInfo.modifiedBy} — {new Date(teamInfo.modifiedAt).toLocaleString()}
          {code.trim() !== teamBaseline.trim() && <span style={{ color: '#ffd54f' }}> • Unsaved changes</span>}
        </div>
      )}

      {/* EDITOR */}
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          value={code}
          language={language}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 14 }}
          onChange={(v) => setCode(v ?? '')}
        />
      </div>

      {/* OUTPUT */}
      <div style={{
        height: '28%',
        background: '#000',
        color: '#00e676',
        padding: 12,
        fontFamily: 'monospace',
        overflow: 'auto',
      }}>
        <strong style={{ color: '#4caf50' }}>Output:</strong>
        <pre style={{ marginTop: 10 }}>{output}</pre>
      </div>
    </div>
  );
}

/* BUTTON STYLES */
const primaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#007acc',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#333',
  color: '#fff',
  border: '1px solid #444',
  borderRadius: 6,
  cursor: 'pointer',
};
const actionBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#005fb8',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};
const dangerBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#d32f2f',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};
