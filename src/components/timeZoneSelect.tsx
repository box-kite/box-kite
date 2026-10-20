import { FunctionComponent, useMemo } from 'react';
import Box, { BoxProps } from '../box';
import { QuietInteractions } from '../react/a11y/quietInteractions';
import useControllableState, { ChangeHandler } from '../react/a11y/useControllableState';
import { useDateEnvironment } from '../react/date/dateEnvironment';
import { matchZone, ZoneOption, zoneOptions } from '../utils/date/zoneOptions';
import { normalizeZone } from '../utils/date/zones';
import Combobox, { ComboboxValueReason } from './combobox';

export type { ZoneOption };

type TimeZoneSelectBoxProps = Omit<
  BoxProps<'div', 'combobox'>,
  'ref' | 'tag' | 'children' | 'defaultValue' | 'onChange' | 'disabled' | 'placeholder' | 'open' | 'props'
>;

export interface TimeZoneSelectProps extends TimeZoneSelectBoxProps {
  /** The chosen IANA zone (`Europe/Chisinau`, `UTC`), or `null`. Controlled. */
  value?: string | null;
  /** The zone it starts with when it owns its state. Default the reader's own. */
  defaultValue?: string | null;
  /** Fires with the zone's IANA name. */
  onValueChange?: ChangeHandler<string | null, ComboboxValueReason>;
  /** Only these zones, in IANA names. Default every zone the runtime knows, UTC first. */
  zones?: readonly string[];
  /** The select's visible name. */
  label?: React.ReactNode;
  /** The field's placeholder. Not a name — it is gone on the first keystroke. */
  placeholder?: string;
  /** What the zone posts under in a form. */
  name?: string;
  /** Not editable and not openable, but still read out. */
  disabled?: boolean;
  /** Attributes for the `<input>` itself — an `aria-label`, an `id`. */
  props?: Record<string, unknown>;
  /** What the list says when nothing matches. Default `'No time zone matches'`. */
  emptyText?: React.ReactNode;
}

/**
 * Picks a time zone by place, region or offset — `chis`, `europe` and `+3` all find Chisinau — out of every zone
 * the runtime knows, each with the offset it is at now.
 *
 * ```tsx
 * const [zone, setZone] = useState('Europe/Chisinau');
 * <TimeZoneSelect label="Time zone" value={zone} onValueChange={setZone} />
 * <DateField type="datetime" zone={zone} label="Meeting" />
 * ```
 *
 * It is a `Combobox` over the runtime's own list (`Intl.supportedValuesOf('timeZone')`), so it ships no zone
 * database, and the value is the IANA name every date component and every server takes.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 * @a11y The APG editable combobox: `role="combobox"` on the field, a `role="listbox"` of options, the active one
 * named by `aria-activedescendant`. A thousand-odd options are windowed, so it opens in one frame.
 * @keyboard A printable character — Searches by place, region, IANA name or offset.
 * @keyboard Down / Up — Opens, or moves through what the search left.
 * @keyboard Enter — Chooses the highlighted zone.
 * @keyboard Escape — Closes the list, then clears what was typed.
 */
function TimeZoneSelectImpl(props: TimeZoneSelectProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    zones,
    label,
    placeholder,
    name,
    disabled,
    props: inputProps,
    emptyText = 'No time zone matches',
    ...boxProps
  } = props;
  const environment = useDateEnvironment();

  const options = useMemo(() => zoneOptions(zones), [zones]);
  const byId = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const [current, setCurrent] = useControllableState<string | null, ComboboxValueReason>({
    value: value === undefined ? undefined : value && (normalizeZone(value) ?? value),
    defaultValue: defaultValue === undefined ? environment.readerZone : defaultValue,
    onChange: onValueChange,
    interaction: { component: 'timeZoneSelect', type: 'valueChange' },
  });

  return (
    <QuietInteractions>
      <Combobox<ZoneOption>
        {...boxProps}
        data={options}
        def={{
          label: 'label',
          key: 'id',
          display: (option) => (
            <Box display="flex" jc="space-between" gap={4} width="fit">
              <Box tag="span">{option.city}</Box>
              <Box tag="span" opacity={0.7} fontSize={12} css={{ fontVariantNumeric: 'tabular-nums' }}>
                {option.region ? `${option.region} · ` : ''}
                {option.offsetText}
              </Box>
            </Box>
          ),
        }}
        value={(current ? byId.get(current) : undefined) ?? null}
        onValueChange={(option, details) => setCurrent(option?.id ?? null, details)}
        filter={(rows, query) => rows.filter((row) => matchZone(row, query))}
        label={label}
        placeholder={placeholder}
        name={name}
        disabled={disabled}
        emptyText={emptyText}
        props={inputProps}
      />
    </QuietInteractions>
  );
}

const TimeZoneSelect = TimeZoneSelectImpl;
(TimeZoneSelect as FunctionComponent).displayName = 'TimeZoneSelect';

export default TimeZoneSelect;
