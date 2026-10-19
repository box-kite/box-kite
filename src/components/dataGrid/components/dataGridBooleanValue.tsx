import { Path, Svg } from '../../svg';
import VisuallyHidden from '../../visuallyHidden';

interface Props {
  value: boolean;
  /** The words for the two, out of the grid's `localeText`. */
  text: { booleanTrue: string; booleanFalse: string };
}

/** A boolean cell: a check or a muted cross, with the word a screen reader reads, since React writes `true` as nothing. */
export default function DataGridBooleanValue(props: Props) {
  const { value, text } = props;

  return (
    <>
      <Svg
        viewBox="0 0 16 16"
        width="1rem"
        height="1rem"
        css={{ verticalAlign: 'middle' }}
        color={value ? undefined : 'base-400'}
        props={{ fill: 'none' }}
      >
        <Path
          d={value ? 'm3.5 8.5 3 3 6-7' : 'm5 5 6 6m0-6-6 6'}
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <VisuallyHidden tag="span">{value ? text.booleanTrue : text.booleanFalse}</VisuallyHidden>
    </>
  );
}

(DataGridBooleanValue as React.FunctionComponent).displayName = 'DataGridBooleanValue';
