"use client";

import React from "react";

function renderInline(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[var(--text-primary)]">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
      return (
        <code
          key={i}
          className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--accent)]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

export function MarkdownView({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        if (trimmed.startsWith("### ")) {
          return (
            <h5 key={idx} className="pt-1 text-xs font-semibold text-[var(--text-primary)]">
              {trimmed.slice(4)}
            </h5>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          const clean = trimmed.replace(/^#+\s+/, "");
          return (
            <h4 key={idx} className="pt-1 text-sm font-semibold text-[var(--text-primary)]">
              {clean}
            </h4>
          );
        }
        if (trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5 text-[var(--text-muted)] line-through">
              <span className="text-emerald-500">☑</span>
              <span>{renderInline(trimmed.slice(6))}</span>
            </div>
          );
        }
        if (trimmed.startsWith("- [ ] ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-[var(--accent)]">☐</span>
              <span>{renderInline(trimmed.slice(6))}</span>
            </div>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-[var(--accent)]">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
