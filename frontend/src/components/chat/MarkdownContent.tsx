import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Code2 } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
}

const CodeBlock: React.FC<{ language?: string; codeString: string }> = ({ language, codeString }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900 text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/90 border-b border-slate-700/50 text-[11px] font-mono text-slate-300">
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <Code2 className="w-3.5 h-3.5" />
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, isUser = false }) => {
  // Normalize unicode bullets (e.g. • or ●) into standard markdown list syntax (- )
  // so ReactMarkdown and remark-gfm can parse them into semantic lists
  const normalizedContent = content
    .replace(/^([ \t]*)[•●][ \t]+/gm, '$1- ')
    .trim();

  if (isUser) {
    return (
      <div className="text-sm leading-relaxed text-white">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-emerald-100">{children}</em>,
            ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 marker:text-emerald-200">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-emerald-200">{children}</ol>,
            li: ({ children }) => <li className="pl-0.5">{children}</li>,
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 rounded bg-emerald-700/80 text-emerald-100 font-mono text-xs">
                {children}
              </code>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-emerald-100 hover:text-white transition-colors"
              >
                {children}
              </a>
            ),
          }}
        >
          {normalizedContent}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="text-sm leading-relaxed text-slate-800 space-y-1.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="font-bold text-slate-900 text-base mt-3 mb-1.5 pb-1 border-b border-slate-200/80 flex items-center gap-1.5">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="font-bold text-slate-900 text-sm mt-3 mb-1.5 text-emerald-800 flex items-center gap-1.5">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h4 className="font-bold text-slate-900 text-sm mt-2.5 mb-1 text-slate-800">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h5 className="font-semibold text-slate-800 text-xs mt-2 mb-1">
              {children}
            </h5>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 marker:text-emerald-500 text-slate-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-emerald-600 font-medium text-slate-700">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-500 bg-emerald-50/60 rounded-r-xl px-3.5 py-2 my-2.5 text-slate-700 italic text-xs leading-relaxed">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-xs text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-bold text-slate-700 border-r border-slate-200 last:border-r-0">
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/80 transition-colors">
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-slate-700 border-r border-slate-100 last:border-r-0">
              {children}
            </td>
          ),
          hr: () => <hr className="my-3 border-t border-slate-200" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-600 hover:text-emerald-700 underline transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const isMultiline = codeString.includes('\n');

            if (match || isMultiline) {
              return (
                <CodeBlock
                  language={match ? match[1] : undefined}
                  codeString={codeString}
                />
              );
            }

            return (
              <code className="px-1.5 py-0.5 rounded-md bg-slate-100 font-mono text-[12px] text-emerald-800 font-medium border border-slate-200/70">
                {children}
              </code>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
