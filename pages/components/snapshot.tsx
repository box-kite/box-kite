import { Img } from '../../src/components/semantics';
import { SNAPSHOT_SIZE, snapshotPath, SnapshotTheme } from '../site/templates';

/**
 * A page's approved snapshot: one theme's image when `theme` names it, otherwise whichever theme the reader
 * is in. Both images are lazy, which is what keeps the hidden one from downloading: a lazy image with
 * `display: none` is never fetched.
 */
export default function Snapshot({ slug, name, theme }: { slug: string; name: string; theme?: SnapshotTheme }) {
  if (!theme) {
    return (
      <>
        <SnapshotImage slug={slug} name={name} theme="light" hideIn="dark" />
        <SnapshotImage slug={slug} name={name} theme="dark" hideIn="light" />
      </>
    );
  }

  return <SnapshotImage slug={slug} name={name} theme={theme} />;
}

function SnapshotImage({ slug, name, theme, hideIn }: { slug: string; name: string; theme: SnapshotTheme; hideIn?: SnapshotTheme }) {
  return (
    <Img
      props={{
        src: snapshotPath(slug, theme),
        alt: `${name}, in the ${theme} theme`,
        // The intrinsic size, so the box is reserved before the image arrives and nothing shifts.
        width: SNAPSHOT_SIZE.width,
        height: SNAPSHOT_SIZE.height,
        loading: 'lazy',
        decoding: 'async',
      }}
      width="fit"
      height="auto"
      aspectRatio="16/10"
      theme={hideIn ? { [hideIn]: { display: 'none' } } : undefined}
    />
  );
}
