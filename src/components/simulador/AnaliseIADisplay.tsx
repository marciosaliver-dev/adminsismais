import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  TrendingUp,
  Zap,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnaliseIADisplayProps {
  analysis: string;
}

interface Section {
  icon: string;
  title: string;
  content: string;
  type: "diagnostic" | "strengths" | "warnings" | "recommendations" | "quickwins" | "projection" | "default";
}

const sectionConfig = {
  diagnostic: {
    icon: BarChart3,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  strengths: {
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  warnings: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  recommendations: {
    icon: Lightbulb,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
  },
  quickwins: {
    icon: Zap,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
  },
  projection: {
    icon: TrendingUp,
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/20",
  },
  default: {
    icon: FileText,
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-muted",
  },
};

function parseMarkdownContent(content: string): string {
  return content
    // Bold text
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italic text
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

function parseListItems(content: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');
  
  let currentItem = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if it's a list item (starts with -, *, or numbered)
    if (/^[-*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
    } else if (trimmed && currentItem) {
      // Continuation of previous item
      currentItem += ' ' + trimmed;
    } else if (trimmed && !currentItem) {
      // Non-list content
      currentItem = trimmed;
    }
  }
  
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items;
}

function detectSectionType(title: string): Section["type"] {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes("diagnóstico") || lowerTitle.includes("diagnostico")) return "diagnostic";
  if (lowerTitle.includes("pontos fortes") || lowerTitle.includes("forte")) return "strengths";
  if (lowerTitle.includes("atenção") || lowerTitle.includes("atencao") || lowerTitle.includes("alerta")) return "warnings";
  if (lowerTitle.includes("recomendação") || lowerTitle.includes("recomendac") || lowerTitle.includes("estratégic")) return "recommendations";
  if (lowerTitle.includes("quick") || lowerTitle.includes("win") || lowerTitle.includes("rápid")) return "quickwins";
  if (lowerTitle.includes("projeção") || lowerTitle.includes("projecao") || lowerTitle.includes("viabilidade")) return "projection";
  
  return "default";
}

function parseSections(analysis: string): Section[] {
  const sections: Section[] = [];
  
  // Split by ## headers
  const parts = analysis.split(/^## /gm).filter(Boolean);
  
  for (const part of parts) {
    const lines = part.split('\n');
    const titleLine = lines[0] || '';
    
    // Extract emoji and title
    const emojiMatch = titleLine.match(/^([📊✅⚠️💡🎯📈🚀⚡]+)\s*(.*)$/);
    let icon = '';
    let title = titleLine;
    
    if (emojiMatch) {
      icon = emojiMatch[1];
      title = emojiMatch[2];
    }
    
    const content = lines.slice(1).join('\n').trim();
    const type = detectSectionType(title);
    
    if (title || content) {
      sections.push({
        icon,
        title: title.trim(),
        content,
        type,
      });
    }
  }
  
  return sections;
}

function SectionCard({ section }: { section: Section }) {
  const config = sectionConfig[section.type];
  const IconComponent = config.icon;
  
  const items = parseListItems(section.content);
  const hasListItems = items.length > 1 || (items.length === 1 && section.content.includes('-'));
  
  // For diagnostic/projection sections, render as prose
  const isProse = section.type === "diagnostic" || section.type === "projection";
  
  return (
    <Card className={cn("transition-all hover:shadow-md", config.border, config.bg)}>
      <CardHeader className="pb-3">
        <CardTitle className={cn("flex items-center gap-3 text-base font-semibold", config.color)}>
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <IconComponent className="w-5 h-5" />
          </div>
          <span className="flex items-center gap-2">
            {section.icon && <span className="text-lg">{section.icon}</span>}
            {section.title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isProse || !hasListItems ? (
          <div 
            className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdownContent(section.content) }}
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", config.color.replace("text-", "bg-"))} />
                <span 
                  className="text-sm text-muted-foreground leading-relaxed flex-1"
                  dangerouslySetInnerHTML={{ __html: parseMarkdownContent(item) }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AnaliseIADisplay({ analysis }: AnaliseIADisplayProps) {
  const sections = useMemo(() => parseSections(analysis), [analysis]);
  
  if (sections.length === 0) {
    // Fallback for non-structured content
    return (
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div 
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdownContent(analysis) }}
          />
        </CardContent>
      </Card>
    );
  }
  
  // Group sections by type for layout
  const diagnosticSections = sections.filter(s => s.type === "diagnostic" || s.type === "projection");
  const listSections = sections.filter(s => s.type !== "diagnostic" && s.type !== "projection");
  
  return (
    <div className="space-y-4">
      {/* Diagnostic/Projection sections - full width */}
      {diagnosticSections.map((section, index) => (
        <SectionCard key={`diag-${index}`} section={section} />
      ))}
      
      {/* List sections - grid layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {listSections.map((section, index) => (
          <SectionCard key={`list-${index}`} section={section} />
        ))}
      </div>
    </div>
  );
}
