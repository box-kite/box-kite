import { Keyboard, Layers, MessageSquareWarning, ShieldCheck, SquareStack } from 'lucide-react';
import { ReactNode, useRef, useState } from 'react';
import alertdialogApi from '../../api/components/alertdialog.json';
import dialogApi from '../../api/components/dialog.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Dialog, { AlertDialog, DialogReason } from '../../src/components/dialog';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function DialogPage() {
  useTableOfContents(sidebarLinks);

  const [lastReason, setLastReason] = useState<DialogReason>();
  const cancel = useRef<HTMLButtonElement>(null);

  return (
    <Box>
      <PageHeader
        icon={SquareStack}
        title="Dialog"
        description="A modal dialog on the platform's own <dialog>: showModal() supplies the top layer, the backdrop, an inert page, Escape, focus containment and focus return, so none of it is written in JavaScript."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Dialog, { AlertDialog } from '@box-kite/react/components/dialog';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<Dialog trigger={(t) => <Button {...t}>Rename</Button>}>
  <Dialog.Title>Rename this view</Dialog.Title>
  <Dialog.Description>The name is only shown to you.</Dialog.Description>
  <Textbox name="name" props={{ 'aria-label': 'Name' }} />
</Dialog>`}
          >
            <Flex gap={4} flexWrap="wrap" ai="center" py={6}>
              <Dialog trigger={(t) => <Button {...t}>Rename</Button>}>
                <Dialog.Title>Rename this view</Dialog.Title>
                <Dialog.Description>The name is only shown to you.</Dialog.Description>
                <Flex gap={3} mt={5} d="column">
                  <Textbox name="name" props={{ 'aria-label': 'Name' }} />
                  <Button props={{ formMethod: 'dialog' }} onClick={(event) => event.currentTarget.closest('dialog')?.close()}>
                    Save
                  </Button>
                </Flex>
              </Dialog>
              <Dialog modal={false} label="A panel that blocks nothing" trigger={(t) => <Button {...t}>Non-modal</Button>}>
                <Box>
                  <Mono>show()</Mono> instead of <Mono>showModal()</Mono>: no backdrop, nothing inert, and the page still scrolls.
                </Box>
              </Dialog>
            </Flex>
          </Code>

          <Section id="native" title="What the platform does, so this does not">
            <Box>
              Every accessible-dialog library ships a focus trap, a scroll lock, an Escape handler and a stacking-order strategy.{' '}
              <Mono>showModal()</Mono> is all four, and they are the browser's:
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={Layers} title="The top layer, and an inert page">
                  A modal dialog paints above every stacking context and outside every clipped ancestor, and everything behind it becomes{' '}
                  <Mono>inert</Mono> — unclickable, untabbable and skipped by a screen reader. No <Mono>z-index</Mono>, no{' '}
                  <Mono>aria-hidden</Mono> sweep over the page.
                </Note>
                <Note icon={Keyboard} title="Focus containment, in and out">
                  Opening runs the dialog focusing steps — an <Mono>autofocus</Mono> inside, else the first focusable thing — Tab cycles
                  inside and never leaves, and closing puts focus back where it came from. <Mono>initialFocus</Mono> is the one addition,
                  because APG asks an <em>alert</em> dialog to land on its least destructive action.
                </Note>
                <Note icon={ShieldCheck} title="Escape, and a press outside">
                  Escape is the platform's close request. A press outside is <Mono>closedby="any"</Mono>, which the component writes for you
                  — and where the browser does not have it yet, it measures the press against the dialog's own box, because for a modal
                  dialog the backdrop <em>is</em> the dialog element and every containment test calls it inside.
                </Note>
              </Flex>
            </Box>
          </Section>

          <Section id="naming" title="A title names it, a description describes it">
            <Box>
              <Mono>role="dialog"</Mono> has no name of its own, and a dialog without one is announced as a group of orphaned content.
              Rendering a <Mono>Dialog.Title</Mono> is what puts <Mono>aria-labelledby</Mono> on the dialog, so the name and the visible
              heading cannot drift apart; a <Mono>Dialog.Description</Mono> does the same for <Mono>aria-describedby</Mono>. Neither
              attribute is written when the part is absent — a reference pointing at nothing is worse than no reference.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`// From its own parts, which is the usual way.
<Dialog>
  <Dialog.Title>Rename this view</Dialog.Title>
  <Dialog.Description>The name is only shown to you.</Dialog.Description>
</Dialog>

// From the page, or from a string, when the dialog shows no heading.
<Dialog labelledBy="section-heading" describedBy="section-hint" />
<Dialog label="Rename this view" />`}
              />
            </Box>
          </Section>

          <Section id="mounting" title="The dialog is always rendered">
            <Box>
              Closed means <Mono>display: none</Mono>, not unmounted — the same shape as <Mono>&lt;Popover&gt;</Mono>, and what lets the
              browser own showing and hiding. So the exit is a plain CSS transition rather than a <Mono>&lt;Presence&gt;</Mono>: the
              entrance is <Mono>startingStyle</Mono> and the way out is <Mono>transitionBehavior="allow-discrete"</Mono>, both already in
              the component's styles, and both applying to the <Mono>::backdrop</Mono> as well.
            </Box>
            <Box mt={4}>The cost is that the children render whether or not anyone has opened it. Gate an expensive one yourself:</Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen} label="Report" trigger={(t) => <Button {...t}>Report</Button>}>
  {open ? <Box>The expensive part</Box> : null}
</Dialog>`}
              />
            </Box>
          </Section>

          <Section id="controlled" title="Controlled, and why a close cannot be refused">
            <Box>
              Leave <Mono>open</Mono> out and the dialog owns its state. Pass it and you own it, with one asymmetry that comes from the
              platform: the <Mono>cancel</Mono> event is cancelable, but by the time <Mono>onOpenChange</Mono> runs the browser has already
              closed the dialog. Keeping <Mono>open</Mono> true shows it again rather than arguing — and if a decision must not be
              dismissed, that is <Mono>dismissible=&#123;false&#125;</Mono>, which is what <Mono>&lt;AlertDialog&gt;</Mono> is.
            </Box>
            <Box mt={4}>
              Every change names its reason: <Mono>trigger</Mono>, <Mono>escape</Mono>, <Mono>outside-pointer</Mono> or{' '}
              <Mono>imperative</Mono> — the last being everything else, a <Mono>close()</Mono> call and a{' '}
              <Mono>&lt;form method="dialog"&gt;</Mono> submit included.
            </Box>
            <Flex gap={4} ai="center" mt={4} flexWrap="wrap">
              <Dialog
                label="Reasons"
                onOpenChange={(_, { reason }) => setLastReason(reason)}
                trigger={(t) => <Button {...t}>Open, then dismiss it</Button>}
              >
                <Box>Press Escape, or click outside the dialog.</Box>
              </Dialog>
              <Box fontSize={14}>
                Last reason: <Mono>{lastReason ?? '—'}</Mono>
              </Box>
            </Flex>
          </Section>

          <Section id="alertdialog" title="AlertDialog: a decision that cannot be clicked away">
            <Box>
              <Mono>role="alertdialog"</Mono> tells a screen reader the content is an alert rather than a panel, so the name and the
              description are announced together the moment it opens. It is always modal, a press outside is ignored on purpose, and Escape
              still closes it — a keyboard user must always have a way out.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`const cancel = useRef(null);

<AlertDialog initialFocus={cancel} trigger={(t) => <Button {...t}>Delete</Button>}>
  <AlertDialog.Title>Delete this view?</AlertDialog.Title>
  <AlertDialog.Description>Nothing here can be undone.</AlertDialog.Description>
  <Button bgColor="rose-600">Delete</Button>
  <Button ref={cancel}>Cancel</Button>
</AlertDialog>`}
              />
            </Box>
            <Flex gap={4} ai="center" mt={4} flexWrap="wrap">
              <AlertDialog initialFocus={cancel} trigger={(t) => <Button {...t}>Delete</Button>}>
                <AlertDialog.Title>Delete this view?</AlertDialog.Title>
                <AlertDialog.Description>Nothing here can be undone.</AlertDialog.Description>
                <Flex gap={3} mt={5}>
                  <Button bgColor="rose-600" hover={{ bgColor: 'rose-700' }} onClick={(e) => e.currentTarget.closest('dialog')?.close()}>
                    Delete
                  </Button>
                  <Button
                    ref={cancel}
                    bgColor="slate-200"
                    color="slate-900"
                    hover={{ bgColor: 'slate-300' }}
                    onClick={(e) => e.currentTarget.closest('dialog')?.close()}
                  >
                    Cancel
                  </Button>
                </Flex>
              </AlertDialog>
              <Box fontSize={14}>
                <Mono>initialFocus</Mono> puts focus on Cancel, so a deletion cannot be confirmed by reflex.
              </Box>
            </Flex>
            <Box mt={4}>
              <Note icon={MessageSquareWarning} title="It takes every Dialog prop but three">
                <Mono>modal</Mono>, <Mono>dismissible</Mono> and <Mono>lockScroll</Mono> are not choices an alert dialog gets to make.
                Everything else — the trigger, the open state, the naming, <Mono>initialFocus</Mono> and every Box prop — is the same, and
                so is the style tree.
              </Note>
            </Box>
          </Section>

          <Section id="scroll" title="The page behind it">
            <Box>
              A modal dialog stops the page scrolling; a non-modal one does not. That is <Mono>lockScroll</Mono>, which defaults to whatever{' '}
              <Mono>modal</Mono> is, and it is a prop because blocking the page unasked is the commonest complaint about every library that
              does. The lock is a class carrying <Mono>overflow: hidden</Mono>, held by a counter, so an inner dialog closing does not
              unlock the page under an outer one.
            </Box>
            <Box mt={4}>
              Two things worth knowing: the scrollbar's width leaves the page as the lock is applied, so a document that should not shift
              wants <Mono>scrollbarGutter="stable"</Mono> on its root; and iOS Safari scrolls anyway, where nothing short of{' '}
              <Mono>position: fixed</Mono> on the body holds it.
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              The dialog is a Box, so every prop is available on it, and the defaults live in <Mono>Box.components('dialog')</Mono> — with{' '}
              <Mono>dialog.title</Mono> and <Mono>dialog.description</Mono> for the two parts. The style tree says nothing about position or
              size on purpose: the browser's own stylesheet centres a modal dialog in the viewport and caps it at{' '}
              <Mono>calc(100% - 6px - 2em)</Mono>, which is better than anything a default could express.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<Dialog p={8} maxWidth={120} borderRadius={4} backdrop={{ bgColor: 'indigo-950/60' }}>
  <Dialog.Title fontSize={24}>Any Box prop, the backdrop included</Dialog.Title>
</Dialog>`}
              />
            </Box>
          </Section>

          <ApiReference api={dialogApi} />
          <ApiReference api={alertdialogApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'native', label: 'What the platform does' },
  { id: 'naming', label: 'Title and description' },
  { id: 'mounting', label: 'Always rendered' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'alertdialog', label: 'AlertDialog' },
  { id: 'scroll', label: 'The page behind it' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(dialogApi),
  ...apiSections(alertdialogApi),
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

function Note({ icon: Icon, title, children }: { icon: typeof ShieldCheck; title: string; children: ReactNode }) {
  return (
    <Flex
      gap={3}
      p={4}
      borderRadius={2}
      b={1}
      theme={{
        dark: { bgColor: 'slate-900', borderColor: 'slate-800' },
        light: { bgColor: 'slate-50', borderColor: 'slate-200' },
      }}
    >
      <Box theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-500' } }} pt={0.5}>
        <Icon size={16} />
      </Box>
      <Box>
        <Box fontSize={14} fontWeight={600} mb={1} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
          {title}
        </Box>
        <Box fontSize={14}>{children}</Box>
      </Box>
    </Flex>
  );
}
