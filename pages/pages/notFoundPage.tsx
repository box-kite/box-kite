import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import PageHeader from '../components/pageHeader';

/**
 * What an address the route table does not know renders. GitHub Pages serves `404.html` for it, which
 * is prerendered from this page — before it existed an unknown URL showed the docs frame and nothing
 * inside it.
 */
export default function NotFoundPage() {
  return (
    <Box>
      <PageHeader
        icon={Compass}
        title="Page not found"
        description="This address is not part of the documentation. It may have moved, or the link that brought you here may be out of date."
      />

      <Flex gap={4} ai="center">
        <Link to="/">
          <Box
            px={5}
            py={3}
            borderRadius={2}
            bgImage="gradient-primary"
            color="white"
            fontWeight={600}
            hover={{ opacity: 0.9 }}
            cursor="pointer"
          >
            Back to the introduction
          </Box>
        </Link>
        <Link to="/box">
          <Box
            px={5}
            py={3}
            borderRadius={2}
            b={1}
            theme={{ dark: { borderColor: 'base-700', color: 'base-200' }, light: { borderColor: 'base-300', color: 'base-700' } }}
            fontWeight={600}
            cursor="pointer"
          >
            Box props reference
          </Box>
        </Link>
      </Flex>
    </Box>
  );
}
