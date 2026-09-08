import { LucideIcon } from 'lucide-react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import Reveal from './reveal';

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}

export default function PageHeader({ icon: PageIcon, title, description, badge }: PageHeaderProps) {
  return (
    <Reveal>
      <Box mb={10}>
        <Flex ai="center" gap={4} mb={4}>
          {PageIcon && (
            <Flex width={12} height={12} ai="center" jc="center" bgImage="gradient-primary" borderRadius={3} color="white">
              <Icon size={6}>
                <PageIcon />
              </Icon>
            </Flex>
          )}
          <Box>
            <Flex ai="center" gap={3}>
              <Box
                tag="h1"
                fontSize={28}
                sm={{ fontSize: 36 }}
                fontWeight={700}
                theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}
              >
                {title}
              </Box>
              {badge && (
                <Box
                  props={{ 'data-md': 'skip' }}
                  px={3}
                  py={1}
                  borderRadius={10}
                  theme={{ dark: { bgColor: 'indigo-900', color: 'indigo-300' }, light: { bgColor: 'indigo-100', color: 'indigo-600' } }}
                  fontSize={12}
                  fontWeight={500}
                >
                  {badge}
                </Box>
              )}
            </Flex>
          </Box>
        </Flex>
        <Box
          fontSize={16}
          sm={{ fontSize: 18 }}
          theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}
          lineHeight={28}
          maxWidth={160}
        >
          {description}
        </Box>
      </Box>
    </Reveal>
  );
}
