'use client';
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import Icon from '@box-kite/react/components/icon';
import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** What is being counted, for the buttons' names: "Add one Bolt the robot". */
  item: string;
  min?: number;
  max?: number;
}

/**
 * Two buttons and the count between them. The count is an `<output>`, which is a polite live region of its
 * own, so a screen reader hears the new number after each press with nothing wired up.
 */
export default function QuantityStepper({ value, onChange, item, min = 1, max = 10 }: QuantityStepperProps) {
  const step = { variant: 'ghost', px: 0, py: 0, width: 9, height: 9, borderRadius: 999 } as const;

  return (
    <Flex
      ai="center"
      b={1}
      borderRadius={999}
      borderColor="stone-300"
      theme={{ dark: { borderColor: 'stone-700' } }}
      props={{ role: 'group', 'aria-label': `Quantity of ${item}` }}
    >
      <Button {...step} disabled={value <= min} onClick={() => onChange(value - 1)} props={{ 'aria-label': `Remove one ${item}` }}>
        <Icon size={4}>
          <Minus />
        </Icon>
      </Button>
      <Box tag="output" minWidth={6} textAlign="center" fontSize={15} fontWeight={500}>
        {value}
      </Box>
      <Button {...step} disabled={value >= max} onClick={() => onChange(value + 1)} props={{ 'aria-label': `Add one ${item}` }}>
        <Icon size={4}>
          <Plus />
        </Icon>
      </Button>
    </Flex>
  );
}
