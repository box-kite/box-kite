// @vitest-environment node
import prettier from 'prettier';
import { describe, expect, it } from 'vitest';
import { transformSource } from './transform';

/** The output as the project's prettier would leave it, which is how a reader meets it. */
async function convert(source: string, file = 'example.tsx') {
  const result = transformSource(source, file);
  expect(result.error).toBeUndefined();

  return { ...result, code: await prettier.format(result.output, { parser: 'typescript', singleQuote: true, printWidth: 100 }) };
}

const todos = (result: Awaited<ReturnType<typeof convert>>) =>
  result.findings.filter((f) => f.outcome === 'todo').map((f) => `${f.part}: ${f.todo}`);

describe('tooltip', () => {
  it('folds provider, trigger, portal, content and arrow into one Tooltip, with placement mapped', async () => {
    const result = await convert(`
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export function Save() {
  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button className="icon">S</button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content side="right" sideOffset={8} className="tip">
            Save the file
            <TooltipPrimitive.Arrow />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
`);
    expect(result.code).toMatchInlineSnapshot(`
      "import Tooltip from '@box-kite/react/components/tooltip';

      export function Save() {
        return (
          <Tooltip side="end" offset={2} className="tip" content="Save the file">
            {(t) => (
              <button ref={t.ref} {...t.props} className="icon">
                S
              </button>
            )}
          </Tooltip>
        );
      }
      "
    `);
    expect(todos(result)).toEqual([]);
  });

  it('composes a handler the child already has with the one the trigger needs', async () => {
    const { code } = await convert(`
import { Tooltip } from 'radix-ui';

export const Hint = ({ t }) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <a href="/help" onFocus={trackFocus}>{t('help')}</a>
    </Tooltip.Trigger>
    <Tooltip.Content>{t('help.more')}</Tooltip.Content>
  </Tooltip.Root>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import Tooltip from '@box-kite/react/components/tooltip';

      export const Hint = ({ t }) => (
        <Tooltip side="top" content={t('help.more')}>
          {(trigger) => (
            <a
              ref={trigger.ref}
              {...trigger.props}
              href="/help"
              onFocus={(event) => {
                trackFocus(event);
                trigger.props.onFocus?.(event);
              }}
            >
              {t('help')}
            </a>
          )}
        </Tooltip>
      );
      "
    `);
  });
});

