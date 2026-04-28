export interface ParsedDocument {
  id: string;            // sha256 of source bytes / URL
  title: string;
  source: string;        // file path or URL
  format: 'pdf' | 'docx' | 'doc' | 'epub' | 'html' | 'text' | 'markdown';
  paragraphs: string[];
  warnings?: string[];   // e.g. "low-confidence column detection"
}
