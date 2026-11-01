import { LAUDO_VARIAVEIS } from '@ethica/contracts';
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
import { variavelItems } from './laudo-labels.js';

// Editor do laudo e dos modelos (AD-123): só o que a allowlist da API aceita — parágrafo,
// título (níveis 3 e 4), negrito, itálico, sublinhado, listas e tabela simples. A API saneia
// o HTML de novo ao gravar.

const VARIAVEIS: readonly string[] = LAUDO_VARIAVEIS;

// Marcador de variável ainda no texto fica destacado: é pendência que bloqueia concluir (AD-126).
const VariaveisDestacadas = Extension.create({
  name: 'variaveisDestacadas',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const marcas: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              for (const match of node.text.matchAll(/\[[A-Z_]+\]/g)) {
                if (!VARIAVEIS.includes(match[0])) continue;
                const from = pos + (match.index ?? 0);
                marcas.push(
                  Decoration.inline(from, from + match[0].length, {
                    class: 'rounded-sm bg-status-warning px-0.5 text-status-warning-foreground',
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, marcas);
          },
        },
      }),
    ];
  },
});

// Foto da vistoria no laudo (AD-129): o HTML gravado tem o caminho da mídia; no editor ela
// carrega da API. A API tira a origem ao salvar.
const FotoDaVistoria = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (elemento: HTMLElement) => {
          const src = elemento.getAttribute('src') ?? '';
          return src.startsWith('/') ? apiUrl(src) : src;
        },
      },
    };
  },
});

export type FotoDoEditor = { src: string; legenda?: string };

const EXTENSOES = [
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
  FotoDaVistoria.configure({ inline: false, allowBase64: false }),
  VariaveisDestacadas,
];

type Ferramenta = {
  icon: LucideIcon;
  label: string;
  ativo: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const FERRAMENTAS: Ferramenta[] = [
  { icon: Bold, label: 'bold', ativo: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  {
    icon: Italic,
    label: 'italic',
    ativo: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    icon: Underline,
    label: 'underline',
    ativo: (e) => e.isActive('underline'),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    icon: Heading3,
    label: 'subtitle',
    ativo: (e) => e.isActive('heading', { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    icon: List,
    label: 'bulleted_list',
    ativo: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    icon: ListOrdered,
    label: 'numbered_list',
    ativo: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    icon: Table,
    label: 'insert_table',
    ativo: (e) => e.isActive('table'),
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
];

function Barra({ editor, fotos }: { editor: Editor; fotos?: FotoDoEditor[] }) {
  const ativos = useEditorState({ editor, selector: ({ editor: e }) => FERRAMENTAS.map((f) => f.ativo(e)) });
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-input p-1">
      {FERRAMENTAS.map((ferramenta, i) => (
        <Button
          key={ferramenta.label}
          type="button"
          size="icon-sm"
          variant={ativos[i] ? 'secondary' : 'ghost'}
          aria-label={t(ferramenta.label)}
          aria-pressed={ativos[i]}
          onClick={() => ferramenta.run(editor)}
        >
          <ferramenta.icon />
        </Button>
      ))}
      {fotos && fotos.length > 0 && (
        <Select
          items={fotos.map((foto, indice) => ({
            value: foto.src,
            label: foto.legenda || `${t('photo')} ${indice + 1}`,
          }))}
          value={null}
          onValueChange={(src) => {
            const foto = fotos.find((item) => item.src === src);
            if (!foto) return;
            editor
              .chain()
              .focus()
              .insertContent([
                { type: 'image', attrs: { src: apiUrl(foto.src), alt: foto.legenda ?? '' } },
                ...(foto.legenda
                  ? [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', marks: [{ type: 'italic' }], text: foto.legenda }],
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
            {fotos.map((foto, indice) => (
              <SelectItem key={foto.src} value={foto.src}>
                {foto.legenda || `${t('photo')} ${indice + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        items={variavelItems}
        value={null}
        onValueChange={(value) => value && editor.chain().focus().insertContent(value).run()}
      >
        <SelectTrigger size="sm" className={fotos?.length ? undefined : 'ml-auto'} aria-label={t('insert_variable')}>
          <SelectValue placeholder={t('insert_variable')} />
        </SelectTrigger>
        <SelectContent>
          {variavelItems.map((item) => (
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
  // Fotos das vistorias da perícia para inserir no texto (só no laudo).
  fotos?: FotoDoEditor[];
};

// Não controlado depois de montar: quem troca de seção remonta pela `key`.
export function RichTextEditor({ value, onChange, readOnly = false, label, className, fotos }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: EXTENSOES,
    content: value,
    editable: !readOnly,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        'aria-label': label ?? t('text'),
        class: 'min-h-48 px-3 py-2 text-sm leading-relaxed outline-none',
      },
    },
    onUpdate: ({ editor: atual }) => onChange?.(atual.isEmpty ? '' : atual.getHTML()),
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
      {editor && !readOnly && <Barra editor={editor} fotos={fotos} />}
      <EditorContent editor={editor} />
    </div>
  );
}