describe('dialog', () => {
  it('turns a trigger without asChild into a button, and a close into a dialog-method form', async () => {
    const result = await convert(`
import { Dialog } from 'radix-ui';

export function Rename({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className="link">Rename</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim" />
        <Dialog.Content className="panel" onPointerDownOutside={(e) => e.preventDefault()}>
          <Dialog.Title>Rename the view</Dialog.Title>
          <Dialog.Description>Names are shared with your team.</Dialog.Description>
          <Dialog.Close asChild>
            <button type="button">Cancel</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
`);
    expect(result.code).toMatchInlineSnapshot(`
      "import Dialog from '@box-kite/react/components/dialog';

      export function Rename({ open, onOpenChange }) {
        return (
          <Dialog
            open={open}
            onOpenChange={onOpenChange}
            className="panel"
            dismissible={false}
            trigger={(t) => (
              <button type="button" ref={t.ref} {...t.props} className="link">
                Rename
              </button>
            )}
          >
            <Dialog.Title>Rename the view</Dialog.Title>
            <Dialog.Description>Names are shared with your team.</Dialog.Description>
            <form method="dialog">
              <button type="submit">Cancel</button>
            </form>
          </Dialog>
        );
      }
      "
    `);
    expect(result.findings.find((f) => f.part === 'Overlay')?.notes.join()).toContain('`backdrop` prop');
  });

  it('closes from inside a form with formMethod, since forms cannot nest', async () => {
    const { code } = await convert(`
import * as Dialog from '@radix-ui/react-dialog';

export const Edit = () => (
  <Dialog.Root>
    <Dialog.Content>
      <form onSubmit={save}>
        <Dialog.Close>Cancel</Dialog.Close>
      </form>
    </Dialog.Content>
  </Dialog.Root>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import Dialog from '@box-kite/react/components/dialog';

      export const Edit = () => (
        <Dialog>
          <form onSubmit={save}>
            <button type="submit" formMethod="dialog" formNoValidate>
              Cancel
            </button>
          </form>
        </Dialog>
      );
      "
    `);
  });

  it('hands a Box Kite trigger the bag through `props`, merged with its own', async () => {
    const { code } = await convert(`
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import Button from '@box-kite/react/components/button';

export const Delete = () => (
  <AlertDialog.Root>
    <AlertDialog.Trigger asChild>
      <Button props={{ title: 'Delete' }}>Delete</Button>
    </AlertDialog.Trigger>
    <AlertDialog.Content>
      <AlertDialog.Title>Delete this view?</AlertDialog.Title>
      <AlertDialog.Cancel>Keep it</AlertDialog.Cancel>
      <AlertDialog.Action asChild>
        <Button onClick={remove}>Delete</Button>
      </AlertDialog.Action>
    </AlertDialog.Content>
  </AlertDialog.Root>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import Button from '@box-kite/react/components/button';
      import { AlertDialog } from '@box-kite/react/components/dialog';

      export const Delete = () => (
        <AlertDialog
          trigger={(t) => (
            <Button ref={t.ref} props={{ ...t.props, title: 'Delete' }}>
              Delete
            </Button>
          )}
        >
          <AlertDialog.Title>Delete this view?</AlertDialog.Title>
          <form method="dialog">
            <button type="submit">Keep it</button>
          </form>
          <form method="dialog">
            <Button type="submit" onClick={remove}>
              Delete
            </Button>
          </form>
        </AlertDialog>
      );
      "
    `);
  });
});

describe('dropdown menu', () => {
  it('folds labels into groups, a submenu into Menu.Sub, and drops the indicators Box Kite draws', async () => {
    const result = await convert(`
import { DropdownMenu } from 'radix-ui';

export function Actions({ bold, setBold, sort, setSort }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button>Actions</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={4} loop>
          <DropdownMenu.Label>Edit</DropdownMenu.Label>
          <DropdownMenu.Item onSelect={copy}>Copy</DropdownMenu.Item>
          <DropdownMenu.Item disabled textValue="Paste">Paste</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.CheckboxItem checked={bold} onCheckedChange={setBold}>
            <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
            Bold
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
            <DropdownMenu.Label>Sort</DropdownMenu.Label>
            <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="sub">Share</DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item>Copy link</DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
`);
    expect(result.code).toMatchInlineSnapshot(`
      "import Menu from '@box-kite/react/components/menu';

      export function Actions({ bold, setBold, sort, setSort }) {
        return (
          <Menu
            offset={1}
            align="center"
            trigger={(t) => (
              <button ref={t.ref} {...t.props}>
                Actions
              </button>
            )}
          >
            <Menu.Group label="Edit">
              <Menu.Item onSelect={copy}>Copy</Menu.Item>
              <Menu.Item disabled>Paste</Menu.Item>
            </Menu.Group>
            <Menu.Separator />
            <Menu.CheckboxItem checked={bold} onCheckedChange={setBold}>
              Bold
            </Menu.CheckboxItem>
            <Menu.RadioGroup value={sort} onValueChange={setSort} label="Sort">
              <Menu.RadioItem value="name">Name</Menu.RadioItem>
            </Menu.RadioGroup>
            <Menu.Sub itemProps={{ className: 'sub' }} label="Share">
              <Menu.Item>Copy link</Menu.Item>
            </Menu.Sub>
          </Menu>
        );
      }
      "
    `);
    expect(todos(result)).toEqual([]);
  });

  it('imports Menu under another name when the file already has one — lucide’s icon, say', async () => {
    const { code } = await convert(`
import { Menu } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const Nav = () => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger><Menu /></DropdownMenu.Trigger>
    <DropdownMenu.Content><DropdownMenu.Item>Home</DropdownMenu.Item></DropdownMenu.Content>
  </DropdownMenu.Root>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import { Menu } from 'lucide-react';
      import BoxMenu from '@box-kite/react/components/menu';

      export const Nav = () => (
        <BoxMenu
          align="center"
          trigger={(t) => (
            <button type="button" ref={t.ref} {...t.props}>
              <Menu />
            </button>
          )}
        >
          <BoxMenu.Item>Home</BoxMenu.Item>
        </BoxMenu>
      );
      "
    `);
  });

  it('leaves an asChild item as Radix, says why, and keeps the import it still needs', async () => {
    const result = await convert(`
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const Links = () => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>Go</DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Item asChild><a href="/docs">Docs</a></DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
);
`);
    expect(result.code).toContain("import * as DropdownMenu from '@radix-ui/react-dropdown-menu';");
    expect(result.output).toContain('<DropdownMenu.Item /* TODO(radix-to-box)');
    expect(result.leftovers).toEqual(['DropdownMenu from @radix-ui/react-dropdown-menu']);
  });
});

