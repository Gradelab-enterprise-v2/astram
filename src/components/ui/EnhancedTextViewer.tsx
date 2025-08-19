import React, { useEffect, useRef, useState } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import mermaid from 'mermaid';

interface EnhancedTextViewerProps {
  text: string;
  className?: string;
}

export function EnhancedTextViewer({ text, className = "" }: EnhancedTextViewerProps) {
  const [processedContent, setProcessedContent] = useState<React.ReactNode[]>([]);
  const [mermaidCharts, setMermaidCharts] = useState<{ id: string; code: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  // Process text and extract LaTeX and Mermaid content
  useEffect(() => {
    if (!text) {
      setProcessedContent([]);
      setMermaidCharts([]);
      return;
    }

    const processText = () => {
      const parts: React.ReactNode[] = [];
      let mermaidIndex = 0;
      const charts: { id: string; code: string }[] = [];

      // Split text by Mermaid code blocks
      const mermaidSplit = text.split(/```mermaid\n?/);
      
      mermaidSplit.forEach((part, index) => {
        if (index === 0) {
          // First part - no mermaid block before it
          parts.push(processTextPart(part));
        } else {
          // Find the end of the mermaid block
          const mermaidEndIndex = part.indexOf('```');
          if (mermaidEndIndex !== -1) {
            const mermaidCode = part.substring(0, mermaidEndIndex).trim();
            const remainingText = part.substring(mermaidEndIndex + 3);
            
            // Validate Mermaid syntax before rendering
            const isValidMermaid = () => {
              try {
                const lines = mermaidCode.split('\n');
                const firstLine = lines[0]?.trim();
                
                // Check if it starts with a valid diagram type
                if (!firstLine || !/^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram)/i.test(firstLine)) {
                  return false;
                }
                
                // Check for incomplete node definitions
                const hasIncompleteNodes = lines.some(line => {
                  const trimmed = line.trim();
                  return /\[[^\]]*$/.test(trimmed) || /\[[^\]]*-->/.test(trimmed);
                });
                
                return !hasIncompleteNodes;
              } catch (error) {
                return false;
              }
            };
            
            const chartId = `mermaid-${mermaidIndex}`;
            
            if (!isValidMermaid()) {
              parts.push(
                <div key={`mermaid-${mermaidIndex}`} className="my-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-yellow-800 dark:text-yellow-200">Invalid Mermaid Diagram</span>
                    </div>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                      The diagram syntax is malformed. Here's the raw content:
                    </p>
                    <pre className="bg-white dark:bg-gray-900 p-3 rounded border text-sm overflow-x-auto">
                      {mermaidCode}
                    </pre>
                  </div>
                </div>
              );
            } else {
              charts.push({ id: chartId, code: mermaidCode });
              parts.push(
                <div key={`mermaid-${mermaidIndex}`} className="my-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-2">Diagram:</div>
                    <div id={chartId} className="mermaid">
                      {mermaidCode}
                    </div>
                  </div>
                </div>
              );
            }
            mermaidIndex++;
            
            // Process remaining text
            if (remainingText.trim()) {
              parts.push(processTextPart(remainingText));
            }
          } else {
            // No closing ``` found, treat as regular text
            parts.push(processTextPart('```mermaid\n' + part));
          }
        }
      });

      setProcessedContent(parts);
      setMermaidCharts(charts);
    };

    processText();
  }, [text]);

  // Render mermaid charts
  useEffect(() => {
    if (mermaidCharts.length > 0 && containerRef.current) {
      mermaidCharts.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (element) {
          try {
            mermaid.render(id, element.textContent || '').then(({ svg }) => {
              element.innerHTML = svg;
            }).catch((error) => {
              console.error('Mermaid rendering error:', error);
              element.innerHTML = `<div class="text-red-500">Error rendering diagram: ${error.message}</div>`;
            });
          } catch (error) {
            console.error('Mermaid error:', error);
            element.innerHTML = `<div class="text-red-500">Error rendering diagram</div>`;
          }
        }
      });
    }
  }, [mermaidCharts]);

  const processTextPart = (textPart: string): React.ReactNode => {
    if (!textPart.trim()) return null;

    // Split by LaTeX delimiters
    const latexSplit = textPart.split(/(\$\$.*?\$\$|\$.*?\$)/);
    
    return latexSplit.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Block math
        const mathContent = part.slice(2, -2);
        return (
          <div key={index} className="my-4 flex justify-center">
            <BlockMath math={mathContent} />
          </div>
        );
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline math
        const mathContent = part.slice(1, -1);
        return (
          <InlineMath key={index} math={mathContent} />
        );
      } else {
        // Regular text
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      }
    });
  };

  return (
    <div ref={containerRef} className={`text-sm ${className}`}>
      {processedContent}
    </div>
  );
}
