// Not distributive: over a union it allowed one member per array, so `['square', 'compact']` failed (bug #353).
export type ClassNameType<T extends string = string> = [T] extends [never]
  ? undefined
  : undefined | T | T[] | Partial<Record<T, boolean>> | ClassNameType<T>[];

export function classNames(...classNameRules: ClassNameType[]): string[] {
  return classNameRules.reduce<string[]>((names, classNameRule) => {
    if (!classNameRule) {
      return names;
    }

    if (typeof classNameRule === 'string') {
      names.push(classNameRule);

      return names;
    }

    if (Array.isArray(classNameRule)) {
      names.push(...classNames(...classNameRule));

      return names;
    }

    Object.entries(classNameRule).forEach(([name, condition]) => {
      condition && names.push(name);
    });

    return names;
  }, []);
}