describe('popover and collapsible', () => {
  it('maps the open-focus opt-out, and leaves a close it cannot express', async () => {
    const result = await convert(`
import * as Popover from '@radix-ui/react-popover';

export const Filters = () => (
  <Popover.Root modal>
    <Popover.Trigger>Filters</Popover.Trigger>
    <Popover.Content align="start" onOpenAutoFocus={(event) => event.preventDefault()}>
      <Popover.Close>Done</Popover.Close>
    </Popover.Content>
  </Popover.Root>
);
`);
    expect(result.code).toMatchInlineSnapshot(`
      "import * as Popover from '@radix-ui/react-popover';
      import BoxPopover from '@box-kite/react/components/popover';

      export const Filters = () => (
        <BoxPopover
          align="start"
          autoFocus={false}
          trigger={(t) => (
            <button type="button" ref={t.ref} {...t.props}>
              Filters
            </button>
          )}
        >
          <Popover.Close /* TODO(radix-to-box): Popover.Close has no equivalent — control \`open\` and set it to false */
          >
            Done
          </Popover.Close>
        </BoxPopover>
      );
      "
    `);
    expect(todos(result)).toEqual(['Close: Popover.Close has no equivalent — control `open` and set it to false']);
  });

  it('converts a collapsible whose trigger and content are its only children', async () => {
    const { code } = await convert(`
import * as Collapsible from '@radix-ui/react-collapsible';

export const More = () => (
  <Collapsible.Root defaultOpen>
    <Collapsible.Trigger>More</Collapsible.Trigger>
    <Collapsible.Content>Hidden text</Collapsible.Content>
  </Collapsible.Root>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import { Collapsible } from '@box-kite/react/components/accordion';

      export const More = () => (
        <Collapsible
          defaultOpen
          trigger={(t) => (
            <button type="button" {...t.props}>
              More
            </button>
          )}
        >
          Hidden text
        </Collapsible>
      );
      "
    `);
  });
});

