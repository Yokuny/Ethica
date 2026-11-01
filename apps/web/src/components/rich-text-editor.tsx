import { REPORT_VARIABLES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { type Editor, EditorContent, Extension, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from 'cn';
import { Bold, Heading3, Italic, List, ListOrdered, type LucideIcon, Table, Underline } from 'lucide-react';
import { apiUrl } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { variableItems } from './report-labels.js';

// Report and template editor (AD-123): only what the API allowlist accepts — paragraph,
// heading (levels 3 and 4), bold, italic, underline, lists and a simple table. The API sanitizes
// the HTML again when saving.

const VARIABLES: readonly string[] = REPORT_VARIABLES;

// A variable marker still in the text is highlighted: it is an issue that blocks completion (AD-126).
const HighlightedVariables = Extension.create({
  name: 'highlightedVariables',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const marks: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              for (const match of node.text.matchAll(/\[[A-Z_]+\]/g)) {
                if (!VARIABLES.includes(match[0])) continue;
                const from = pos + (match.index ?? 0);
                marks.push(
                  Decoration.inline(from, from + match[0].length, {
                    class: 'rounded-sm bg-status-warning px-0.5 text-status-warning-foreground',
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, marks);
          },
        },
      }),
    ];
  },
});

// Inspection photo in the report (AD-129): the saved HTML has the media path; in the editor it
// loads from the API. The API strips the origin when saving.
const InspectionPhoto = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const src = element.getAttribute('src') ?? '';
          return src.startsWith('/') ? apiUrl(src) : src;
        },
      },
    };
  },
});

export type PhotoEditor = { src: string; caption?: string };

const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [3, 4] },
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    link: false,
  }),
  TableKit.configure({ table: { resizable: false } }),
  InspectionPhoto.configure({ inline: false, allowBase64: false }),
  HighlightedVariables,
];

type Tool = {
  icon: LucideIcon;
  label: string;
  active: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const TOOLS: Tool[] = [
  { icon: Bold, label: 'bold', active: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  {
    icon: Italic,
    label: 'italic',
    active: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    icon: Underline,
    label: 'underline',
    active: (e) => e.isActive('underline'),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    icon: Heading3,
    label: 'subtitle',
    active: (e) => e.isActive('heading', { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    icon: List,
    label: 'bulleted_list',
    active: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    icon: ListOrdered,
    label: 'numbered_list',
    active: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    icon: Table,
    label: 'insert_table',
    active: (e) => e.isActive('table'),
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
];

function Barra({ editor, photos }: { editor: Editor; photos?: PhotoEditor[] }) {
  const active = useEditorState({ editor, selector: ({ editor: e }) => TOOLS.map((f) => f.active(e)) });
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-input p-1">
      {TOOLS.map((tool, i) => (
        <Button
          key={tool.label}
          type="button"
          size="icon-sm"
          variant={active[i] ? 'secondary' : 'ghost'}
          aria-label={t(tool.label)}
          aria-pressed={active[i]}
          onClick={() => tool.run(editor)}
        >
          <tool.icon />
        </Button>
      ))}
      {photos && photos.length > 0 && (
        <Select
          items={photos.map((photo, index) => ({
            value: photo.src,
            label: photo.caption || `${t('photo')} ${index + 1}`,
          }))}
          value={null}
          onValueChange={(src) => {
            const photo = photos.find((item) => item.src === src);
            if (!photo) return;
            editor
              .chain()
              .focus()
              .insertContent([
                { type: 'image', attrs: { src: apiUrl(photo.src), alt: photo.caption ?? '' } },
                ...(photo.caption
                  ? [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', marks: [{ type: 'italic' }], text: photo.caption }],
                      },
                    ]
                  : []),
              ])
              .run();
          }}
        >
          <SelectTrigger size="sm" className="ml-auto" aria-label={t('insert_photo')}>
            <SelectValue placeholder={t('insert_photo')} />
          </SelectTrigger>
          <SelectContent>
            {photos.map((photo, index) => (
              <SelectItem key={photo.src} value={photo.src}>
                {photo.caption || `${t('photo')} ${index + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        items={variableItems}
        value={null}
        onValueChange={(value) => value && editor.chain().focus().insertContent(value).run()}
      >
        <SelectTrigger size="sm" className={photos?.length ? undefined : 'ml-auto'} aria-label={t('insert_variable')}>
          <SelectValue placeholder={t('insert_variable')} />
        </SelectTrigger>
        <SelectContent>
          {variableItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type RichTextEditorProps = {
  value: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  label?: string;
  className?: string;
  // Photos of the case inspections to insert in the text (report only).
  photos?: PhotoEditor[];
};

// Uncontrolled after mounting: whoever switches sections remounts through `key`.
export function RichTextEditor({ value, onChange, readOnly = false, label, className, photos }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    editable: !readOnly,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        'aria-label': label ?? t('text'),
        class: 'min-h-48 px-3 py-2 text-sm leading-relaxed outline-none',
      },
    },
    onUpdate: ({ editor: current }) => onChange?.(current.isEmpty ? '' : current.getHTML()),
  });

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-md border border-input bg-card shadow-xs focus-within:border-ring',
        '[&_h3]:mt-3 [&_h3]:font-semibold [&_h4]:mt-2 [&_h4]:font-semibold [&_li_p]:my-0 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
        '[&_img]:mx-auto [&_img]:my-2 [&_img]:max-h-80 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-input [&_td]:p-1.5 [&_th]:border [&_th]:border-input [&_th]:bg-muted [&_th]:p-1.5 [&_th]:text-left',
        readOnly && 'bg-muted/40',
        className,
      )}
    >
      {editor && !readOnly && <Barra editor={editor} photos={photos} />}
      <EditorContent editor={editor} />
    </div>
  );
}
