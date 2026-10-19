import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useId, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Dialog from '../../src/components/dialog';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import Icon from '../../src/components/icon';
import { Label, P, Span } from '../../src/components/semantics';
import VisuallyHidden from '../../src/components/visuallyHidden';
import { Design, DESIGNS, designOf, designScope, THEME_STORAGE_KEY } from '../designs/designs';

type Mode = 'light' | 'dark' | 'system';

const MODES: readonly { id: Mode; label: string; icon: React.ReactElement }[] = [
  { id: 'light', label: 'Light', icon: <Sun /> },
  { id: 'dark', label: 'Dark', icon: <Moon /> },
  { id: 'system', label: 'System', icon: <Monitor /> },
];

/** Whether the theme is the reader's own choice or the system's: only the stored key knows. */
function storedMode(theme: string): Mode {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ? (theme as Mode) : 'system';
  } catch {
    return 'system';
  }
}

/**
 * The header's appearance control: a design and a mode, both applied the moment they are picked and kept
 * on this device. `compact` is the phone header's icon-only trigger.
 */
export default function DesignPicker({ compact = false }: { compact?: boolean }) {
  const [design, setDesign] = Box.useDesign();
  const [theme, setTheme] = Box.useTheme();
  // Read when the dialog opens rather than on render, so the prerendered trigger never depends on storage.
  const [mode, setMode] = useState<Mode>('system');
  const [open, setOpen] = useState(false);
  const current = designOf(design);

  return (
    <Dialog
      component="designPicker"
      open={open}
      onOpenChange={(next) => {
        if (next) setMode(storedMode(theme));
        setOpen(next);
      }}
      trigger={(trigger) => (
        <Button component="designPicker.trigger" variant={compact ? 'compact' : undefined} {...trigger}>
          <Swatch />
          {compact ? <VisuallyHidden>Theme</VisuallyHidden> : 'Theme'}
        </Button>
      )}
    >
      <Flex ai="start" jc="space-between" gap={4}>
        <Box>
          <Dialog.Title>Appearance</Dialog.Title>
          <Dialog.Description>A design for the whole site, in light or dark. Kept on this device.</Dialog.Description>
        </Box>
        <Box component="designPicker.mark">
          <Icon size={5}>
            <Palette />
          </Icon>
        </Box>
      </Flex>

      <Choices label="Design">
        <Grid gridTemplateColumns={1} sm={{ gridTemplateColumns: 2 }} lg={{ gridTemplateColumns: 4 }} gap={3}>
          {DESIGNS.map((option) => (
            <DesignCard key={option.id} design={option} selected={option.id === current.id} onSelect={() => setDesign(option.id)} />
          ))}
        </Grid>
      </Choices>

      <Choices label="Mode">
        <Box component="designPicker.modes">
          {MODES.map(({ id, label, icon }) => (
            <Choice
              key={id}
              name="mode"
              checked={mode === id}
              onSelect={() => {
                setMode(id);
                setTheme(id === 'system' ? null : id);
              }}
              component="designPicker.mode"
            >
              <Icon size={4}>{icon}</Icon>
              {label}
            </Choice>
          ))}
        </Box>
      </Choices>

      <Flex jc="end" mt={6}>
        <Button onClick={() => setOpen(false)}>Done</Button>
      </Flex>
    </Dialog>
  );
}

/** A labelled group of radios: the heading is the group's name, so a screen reader hears "Design, radio group". */
function Choices({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();

  return (
    <Box mt={6} props={{ role: 'radiogroup', 'aria-labelledby': id }}>
      <Box component="designPicker.label" id={id}>
        {label}
      </Box>
      {children}
    </Box>
  );
}

interface ChoiceProps {
  name: string;
  checked: boolean;
  onSelect: () => void;
  component: 'designPicker.card' | 'designPicker.mode';
  children: React.ReactNode;
}

/** A native radio inside its own label: the arrows, the form semantics and the focus are the browser's. */
function Choice({ name, checked, onSelect, component, children }: ChoiceProps) {
  return (
    <Label component={component} variant={checked ? 'selected' : undefined}>
      <VisuallyHidden tag="input" checked={checked} props={{ type: 'radio', name, onChange: onSelect }} />
      {children}
    </Label>
  );
}

function DesignCard({ design, selected, onSelect }: { design: Design; selected: boolean; onSelect: () => void }) {
  return (
    <Choice name="design" checked={selected} onSelect={onSelect} component="designPicker.card">
      <Preview design={design} />
      <Flex ai="center" jc="space-between" gap={2} px={4} pt={3}>
        <Span component="designPicker.cardName">{design.name}</Span>
        <Box component="designPicker.check" variant={selected ? 'selected' : undefined}>
          <Icon size={3} strokeWidth={3}>
            <Check />
          </Icon>
        </Box>
      </Flex>
      <P component="designPicker.cardDescription">{design.description}</P>
    </Choice>
  );
}

/**
 * The design itself, small: drawn by the same components in that design's own tree, so what the card shows is
 * what the site turns into — not a picture of it.
 */
function Preview({ design }: { design: Design }) {
  return (
    <Box component="designPicker.preview" {...designScope(design.id)} props={{ 'data-design': design.id, 'aria-hidden': true }}>
      <Flex ai="center" gap={1.5} mb={3}>
        <Box width={2} height={2} borderRadius={2} bgColor="base-300" theme={{ dark: { bgColor: 'base-700' } }} />
        <Box width={2} height={2} borderRadius={2} bgColor="base-300" theme={{ dark: { bgColor: 'base-700' } }} />
        <Box width={10} height={2} ms="auto" borderRadius={2} bgImage="gradient-primary" />
      </Flex>
      <Box component="display" fontSize={20} lineHeight={24}>
        Aa
      </Box>
      <Box height={1.5} width="3/4" mt={2} borderRadius={1} bgColor="base-200" theme={{ dark: { bgColor: 'base-800' } }} />
      <Box height={1.5} width="1/2" mt={1.5} borderRadius={1} bgColor="base-200" theme={{ dark: { bgColor: 'base-800' } }} />
      <Flex gap={2} mt={3}>
        <Box component="button" py={1} px={3} fontSize={12}>
          Button
        </Box>
        <Box component="button" variant="secondary" py={1} px={3} fontSize={12}>
          Cancel
        </Box>
      </Flex>
    </Box>
  );
}

/**
 * The trigger's dot, in the page's own accent — read off the variables the design put on the root rather than off
 * state, so a prerendered page shows the reader's design in it before anything has run.
 */
function Swatch() {
  return (
    <Box
      component="designPicker.swatch"
      bgGradient={{ conic: 210, colors: ['accent-600', 'accent-300', 'accent-600'] }}
      props={{ 'aria-hidden': true }}
    />
  );
}