describe('the form controls', () => {
  it('tabs: the parts renamed, the list named by its aria-label, manual activation kept', async () => {
    const { code } = await convert(`
import * as Tabs from '@radix-ui/react-tabs';

export const Settings = () => (
  <Tabs.Root defaultValue="a" activationMode="manual">
    <Tabs.List aria-label="Settings">
      <Tabs.Trigger value="a">Account</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="a">…</Tabs.Content>
  </Tabs.Root>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import Tabs from '@box-kite/react/components/tabs';

      export const Settings = () => (
        <Tabs defaultValue="a" activation="manual">
          <Tabs.List label="Settings">
            <Tabs.Tab value="a">Account</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a">…</Tabs.Panel>
        </Tabs>
      );
      "
    `);
  });

  it('accordion: a single value becomes a one-item list, both ways', async () => {
    const { code } = await convert(`
import * as Accordion from '@radix-ui/react-accordion';

export const Faq = ({ open, setOpen }) => (
  <Accordion.Root type="single" collapsible value={open} onValueChange={(value) => setOpen(value)}>
    <Accordion.Item value="a">
      <Accordion.Header>
        <Accordion.Trigger>Shipping</Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content>Two days.</Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import Accordion from '@box-kite/react/components/accordion';

      export const Faq = ({ open, setOpen }) => (
        <Accordion value={open ? [open] : []} onValueChange={([value = '']) => setOpen(value)}>
          <Accordion.Item value="a">
            <Accordion.Trigger>Shipping</Accordion.Trigger>

            <Accordion.Panel>Two days.</Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      );
      "
    `);
  });

  it('checkbox and switch: the handler reads the input, the indicator and thumb go', async () => {
    const { code } = await convert(`
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Switch from '@radix-ui/react-switch';

export const Prefs = ({ all, some, setAll, setDark }) => (
  <>
    <Checkbox.Root id="all" checked={some ? 'indeterminate' : all} onCheckedChange={(checked) => setAll(checked === true)}>
      <Checkbox.Indicator>✓</Checkbox.Indicator>
    </Checkbox.Root>
    <Checkbox.Root checked="indeterminate" onCheckedChange={setAll} aria-label="Mixed" />
    <Switch.Root name="dark" onCheckedChange={setDark}>
      <Switch.Thumb />
    </Switch.Root>
  </>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import Checkbox from '@box-kite/react/components/checkbox';
      import Switch from '@box-kite/react/components/switch';

      export const Prefs = ({ all, some, setAll, setDark }) => (
        <>
          <Checkbox
            /* TODO(radix-to-box): \`checked\` can be \`"indeterminate"\` — that is the \`indeterminate\` prop here, beside a boolean \`checked\` */ id="all"
            checked={some ? 'indeterminate' : all}
            onChange={({ target: { checked } }) => setAll(checked === true)}
          />
          <Checkbox
            indeterminate
            onChange={(event) => setAll(event.target.checked)}
            props={{ 'aria-label': 'Mixed' }}
          />
          <Switch name="dark" onChange={(event) => setDark(event.target.checked)} />
        </>
      );
      "
    `);
  });

  it('slider: one thumb is a number, two are a range', async () => {
    const { code } = await convert(`
import * as Slider from '@radix-ui/react-slider';

export const Volume = ({ volume, setVolume }) => (
  <>
    <Slider.Root value={[volume]} onValueChange={([next]) => setVolume(next)} max={10}>
      <Slider.Track><Slider.Range /></Slider.Track>
      <Slider.Thumb aria-label="Volume" />
    </Slider.Root>
    <Slider.Root defaultValue={[20, 80]} onValueCommit={save}>
      <Slider.Track><Slider.Range /></Slider.Track>
      <Slider.Thumb aria-label="Lowest" />
      <Slider.Thumb aria-label="Highest" />
    </Slider.Root>
  </>
);
`);
    expect(code).toMatchInlineSnapshot(`
      "import Slider from '@box-kite/react/components/slider';

      export const Volume = ({ volume, setVolume }) => (
        <>
          <Slider value={volume} onValueChange={(next) => setVolume(next)} max={10} label="Volume" />
          <Slider defaultValue={[20, 80]} onValueCommit={save} thumbLabels={['Lowest', 'Highest']} />
        </>
      );
      "
    `);
  });

  it('select: a Dropdown with its placeholder, items and nothing Box Kite draws itself', async () => {
    const result = await convert(`
import * as Select from '@radix-ui/react-select';

export const Fruit = ({ fruit, setFruit }) => (
  <Select.Root value={fruit} onValueChange={setFruit} name="fruit">
    <Select.Trigger className="trigger" aria-label="Fruit">
      <Select.Value placeholder="Pick one" />
      <Select.Icon />
    </Select.Trigger>
    <Select.Portal>
      <Select.Content position="popper">
        <Select.Viewport>
          <Select.Group>
            <Select.Label>Fruits</Select.Label>
            {fruits.map((f) => (
              <Select.Item key={f} value={f}>
                <Select.ItemText>{f}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);
`);
    expect(result.code).toMatchInlineSnapshot(`
      "import Dropdown from '@box-kite/react/components/dropdown';

      export const Fruit = ({ fruit, setFruit }) => (
        <Dropdown
          value={fruit}
          onValueChange={setFruit}
          name="fruit"
          className="trigger"
          props={{ 'aria-label': 'Fruit' }}
        >
          <Dropdown.Unselect>Pick one</Dropdown.Unselect>

          {/* TODO(radix-to-box): a group label (<Select.Label>Fruits</Select.Label>) was dropped — Dropdown has no option groups */}
          {fruits.map((f) => (
            <Dropdown.Item key={f} value={f}>
              {f}
            </Dropdown.Item>
          ))}
        </Dropdown>
      );
      "
    `);
    expect(todos(result)).toEqual(['Label: Dropdown has no option groups']);
  });

  it('retargets a type that named the Radix root', async () => {
    const { code } = await convert(`
import * as SliderPrimitive from '@radix-ui/react-slider';

type Props = React.ComponentProps<typeof SliderPrimitive.Root>;
export const Bar = (props: Props) => <SliderPrimitive.Root defaultValue={[1]} />;
`);
    expect(code).toContain('React.ComponentProps<typeof Slider>');
    expect(code).not.toContain('@radix-ui');
  });
});

