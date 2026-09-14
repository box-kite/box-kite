import { documentOrNull } from '../environment/environmentUtils';

/** Handing a file the page generated to the person looking at it. */
namespace DownloadUtils {
  /**
   * A file the browser saves. There is no API for "save this" — an anchor with a `download` attribute is
   * the mechanism, so the link is created, clicked and removed within the call.
   *
   * The object URL is revoked on the next task rather than immediately: Safari reads it *after* the click
   * handler returns, and a revoke in the same turn leaves the file empty.
   */
  export function download(data: BlobPart, fileName: string, type: string): void {
    const doc = documentOrNull();
    if (!doc) return;

    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = doc.createElement('a');

    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';

    doc.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url));
  }
}

export default DownloadUtils;
