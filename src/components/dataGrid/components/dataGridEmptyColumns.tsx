import Box from '../../../box';
import Flex from '../../flex';
import { Path, Svg } from '../../svg';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

export default function DataGridEmptyColumns<TRow>(props: Props<TRow>) {
  const { grid } = props;

  return (
    <Flex
      component={`${grid.componentName}.emptyColumns` as never}
      d="column"
      ai="center"
      jc="center"
      gap={4}
      py={16}
      px={6}
      bgColor="gray-50"
      borderRadius={4}
      theme={{ dark: { bgColor: 'gray-900' } }}
    >
      <Flex d="column" ai="center" gap={3}>
        <Box
          width={16}
          height={16}
          borderRadius={999}
          bgColor="gray-200"
          theme={{ dark: { bgColor: 'gray-700' } }}
          display="flex"
          ai="center"
          jc="center"
        >
          <Svg viewBox="0 0 24 24" width="40" fill="currentColor" color="gray-400" theme={{ dark: { color: 'gray-500' } }}>
            <Path
              fillRule="evenodd"
              props={{ clipRule: 'evenodd' }}
              d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm3-1a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1H6zm2 3a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H9a1 1 0 01-1-1z"
            />
          </Svg>
        </Box>

        <Flex d="column" ai="center" gap={1}>
          <Box fontSize={18} fontWeight={600} color="gray-900" theme={{ dark: { color: 'gray-50' } }}>
            {grid.localeText.noColumnsTitle}
          </Box>
          <Box fontSize={14} color="gray-500" textAlign="center" theme={{ dark: { color: 'gray-400' } }}>
            {grid.localeText.noColumnsDescription}
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
}
