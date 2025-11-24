'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Monaco editor client-only
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ---------- Mock / wrapper for $cliq so app runs locally ----------
let cliq: any;
if (typeof window !== 'undefined' && (window as any).$cliq) {
  cliq = (window as any).$cliq;
} else {
  cliq = {
    user: { get: async () => ({ first_name: 'LocalUser' }) },
    sendMessage: (m: any) => alert('Mock sendMessage:\n\n' + (m?.text ?? JSON.stringify(m))),
    sendFile: (_: File) => alert('Mock sendFile called'),
    on: (_event: string, _cb: Function) => { /* noop for local */ },
  };
}

// ---------- Starter templates for each language ----------
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

const personalDefaultFor = (lang: string) => languageTemplates[lang] ?? '// Start coding';

export default function Page() {
  const [mode, setMode] = useState<'personal' | 'team'>('personal');
  const [language, setLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<string>(personalDefaultFor('javascript'));
  const [output, setOutput] = useState<string>('');
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [teamBaseline, setTeamBaseline] = useState<string>('');
  const [running, setRunning] = useState<boolean>(false);

  /* ---------------------- RESIZABLE TERMINAL ---------------------- */
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);

  const startResize = () => setIsResizing(true);
  const stopResize = () => setIsResizing(false);

  const handleResize = (e: any) => {
    if (isResizing) {
      setTerminalHeight(window.innerHeight - e.clientY - 70);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("mousemove", handleResize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [isResizing]);

  /* ---------------- load team workspace ---------------- */
  const loadTeamWorkspace = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      const content = data?.content ?? personalDefaultFor(data?.language ?? 'javascript');
      const lang = data?.language ?? 'javascript';
      setTeamInfo(data ?? null);
      setTeamBaseline(content.toString());
      setLanguage(lang);
      setCode(content.toString());
    } catch (err) {
      console.error('loadTeamWorkspace error', err);
    }
  };

  const personalIsModified = (lang = language, cur = code) => {
    return (cur ?? '').toString().trim() !== (personalDefaultFor(lang) ?? '').toString().trim();
  };

  const teamIsModified = (cur = code) => {
    return (cur ?? '').toString().trim() !== (teamBaseline ?? '').toString().trim();
  };

  const shouldWarnOnLeave = () => {
    if (mode === 'personal') return personalIsModified();
    return teamIsModified();
  };

  /* --------------- beforeunload + widget.close handling --------------- */
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (shouldWarnOnLeave()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };
    window.addEventListener('beforeunload', onBefore);

    try {
      cliq.on('widget.close', () => {
        if (shouldWarnOnLeave()) {
          const ok = confirm('You have unsaved changes. Leaving will discard them. Continue?');
          if (!ok) throw new Error('CANCEL_CLOSE');
        }
      });
    } catch {}

    return () => window.removeEventListener('beforeunload', onBefore);
  }, [mode, code, teamBaseline]);

  /* ---------------- switching workspaces ---------------- */
  const switchToPersonal = () => {
    if (mode === 'team' && teamIsModified()) {
      const ok = confirm(
        "You have unsaved changes in the Team Workspace.\nIf you switch to Personal Workspace now, those unsaved changes will be lost.\nClick 'Save to Team' to keep them.\n\nDo you want to continue?"
      );
      if (!ok) return;
    }
    setMode('personal');
    setCode(personalDefaultFor(language));
  };

  const switchToTeam = async () => {
    if (mode === 'personal' && personalIsModified()) {
      const ok = confirm(
        "If you switch to Team Workspace now, your PERSONAL code (unsaved) will be deleted.\nSave or Share before switching.\n\nDo you want to continue?"
      );
      if (!ok) return;
    }
    setMode('team');
    await loadTeamWorkspace();
  };

  /* ---------------- save / delete team ---------------- */
  const saveToTeam = async () => {
    try {
      const user = (await cliq.user.get()) ?? { first_name: 'Unknown' };
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: code, language, modifiedBy: user.first_name ?? 'Unknown' }),
      });
      await loadTeamWorkspace();
      alert('Saved to team ✔');
    } catch (err) {
      console.error('saveToTeam err', err);
      alert('Save failed; check console.');
    }
  };

  const deleteTeam = async () => {
    const ok = confirm('Are you sure you want to delete the Team Workspace?');
    if (!ok) return;
    await fetch('/api/team', { method: 'DELETE' });
    await loadTeamWorkspace();
    alert('Team workspace deleted and reset to default.');
  };

  /* ---------------- language change handler ---------------- */
  const handleLanguageChange = (newLang: string) => {
    if (newLang === language) return;

    if (mode === 'personal') {
      if (personalIsModified()) {
        const ok = confirm(
          "Switching languages will CLEAR your current personal code unless you save or share it.\nSave to file or share to chat before switching.\n\nContinue?"
        );
        if (!ok) return;
      }
      setLanguage(newLang);
      setCode(personalDefaultFor(newLang));
      return;
    }

    if (mode === 'team') {
      if (teamIsModified()) {
        const ok = confirm(
          "You have unsaved changes in the Team Workspace.\nSwitching language will discard them.\n\nContinue?"
        );
        if (!ok) return;
      }
      setLanguage(newLang);
      setCode(personalDefaultFor(newLang));
      return;
    }
  };

  /* ---------------- share / save file ---------------- */
  const shareToChat = () => {
    cliq.sendMessage({ text: `Code (${language}):\n\`\`\`${language}\n${code}\n\`\`\`` });
    alert('Shared to chat (mock/local).');
  };

  const saveFile = () => {
    const filename = prompt('File name:', `main.${language}`);
    if (!filename) return;

    const blob = new Blob([code], { type: 'text/plain' });

    if (!(window as any).$cliq) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      return;
    }

    const file = new File([blob], filename);
    cliq.sendFile(file);
  };

  /* ---------------- run code ---------------- */
  const runCode = async () => {
    setRunning(true);
    setOutput('Running...');

    try {
      if (language === 'javascript') {
        const logs: string[] = [];
        const sandbox = { console: { log: (m: any) => logs.push(String(m)) } };
        new Function('sandbox', `with(sandbox){ ${code} }`)(sandbox);
        setOutput(logs.join('\n') || '(no output)');
        setRunning(false);
        return;
      }

      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });

      const data = await res.json();
      setOutput(data.output || '(empty output)');
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    }

    setRunning(false);
  };

  /* ---------------- UI ---------------- */
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      background: '#0f0f10',
      color: '#ddd',
    }}>
      {/* TOP BAR */}
      <div style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '10px',
        background: '#3a3a3d',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={switchToPersonal} style={mode === 'personal' ? primaryBtn : secondaryBtn}>Personal</button>
          <button onClick={switchToTeam} style={mode === 'team' ? primaryBtn : secondaryBtn}>Team</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginLeft: 15 }}>
          <label style={{ color: '#ccc' }}>Language:</label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{ padding: '6px', background: '#101014', color: '#fff', borderRadius: 6, border: '1px solid #333' }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={runCode} disabled={running} style={actionBtn}>{running ? 'Running...' : 'Run ▶'}</button>

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

      {mode === 'team' && teamInfo?.modifiedBy && (
        <div style={{ padding: 8, background: '#0b0b0c', fontSize: 13, color: '#999' }}>
          Last saved by <strong style={{ color: '#fff' }}>{teamInfo.modifiedBy}</strong>
          {teamInfo.modifiedAt && ` at ${new Date(teamInfo.modifiedAt).toLocaleString()}`}
          {teamIsModified() && <span style={{ marginLeft: 8, color: '#ffb74d' }}>• Unsaved changes</span>}
        </div>
      )}

      {/* EDITOR */}
      <div style={{ flex: 1, minHeight: 150 }}>
        <Editor
          height="100%"
          value={code}
          language={language}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 14 }}
          onChange={(v) => setCode(v ?? '')}
        />
      </div>

      {/* === RESIZE BAR === */}
      <div
        onMouseDown={startResize}
        style={{
          height: "6px",
          background: "#444",
          cursor: "row-resize",
        }}
      ></div>

      {/* OUTPUT */}
      <div style={{
        height: terminalHeight,
        minHeight: 100,
        background: '#000',
        color: '#00e676',
        padding: 12,
        fontFamily: 'monospace',
        overflowY: 'auto',
      }}>
        <div style={{ color: '#4caf50', fontWeight: 700 }}>Output:</div>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{output || '(no output)'}</pre>
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */
const primaryBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, background: '#0b84ff', color: '#fff', border: 'none', cursor: 'pointer'
};
const secondaryBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, background: '#2b2b2b', color: '#fff', border: '1px solid #333', cursor: 'pointer'
};
const actionBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, background: '#007acc', color: '#fff', border: 'none', cursor: 'pointer'
};
const dangerBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, background: '#d32f2f', color: '#fff', border: 'none', cursor: 'pointer'
};
