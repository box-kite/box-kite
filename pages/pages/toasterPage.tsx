import { BellRing, Keyboard, Layers, Timer } from 'lucide-react';
import { ReactNode } from 'react';
import toasterApi from '../../api/components/toaster.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Toaster, { toast } from '../../src/components/toaster';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function ToasterPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={BellRing}
        title="Toaster"
        description="Messages in the browser's top layer with no portal: one live region that exists before there is anything in it, a queue rather than a cap, and timers that stop on hover, on focus and in a background tab."
      />

      {/* The one on the page, for every demo below it. A real app renders exactly this, once. */}
      <Toaster />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Toaster, { toast } from '@box-kite/react/components/toaster';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`// once, near the root of the app
<Toaster />

// then from anywhere at all
toast.success('Saved');`}
          >
            <Flex gap={2} py={6} flexWrap="wrap">
              <Button onClick={() => toast('Nothing happened')}>toast()</Button>
              <Button onClick={() => toast.success('Saved')}>success</Button>
              <Button onClick={() => toast.error('Could not save')}>error</Button>
              <Button onClick={() => toast.warning('Two fields are empty')}>warning</Button>
              <Button onClick={() => toast.info('Six people are editing this')}>info</Button>
            </Flex>
          </Code>

          <Section id="anywhere" title="It is called, not rendered">
            <Box>
              <Mono>toast()</Mono> writes to a store that has no React in it, so a message can come from an event handler, a fetch, a router
              guard or a module that has never heard of a component. <Mono>&lt;Toaster /&gt;</Mono> only draws what is there — which also
              means a call made <em>before</em> the viewport mounts is queued rather than lost.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`const id = toast.loading('Uploading…');

await upload(file);
toast.update(id, 'Uploaded', { kind: 'success' });`}
              >
                <Flex gap={2} py={6}>
                  <Button
                    onClick={() => {
                      const id = toast.loading('Uploading…');
                      window.setTimeout(() => toast.update(id, 'Uploaded', { kind: 'success' }), 1600);
                    }}
                  >
                    Upload
                  </Button>
                </Flex>
              </Code>
            </Box>
            <Box mt={4}>
              <Mono>toast.promise</Mono> is that pair written once, and it hands the promise back untouched so it can still be awaited.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`toast.promise(save(), {
  loading: 'Saving…',
  success: (saved: { name: string }) => \`Saved as $\{saved.name}\`,
  error: 'Could not save',
});`}
              >
                <Flex gap={2} py={6}>
                  <Button onClick={() => toast.promise(settleIn(1600, true), promiseMessages)}>Resolves</Button>
                  <Button onClick={() => toast.promise(settleIn(1600, false), promiseMessages)}>Rejects</Button>
                </Flex>
              </Code>
            </Box>
          </Section>

          <Section id="description" title="A description, and one thing to do about it">
            <Box>
              A toast takes a <Mono>description</Mono> under its message and a single <Mono>action</Mono>. The action dismisses the toast it
              answered unless it says otherwise — an undo that left its own toast standing would invite a second press.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`toast('Row deleted', {
  description: 'Ada Lovelace, added in March.',
  action: { label: 'Undo', onClick: restore },
});`}
              >
                <Flex gap={2} py={6}>
                  <Button
                    onClick={() =>
                      toast('Row deleted', {
                        description: 'Ada Lovelace, added in March.',
                        action: { label: 'Undo', onClick: () => toast.success('Put back') },
                      })
                    }
                  >
                    Delete a row
                  </Button>
                </Flex>
              </Code>
            </Box>
          </Section>

          <Section id="queue" title="The limit is a queue, not a cap">
            <Box>
              Past <Mono>limit</Mono> a toast waits its turn <em>with its timer unstarted</em>, so nothing expires that was never on screen
              — and the counter at the far end of the stack says how many are still to come. A cap would simply throw the fifth message
              away.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<Toaster limit={3} duration={5000} />`}>
                <Flex gap={2} py={6}>
                  <Button
                    onClick={() => {
                      ['Queued one', 'Queued two', 'Queued three', 'Queued four', 'Queued five'].forEach((message, index) =>
                        toast(message, { description: `Number ${index + 1} of five` }),
                      );
                    }}
                  >
                    Five at once
                  </Button>
                </Flex>
              </Code>
            </Box>
          </Section>

          <Section id="position" title="Six corners, and the inline half is logical">
            <Box>
              <Mono>start</Mono> and <Mono>end</Mono> rather than left and right, so a right-to-left page moves the stack to the other side
              with nothing declared twice. The newest toast is always the one nearest the screen edge, which is why a stack pinned to the
              top is drawn in the opposite order to one pinned to the bottom.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<Toaster position="top-center" />`} check={false} />
            </Box>
          </Section>

          <Section id="timers" title="Four things stop the clock">
            <Flex d="column" gap={3} mt={2}>
              <Note icon={Timer} title="Hover, focus and a background tab">
                A timer stops while the pointer is over the stack, while anything in it has focus, and while the tab is not being looked at
                — and picks up where it left off rather than starting again. WCAG 2.2.1 is what makes a toast allowed to carry a control at
                all: a button that can vanish mid-reach is not operable.
              </Note>
              <Note icon={Layers} title="A dismissal is the fourth">
                <Mono>onDismiss</Mono> is told which of <Mono>timeout</Mono>, <Mono>close</Mono>, <Mono>action</Mono> or{' '}
                <Mono>imperative</Mono> it was, the way every other component in the library reports a change.
              </Note>
            </Flex>
            <Box mt={4}>
              <Code language="jsx" code={`toast('Held', { duration: Infinity, onDismiss: (reason) => log(reason) })`}>
                <Flex gap={2} py={6}>
                  <Button onClick={() => toast('This one waits for you', { duration: Number.POSITIVE_INFINITY })}>Never times out</Button>
                </Flex>
              </Code>
            </Box>
          </Section>

          <Section id="top-layer" title="The top layer, and no portal">
            <Box>
              The viewport carries <Mono>popover="manual"</Mono> and is shown the moment it mounts, so it paints over every stacking context
              and outside every clipped or transformed ancestor — and because it never leaves the place it was declared, it inherits the
              theme, the custom properties and the text direction around it. <Mono>manual</Mono> rather than <Mono>auto</Mono> because a
              stack of messages owns no dismissal: a press outside has to reach the page.
            </Box>
            <Box mt={4}>
              Which raises the question a fixed strip across a corner always raises — the viewport would swallow every click in it. It takes
              no pointer events at all, and the toasts take them back, so a press in the gaps goes through to whatever is underneath.
            </Box>
          </Section>

          <Section id="keyboard" title="Nothing is stolen, and everything is reachable">
            <Flex d="column" gap={3} mt={2}>
              <Note icon={Keyboard} title="F6 gets you there">
                A toast never takes focus when it arrives — an announcement is not an interruption. <Mono>F6</Mono> moves focus to the stack
                from anywhere on the page, Tab walks the toasts in the order they are on screen, and Escape dismisses the one focus is in
                and hands focus back where it came from once there is nothing left to read. <Mono>hotkey</Mono> takes a combination (
                <Mono>"alt+t"</Mono>) or <Mono>false</Mono>.
              </Note>
              <Note icon={BellRing} title="One region, and it was already there">
                The viewport is a polite live region from the moment it mounts, <em>before</em> there is anything in it — a region inserted
                together with its content is not reliably announced. An error toast is <Mono>role="alert"</Mono>, which is assertive and is
                the one announcement pattern every screen reader implements; nothing else carries a region of its own, because the nearest
                one to a change is the one that speaks.
              </Note>
            </Flex>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              Every part is a Box component key: <Mono>toaster</Mono> for the viewport, then <Mono>toaster.toast</Mono>,{' '}
              <Mono>toaster.message</Mono>, <Mono>toaster.description</Mono>, <Mono>toaster.action</Mono>, <Mono>toaster.close</Mono> and{' '}
              <Mono>toaster.overflow</Mono>. The kind is a variant on the toast, and the accent it paints is never the only signal — the
              message itself is what says what happened.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`Box.components({
  toaster: {
    children: {
      toast: { styles: { borderRadius: 4, shadow: 'large' } },
    },
  },
})`}
                check={false}
              />
            </Box>
          </Section>

          <ApiReference api={toasterApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const promiseMessages = {
  loading: 'Saving…',
  success: 'Saved',
  error: 'Could not save',
};

/** A promise that takes its time, so the three states of `toast.promise` are visible one after another. */
function settleIn(ms: number, resolves: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => (resolves ? resolve('done') : reject(new Error('nope'))), ms);
  });
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'anywhere', label: 'It is called, not rendered' },
  { id: 'description', label: 'Description and action' },
  { id: 'queue', label: 'A queue, not a cap' },
  { id: 'position', label: 'Six corners' },
  { id: 'timers', label: 'What stops the clock' },
  { id: 'top-layer', label: 'The top layer' },
  { id: 'keyboard', label: 'Keyboard and announcement' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(toasterApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof BellRing; title: string; children: ReactNode }) {
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