describe('toasts', () => {
  it('moves sonner onto the toaster, keeps what maps, and flags what needs a decision', async () => {
    const result = await convert(`
import { toast, Toaster } from 'sonner';

export function App() {
  const save = () => toast.success('Saved', { id: 7, description: 'Live now', richColors: true, cancel: { label: 'No' } });
  const later = () => toast.promise(() => fetch('/x'), { loading: 'Saving', success: 'Saved', error: 'Failed', description: 'One moment' });
  return <Toaster position="top-right" richColors visibleToasts={5} />;
}
`);
    expect(result.code).toMatchInlineSnapshot(`
      "import Toaster, { toast } from '@box-kite/react/components/toaster';

      export function App() {
        const save = () =>
          /* TODO(radix-to-box): a toast takes one \`action\` here — fold \`cancel\` into it or drop it */ toast.success(
            'Saved',
            { id: '7', description: 'Live now', cancel: { label: 'No' } },
          );
        const later = () =>
          toast.promise(
            (() => fetch('/x'))(),
            { loading: 'Saving', success: 'Saved', error: 'Failed' },
            { description: 'One moment' },
          );
        return <Toaster position="top-end" limit={5} />;
      }
      "
    `);
    expect(todos(result)).toEqual(['toast.success: a toast takes one `action` here — fold `cancel` into it or drop it']);
  });

  it('turns a Radix toast viewport into a Toaster and leaves the declarative toast for a person', async () => {
    const result = await convert(`
import * as Toast from '@radix-ui/react-toast';

export const Shell = ({ open, setOpen }) => (
  <Toast.Provider>
    <Toast.Root open={open} onOpenChange={setOpen}>
      <Toast.Title>Saved</Toast.Title>
    </Toast.Root>
    <Toast.Viewport className="corner" />
  </Toast.Provider>
);
`);
    expect(result.code).toContain('<Toaster className="corner" />');
    expect(todos(result).map((t) => t.split(':')[0])).toEqual(['Root', 'Title']);
  });
});

describe('files with nothing to do', () => {
  it('leaves a file that imports no Radix exactly as it was', () => {
    const source = "import { useState } from 'react';\nexport const x = 1;\n";
    expect(transformSource(source, 'x.tsx')).toEqual({ output: source, changed: false, findings: [], leftovers: [] });
  });
});
